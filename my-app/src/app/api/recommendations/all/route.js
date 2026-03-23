import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import Review from '@/lib/models/Review';
import Community from '@/lib/models/Community';
import SearchHistory from '@/lib/models/SearchHistory';
import { isUserAdult } from '@/lib/services/moderation.service';
import {
  getTrendingMoviesInRegion,
  getTrendingTVInRegion,
  formatMediaList,
} from '@/lib/services/tmdb.service';
import { buildCacheKey, remember } from '@/lib/utils/cache.js';
import axios from 'axios';
import connectDB from '@/lib/config/database.js'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 8000, // Reduced from 10s
  params: { api_key: TMDB_API_KEY },
});

// Rate limiting helper - reduced delay
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 50; // Reduced from 100ms
const RECOMMENDATIONS_CACHE_TTL = 300;
const TMDB_METADATA_CACHE_TTL = 3600;

async function rateLimitedRequest(requestFn) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  return requestFn();
}

// Scoring weights for recommendation algorithm
const WEIGHTS = {
  genre: 0.20,
  industry: 0.15,
  language: 0.12,
  keywords: 0.10,
  franchise: 0.08,
  sequel: 0.07,
  director: 0.06,
  actors: 0.05,
  userHistory: 0.05,
  rating: 0.04,
  popularity: 0.03,
  trending: 0.03,
  year: 0.02,
  mood: 0.02,
  runtime: 0.02,
};

// Industry mapping based on production countries and original language
const INDUSTRY_MAP = {
  bollywood: { countries: ['IN'], languages: ['hi', 'pa', 'ta', 'te', 'ml', 'kn', 'bn'] },
  hollywood: { countries: ['US'], languages: ['en'] },
  korean: { countries: ['KR'], languages: ['ko'] },
  japanese: { countries: ['JP'], languages: ['ja'] },
  chinese: { countries: ['CN', 'HK', 'TW'], languages: ['zh', 'cn'] },
  french: { countries: ['FR'], languages: ['fr'] },
  spanish: { countries: ['ES', 'MX', 'AR'], languages: ['es'] },
  british: { countries: ['GB'], languages: ['en'] },
};

// Helper: get a deterministic daily seed (changes every day)
function getDailySeed() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

