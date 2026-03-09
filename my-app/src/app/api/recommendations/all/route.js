import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import Review from '@/lib/models/Review';
import Community from '@/lib/models/Community';
import SearchHistory from '@/lib/models/SearchHistory';
import {
  getMovieRecommendations,
  getTVRecommendations,
  getTrendingMoviesInRegion,
  getTrendingTVInRegion,
  formatMediaList,
} from '@/lib/services/tmdb.service';
import axios from 'axios';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 8000,
  params: { api_key: TMDB_API_KEY },
});

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

// Deduplicate and cap results
function dedup(items, max = 20) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = `${item.mediaType || 'movie'}-${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
    if (result.length >= max) break;
  }
  return result;
}

export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || 'US';
    const countryName = searchParams.get('countryName') || 'Your Country';

    // Gather user signals in parallel
    const [
      userFavorites,
      userWatchlist,
      userReviews,
      userRatings,
      userSearchHistory,
      userCommunities,
    ] = await Promise.all([
      // Favorites
      Promise.resolve(user.favorites || []),
      // Watchlist
      Promise.resolve(user.watchlist || []),
      // Reviews (recent, with mediaId and mediaType)
      Review.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('mediaId mediaType mediaTitle rating')
        .lean()
        .catch(() => []),
      // Ratings
      Promise.resolve(user.ratings || []),
      // Search history
      SearchHistory.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
        .catch(() => []),
      // Communities
      Community.find({ members: user._id })
        .select('relatedEntityId relatedEntityType relatedEntityName category')
        .lean()
        .catch(() => []),
    ]);

    // ------------------- 1. Recommendations For You -------------------
    // Collect TMDB IDs from watchlist, favorites, reviews, ratings
    const signalIds = [];

    // From favorites
    for (const f of userFavorites.slice(0, 5)) {
      signalIds.push({ id: f.movieId, type: 'movie' });
    }

    // From watchlist (recent)
    for (const w of userWatchlist.slice(-5)) {
      signalIds.push({ id: w.movieId, type: 'movie' });
    }

    // From reviews (recent high-rated)
    const goodReviews = userReviews.filter((r) => r.rating >= 7);
    for (const r of goodReviews.slice(0, 5)) {
      signalIds.push({ id: r.mediaId, type: r.mediaType || 'movie' });
    }

    // From ratings (recent high-rated)
    const goodRatings = (userRatings || []).filter((r) => r.rating >= 7);
    for (const r of goodRatings.slice(-5)) {
      signalIds.push({ id: r.movieId, type: 'movie' });
    }

    // Deduplicate signal IDs
    const uniqueSignals = [];
    const seenSignals = new Set();
    for (const s of signalIds) {
      if (!seenSignals.has(s.id)) {
        seenSignals.add(s.id);
        uniqueSignals.push(s);
      }
    }

    // Pick up to 4 random seeds to fetch recommendations from
    const shuffledSignals = uniqueSignals.sort(() => 0.5 - Math.random()).slice(0, 4);

    const recommendedPromises = shuffledSignals.map((s) =>
      s.type === 'tv'
        ? getTVRecommendations(s.id).catch(() => [])
        : getMovieRecommendations(s.id).catch(() => [])
    );
    const recommendedResults = await Promise.all(recommendedPromises);
    const recommendedFlat = recommendedResults.flat();
    // Shuffle and deduplicate
    const recommended = dedup(
      recommendedFlat.sort(() => 0.5 - Math.random()),
      20
    );

    // ------------------- 2. Because You Liked ... -------------------
    // Pick one anchor title deterministically per day
    const allLikedOrReviewed = [
      ...goodReviews.map((r) => ({
        id: r.mediaId,
        type: r.mediaType || 'movie',
        title: r.mediaTitle,
      })),
      ...userFavorites.map((f) => ({
        id: f.movieId,
        type: 'movie',
        title: f.movieId, // We'll resolve title later if needed
      })),
    ];

    let becauseYouLiked = null;
    if (allLikedOrReviewed.length > 0) {
      const dayHash = hashSeed(getDailySeed() + user._id.toString());
      const anchorIndex = dayHash % allLikedOrReviewed.length;
      const anchor = allLikedOrReviewed[anchorIndex];

      const becauseItems =
        anchor.type === 'tv'
          ? await getTVRecommendations(anchor.id).catch(() => [])
          : await getMovieRecommendations(anchor.id).catch(() => []);

      // Resolve anchor title if it's just an ID, empty, or a placeholder
      let anchorTitle = anchor.title;
      if (!anchorTitle || /^\d+$/.test(anchorTitle) || anchorTitle === 'Movie Title') {
        try {
          const endpoint = anchor.type === 'tv' ? `/tv/${anchor.id}` : `/movie/${anchor.id}`;
          const detailRes = await tmdb.get(endpoint);
          anchorTitle = detailRes.data.title || detailRes.data.name || anchorTitle;
        } catch {
          // keep whatever we had
        }
      }

      if (becauseItems.length > 0) {
        becauseYouLiked = {
          anchorTitle,
          anchorId: anchor.id,
          anchorType: anchor.type,
          items: dedup(becauseItems, 20),
        };
      }
    }

    // ------------------- 3. Trending In Your Circle -------------------
    // Get media IDs related to communities the user is in
    const communityMediaIds = userCommunities
      .filter((c) => c.relatedEntityId && (c.relatedEntityType === 'movie' || c.relatedEntityType === 'tv'))
      .map((c) => ({
        id: c.relatedEntityId,
        type: c.relatedEntityType,
        name: c.relatedEntityName,
      }));

    const circlePromises = communityMediaIds.slice(0, 6).map((cm) =>
      cm.type === 'tv'
        ? getTVRecommendations(cm.id).catch(() => [])
        : getMovieRecommendations(cm.id).catch(() => [])
    );

    // If there are no community-linked media, try search history terms
    let trendingInCircles = [];
    if (circlePromises.length > 0) {
      const circleResults = await Promise.all(circlePromises);
      trendingInCircles = dedup(circleResults.flat().sort(() => 0.5 - Math.random()), 20);
    } else if (userSearchHistory.length > 0) {
      // Fallback: use search history queries to find content via TMDB search
      const searchQueries = userSearchHistory.slice(0, 3).map((h) => h.query);
      const searchPromises = searchQueries.map(async (q) => {
        try {
          const res = await tmdb.get('/search/multi', { params: { query: q, page: 1 } });
          return formatMediaList(res.data.results || []);
        } catch {
          return [];
        }
      });
      const searchResults = await Promise.all(searchPromises);
      trendingInCircles = dedup(searchResults.flat().sort(() => 0.5 - Math.random()), 20);
    }

    // ------------------- 4 & 5. Top 10 Trending in Country -------------------
    const [trendingMoviesRegion, trendingTVRegion] = await Promise.all([
      getTrendingMoviesInRegion(country).catch(() => ({ results: [] })),
      getTrendingTVInRegion(country).catch(() => ({ results: [] })),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        recommended,
        becauseYouLiked,
        trendingInCircles,
        top10Movies: (trendingMoviesRegion.results || []).slice(0, 10),
        top10TV: (trendingTVRegion.results || []).slice(0, 10),
        country,
        countryName,
      },
    });
  } catch (error) {
    console.error('Recommendations/all error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
});