// Simple hash for daily deterministic randomness
function hashSeed(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Fetch detailed metadata for a media item with caching
async function fetchDetailedMetadata(id, type = 'movie') {
  const cacheKey = buildCacheKey('recommendations', 'metadata', type, id);

  return remember(cacheKey, TMDB_METADATA_CACHE_TTL, async () => {
    try {
      const endpoint = type === 'tv' ? `/tv/${id}` : `/movie/${id}`;
      
      // Fetch with rate limiting
      const details = await rateLimitedRequest(() =>
        tmdb.get(endpoint, { params: { append_to_response: 'videos' } })
      );

      const credits = await rateLimitedRequest(() =>
        tmdb.get(`${endpoint}/credits`)
      );

      const keywords = await rateLimitedRequest(() =>
        tmdb.get(`${endpoint}/keywords`)
      );

      const data = details.data;
      const cast = (credits.data.cast || []).slice(0, 10);
      const crew = credits.data.crew || [];
      const directors = crew.filter(c => c.job === 'Director');
      const keywordList = type === 'tv' 
        ? (keywords.data.results || [])
        : (keywords.data.keywords || []);

      return {
        id: data.id,
        title: data.title || data.name,
        originalTitle: data.original_title || data.original_name,
        overview: data.overview,
        releaseDate: data.release_date || data.first_air_date,
        rating: data.vote_average,
        voteCount: data.vote_count,
        popularity: data.popularity,
        adult: data.adult,
        poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
        originalLanguage: data.original_language,
        genres: (data.genres || []).map(g => g.id),
        genreNames: (data.genres || []).map(g => g.name),
        productionCountries: (data.production_countries || []).map(c => c.iso_3166_1),
        keywords: keywordList.map(k => k.id),
        keywordNames: keywordList.map(k => k.name),
        cast: cast.map(c => c.id),
        castNames: cast.map(c => c.name),
        directors: directors.map(d => d.id),
        directorNames: directors.map(d => d.name),
        voteAverage: data.vote_average || 0,
        releaseYear: (data.release_date || data.first_air_date || '').substring(0, 4),
        runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || 0,
        belongsToCollection: data.belongs_to_collection?.id || null,
        collectionName: data.belongs_to_collection?.name || null,
        mediaType: type,
      };
    } catch (error) {
      console.error(`Failed to fetch metadata for ${type} ${id}:`, error.message);
      return null;
    }
  });
}

// Determine industry based on countries and language
function detectIndustry(countries, language) {
  for (const [industry, config] of Object.entries(INDUSTRY_MAP)) {
    if (config.languages.includes(language?.toLowerCase())) {
      return industry;
    }
    if (countries.some(c => config.countries.includes(c))) {
      return industry;
    }
  }
  return 'other';
}

// Calculate Jaccard similarity between two arrays
function jaccardSimilarity(arr1, arr2) {
  if (!arr1.length || !arr2.length) return 0;
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Calculate comprehensive similarity score between source and candidate
function calculateSimilarityScore(source, candidate, trendingIds = new Set(), userInteractedIds = new Set()) {
  let score = 0;

  // 1. Genre similarity (0.20)
  const genreSim = jaccardSimilarity(source.genres, candidate.genres);
  score += genreSim * WEIGHTS.genre;

  // 2. Industry similarity (0.15)
  const sourceIndustry = detectIndustry(source.productionCountries, source.originalLanguage);
  const candidateIndustry = detectIndustry(candidate.productionCountries, candidate.originalLanguage);
  const industrySim = sourceIndustry === candidateIndustry ? 1 : 0;
  score += industrySim * WEIGHTS.industry;

  // 3. Language similarity (0.12)
  const langSim = source.originalLanguage === candidate.originalLanguage ? 1 : 0;
  score += langSim * WEIGHTS.language;

  // 4. Keywords similarity (0.10)
  const keywordSim = jaccardSimilarity(source.keywords, candidate.keywords);
  score += keywordSim * WEIGHTS.keywords;

  // 5. Franchise/Collection (0.08)
  let franchiseSim = 0;
  if (source.belongsToCollection && candidate.belongsToCollection) {
    franchiseSim = source.belongsToCollection === candidate.belongsToCollection ? 1 : 0;
  }
  score += franchiseSim * WEIGHTS.franchise;

  // 6. Sequel detection (0.07) - check if titles suggest sequel relationship
  let sequelSim = 0;
  if (source.title && candidate.title) {
    const sourceBase = source.title.replace(/\d+|part|chapter|episode/gi, '').trim().toLowerCase();
    const candidateBase = candidate.title.replace(/\d+|part|chapter|episode/gi, '').trim().toLowerCase();
    if (sourceBase && candidateBase && sourceBase === candidateBase) {
      sequelSim = 1;
    }
  }
  score += sequelSim * WEIGHTS.sequel;

  // 7. Director similarity (0.06)
  const directorSim = jaccardSimilarity(source.directors, candidate.directors);
  score += directorSim * WEIGHTS.director;

  // 8. Actor similarity (0.05)
  const actorSim = jaccardSimilarity(source.cast, candidate.cast);
  score += actorSim * WEIGHTS.actors;

  // 9. User history (0.05) - has user interacted with this?
  const userHistorySim = userInteractedIds.has(`${candidate.mediaType}-${candidate.id}`) ? 0 : 1;
  score += userHistorySim * WEIGHTS.userHistory;

  // 10. Rating similarity (0.04) - normalized difference
  const ratingDiff = Math.abs(source.voteAverage - candidate.voteAverage);
  const ratingSim = Math.max(0, 1 - ratingDiff / 10);
  score += ratingSim * WEIGHTS.rating;

  // 11. Popularity (0.03) - normalized log scale
  const popularitySim = Math.min(1, Math.log10(candidate.popularity + 1) / 3);
  score += popularitySim * WEIGHTS.popularity;

  // 12. Trending (0.03)
  const trendingSim = trendingIds.has(`${candidate.mediaType}-${candidate.id}`) ? 1 : 0;
  score += trendingSim * WEIGHTS.trending;

  // 13. Year proximity (0.02) - within 5 years gets full score
  const yearDiff = Math.abs(parseInt(source.releaseYear || 0) - parseInt(candidate.releaseYear || 0));
  const yearSim = Math.max(0, 1 - yearDiff / 20);
  score += yearSim * WEIGHTS.year;

  // 14. Mood/Genre tone (0.02) - based on genre overlap and rating
  const moodSim = genreSim * (candidate.voteAverage / 10);
  score += moodSim * WEIGHTS.mood;

  // 15. Runtime similarity (0.02) - within 30 minutes
  const runtimeDiff = Math.abs((source.runtime || 0) - (candidate.runtime || 0));
  const runtimeSim = Math.max(0, 1 - runtimeDiff / 120);
  score += runtimeSim * WEIGHTS.runtime;

  return score;
}

// Get candidate recommendations from TMDB with rate limiting
async function getCandidateRecommendations(sourceId, type = 'movie') {
  try {
    const endpoint = type === 'tv' ? `/tv/${sourceId}/recommendations` : `/movie/${sourceId}/recommendations`;
    const [recommendations, similar] = await Promise.all([
      rateLimitedRequest(() => tmdb.get(endpoint, { params: { page: 1 } })).catch(() => ({ data: { results: [] } })),
      rateLimitedRequest(() => tmdb.get(type === 'tv' ? `/tv/${sourceId}/similar` : `/movie/${sourceId}/similar`, { params: { page: 1 } })).catch(() => ({ data: { results: [] } })),
    ]);

    const combined = [
      ...(recommendations.data.results || []),
      ...(similar.data.results || []),
    ];

    return combined.map(item => ({
      id: item.id,
      mediaType: type,
      title: item.title || item.name,
      adult: item.adult || false,
    }));
  } catch (error) {
    return [];
  }
}

// Deduplicate and cap results, optionally filtering adult content
function dedup(items, max = 20, filterAdult = false) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (filterAdult && item.adult) continue;
    const key = `${item.mediaType || 'movie'}-${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
    if (result.length >= max) break;
  }
  return result;
}

// Batch process metadata fetching to avoid overwhelming the API
async function fetchMetadataBatch(items, batchSize = 5) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => fetchDetailedMetadata(item.id, item.type || item.mediaType))
    );
    results.push(...batchResults.filter(Boolean));
    
    // Small delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'worldwide';
    const countryName = searchParams.get('countryName') || 'Worldwide';
    const isWorldwide = country === 'worldwide' || country === 'WORLDWIDE';
    const filterAdult = user?.dateOfBirth ? !isUserAdult(user.dateOfBirth) : false;

    const cacheKey = buildCacheKey(
      'recommendations',
      'all',
      user._id?.toString(),
      country,
      countryName,
      filterAdult
    );

    const data = await remember(cacheKey, RECOMMENDATIONS_CACHE_TTL, async () => {
      await connectDB()

      const [
        userFavorites,
        userWatchlist,
        userWatchHistory,
        userReviews,
        userRatings,
        userSearchHistory,
        userCommunities,
        trendingMoviesRegion,
        trendingTVRegion,
      ] = await Promise.all([
        Promise.resolve(user.favorites || []),
        Promise.resolve(user.watchlist || []),
        Promise.resolve(user.watchHistory || []),
        Review.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(20)
          .select('mediaId mediaType mediaTitle rating')
          .lean()
          .catch(() => []),
        Promise.resolve(user.ratings || []),
        SearchHistory.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .catch(() => []),
        Community.find({ members: user._id })
          .select('relatedEntityId relatedEntityType relatedEntityName category')
          .lean()
          .catch(() => []),
        getTrendingMoviesInRegion(country).catch(() => ({ results: [] })),
        getTrendingTVInRegion(country).catch(() => ({ results: [] })),
      ]);

      const trendingIds = new Set();
      [...(trendingMoviesRegion.results || []), ...(trendingTVRegion.results || [])].forEach(item => {
        trendingIds.add(`${item.mediaType || 'movie'}-${item.id}`);
      });

      const userInteractedIds = new Set();
      userFavorites.forEach(f => userInteractedIds.add(`movie-${f.movieId}`));
      userWatchlist.forEach(w => userInteractedIds.add(`movie-${w.movieId}`));
      userWatchHistory.forEach(w => userInteractedIds.add(`${w.mediaType || 'movie'}-${w.movieId}`));
      userReviews.forEach(r => userInteractedIds.add(`${r.mediaType || 'movie'}-${r.mediaId}`));
      userRatings.forEach(r => userInteractedIds.add(`movie-${r.movieId}`));

      // Build a set of watched items to filter out from recommendations
      const watchedIds = new Set();
      userWatchHistory.forEach(w => watchedIds.add(`${w.mediaType || 'movie'}-${w.movieId}`));

      let recommended = [];
      const allUserSignals = [];

      userFavorites.forEach(f => {
        allUserSignals.push({ id: f.movieId, type: 'movie', weight: 1.0 });
      });

      userWatchlist.forEach(w => {
        allUserSignals.push({ id: w.movieId, type: 'movie', weight: 0.8 });
      });

      userReviews.filter(review => review.rating >= 6).forEach(review => {
        allUserSignals.push({ id: review.mediaId, type: review.mediaType || 'movie', weight: review.rating / 10 });
      });

      (userRatings || []).filter(rating => rating.rating >= 6).forEach(rating => {
        allUserSignals.push({ id: rating.movieId, type: 'movie', weight: rating.rating / 10 });
      });

      const signalMap = new Map();
      allUserSignals.forEach(signal => {
        const key = `${signal.type}-${signal.id}`;
        if (!signalMap.has(key) || signalMap.get(key).weight < signal.weight) {
          signalMap.set(key, signal);
        }
      });
      const uniqueUserSignals = Array.from(signalMap.values());

      if (uniqueUserSignals.length > 0) {
        const userTasteProfile = await fetchMetadataBatch(uniqueUserSignals.slice(0, 10), 5);

        if (userTasteProfile.length > 0) {
          const candidateSources = [];
          const tmdbRecResults = await Promise.all(
            userTasteProfile.slice(0, 5).map(source => getCandidateRecommendations(source.id, source.mediaType))
          );
          candidateSources.push(...tmdbRecResults.flat());

          (trendingMoviesRegion.results || []).slice(0, 20).forEach(item => {
            candidateSources.push({
              id: item.id,
              mediaType: 'movie',
              title: item.title || item.name,
              adult: item.adult || false,
            });
          });

          (trendingTVRegion.results || []).slice(0, 20).forEach(item => {
            candidateSources.push({
              id: item.id,
              mediaType: 'tv',
              title: item.title || item.name,
              adult: item.adult || false,
            });
          });

          const uniqueCandidates = dedup(candidateSources, 40, false);
          const candidateMetadata = await fetchMetadataBatch(uniqueCandidates, 5);

          const scoredCandidates = candidateMetadata.map(candidate => {
            let totalScore = 0;
            let totalWeight = 0;

            userTasteProfile.forEach((source, index) => {
              const signal = uniqueUserSignals[index];
              const weight = signal?.weight || 1.0;
              const score = calculateSimilarityScore(source, candidate, trendingIds, userInteractedIds);
              totalScore += score * weight;
              totalWeight += weight;
            });

            return {
              ...candidate,
              score: totalWeight > 0 ? totalScore / totalWeight : 0,
            };
          });

          scoredCandidates.sort((a, b) => b.score - a.score);
          recommended = scoredCandidates
            .filter(item => !filterAdult || !item.adult)
            .filter(item => !watchedIds.has(`${item.mediaType}-${item.id}`))
            .slice(0, 20)
            .map(item => ({
              id: item.id,
              title: item.title,
              mediaType: item.mediaType,
              originalTitle: item.originalTitle,
              overview: item.overview,
              releaseDate: item.releaseDate,
              rating: item.rating,
              voteCount: item.voteCount,
              popularity: item.popularity,
              adult: item.adult,
              genres: item.genres,
              poster: item.poster,
              backdrop: item.backdrop,
              originalLanguage: item.originalLanguage,
              score: item.score,
            }));
        }
      }

      // "Because You Liked" - Only use favorites (liked items), not reviews
      const likedItems = userFavorites.slice(0, 15).map(favorite => ({
        id: favorite.movieId,
        type: 'movie',
        title: favorite.movieId,
      }));

      let becauseYouLiked = null;
      if (likedItems.length > 0) {
        const dayHash = hashSeed(getDailySeed() + user._id.toString());
        const anchor = likedItems[dayHash % likedItems.length];
        const anchorMetadata = await fetchDetailedMetadata(anchor.id, anchor.type);

        if (anchorMetadata) {
          const candidates = await getCandidateRecommendations(anchor.id, anchor.type);
          const uniqueCandidates = dedup(candidates, 25, false);
          const candidateMetadata = await fetchMetadataBatch(uniqueCandidates, 5);

          const becauseItems = candidateMetadata
            .map(candidate => ({
              ...candidate,
              score: calculateSimilarityScore(anchorMetadata, candidate, trendingIds, userInteractedIds),
            }))
            .sort((a, b) => b.score - a.score)
            .filter(item => !filterAdult || !item.adult)
            .filter(item => !watchedIds.has(`${item.mediaType}-${item.id}`))
            .slice(0, 20)
            .map(item => ({
              id: item.id,
              title: item.title,
              mediaType: item.mediaType,
              originalTitle: item.originalTitle,
              overview: item.overview,
              releaseDate: item.releaseDate,
              rating: item.rating,
              voteCount: item.voteCount,
              popularity: item.popularity,
              adult: item.adult,
              genres: item.genres,
              poster: item.poster,
              backdrop: item.backdrop,
              originalLanguage: item.originalLanguage,
              score: item.score,
            }));

          if (becauseItems.length > 0) {
            becauseYouLiked = {
              anchorTitle: anchorMetadata.title,
              anchorId: anchor.id,
              anchorType: anchor.type,
              items: becauseItems,
            };
          }
        }
      }

      let trendingInCircles = [];
      const communityMediaIds = userCommunities
        .filter(community => community.relatedEntityId && (community.relatedEntityType === 'movie' || community.relatedEntityType === 'tv'))
        .map(community => ({
          id: community.relatedEntityId,
          type: community.relatedEntityType,
          name: community.relatedEntityName,
        }));

      if (communityMediaIds.length > 0) {
        const circleSourceMetadata = await fetchMetadataBatch(communityMediaIds.slice(0, 3), 2);

        if (circleSourceMetadata.length > 0) {
          const circleCandidates = (await Promise.all(
            circleSourceMetadata.map(source => getCandidateRecommendations(source.id, source.mediaType))
          )).flat();
          const uniqueCircleCandidates = dedup(circleCandidates, 25, false);
          const circleCandidateMetadata = await fetchMetadataBatch(uniqueCircleCandidates, 5);

          trendingInCircles = circleCandidateMetadata
            .map(candidate => {
              const scores = circleSourceMetadata.map(source =>
                calculateSimilarityScore(source, candidate, trendingIds, userInteractedIds)
              );
              const avgScore = scores.reduce((total, score) => total + score, 0) / scores.length;
              const trendingBoost = trendingIds.has(`${candidate.mediaType}-${candidate.id}`) ? 0.1 : 0;

              return { ...candidate, score: avgScore + trendingBoost };
            })
            .sort((a, b) => b.score - a.score)
            .filter(item => !filterAdult || !item.adult)
            .filter(item => !watchedIds.has(`${item.mediaType}-${item.id}`))
            .slice(0, 20)
            .map(item => ({
              id: item.id,
              title: item.title,
              mediaType: item.mediaType,
              originalTitle: item.originalTitle,
              overview: item.overview,
              releaseDate: item.releaseDate,
              rating: item.rating,
              voteCount: item.voteCount,
              popularity: item.popularity,
              adult: item.adult,
              genres: item.genres,
              poster: item.poster,
              backdrop: item.backdrop,
              originalLanguage: item.originalLanguage,
              score: item.score,
            }));
        }
      } else if (userSearchHistory.length > 0) {
        const searchResults = await Promise.all(userSearchHistory.slice(0, 3).map(async entry => {
          const searchKey = buildCacheKey('recommendations', 'search-history', entry.query);

          return remember(searchKey, TMDB_METADATA_CACHE_TTL, async () => {
            try {
              const response = await rateLimitedRequest(() =>
                tmdb.get('/search/multi', { params: { query: entry.query, page: 1 } })
              );
              return formatMediaList(response.data.results || []);
            } catch {
              return [];
            }
          });
        }));

        trendingInCircles = dedup(searchResults.flat(), 20, filterAdult);
      }

      return {
        recommended,
        becauseYouLiked,
        trendingInCircles,
        top10Movies: (trendingMoviesRegion.results || []).filter(movie => !filterAdult || !movie.adult).slice(0, 10),
        top10TV: (trendingTVRegion.results || []).filter(show => !filterAdult || !show.adult).slice(0, 10),
        country,
        countryName,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Recommendations/all error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
});