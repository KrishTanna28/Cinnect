/**
 * Cinnect AI Assistant - Context Builder Module
 * Assembles relevant context based on intent and user data
 */

import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';
import Review from '@/lib/models/Review';
import Community from '@/lib/models/Community';
import Post from '@/lib/models/Post';
import UserActivity from '@/lib/models/UserActivity';
import { INTENTS } from './intentClassifier';
import * as tmdbService from '@/lib/services/tmdb.service';
import { retrieveRAGContext } from '@/lib/services/rag.service';
import { buildCacheKey, remember } from '@/lib/utils/cache.js';

const CONTEXT_CACHE_TTL = 5 * 60;

/**
 * Build context based on classification and available user data
 */
export async function buildContext(classification, userId = null, message = '') {
  const context = {
    user: null,
    platform: getPlatformContext(),
    content: null,
    community: null,
    trending: null
  };

  const tasks = [];

  // Always include platform context for guidance
  if (classification.intent === INTENTS.GUIDANCE) {
    context.platform = getDetailedPlatformContext();
  }

  // Fetch user context if authenticated and relevant
  if (userId && classification.requiresUserContext) {
    tasks.push(
      fetchUserContext(userId).then(data => { context.user = data; })
    );
  }

  // Fetch content context based on intent
  switch (classification.intent) {
    case INTENTS.DISCOVERY:
    case INTENTS.PERSONALIZATION:
      tasks.push(
        fetchDiscoveryContext(classification, userId).then(data => { context.content = data; })
      );
      break;

    case INTENTS.INFORMATION:
    case INTENTS.SUMMARY:
      if (classification.entities.mediaTitle) {
        tasks.push(
          fetchMediaContext(classification.entities).then(data => { context.content = data; })
        );
      }
      break;

    case INTENTS.COMMUNITY:
      tasks.push(
        fetchCommunityContext(message).then(data => { context.community = data; })
      );
      break;

    case INTENTS.TRENDING:
      tasks.push(
        fetchTrendingContext().then(data => { context.trending = data; })
      );
      break;

    case INTENTS.EXPLANATION:
      // For explanations, we might need RAG context
      tasks.push(
        fetchExplanationContext(message).then(data => { context.community = data; })
      );
      break;
  }

  await Promise.all(tasks);

  return formatContextForLLM(context, classification);
}

/**
 * Fetch user-specific context
 */
async function fetchUserContext(userId) {
  try {
    await connectDB();

    const [user, activity, recentReviews] = await Promise.all([
      User.findById(userId)
        .select('username favoriteGenres watchlist favorites watchHistory points level streaks achievements')
        .lean(),
      UserActivity.findOne({ user: userId })
        .select('recentViews genreFrequency')
        .lean(),
      Review.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('mediaTitle mediaType rating')
        .lean()
    ]);

    if (!user) return null;

    return {
      username: user.username,
      level: user.level,
      points: user.points?.total || 0,
      streak: user.streaks?.current || 0,
      favoriteGenres: user.favoriteGenres || [],
      watchlistCount: user.watchlist?.length || 0,
      favoritesCount: user.favorites?.length || 0,
      recentRatings: recentReviews.map(r => ({
        title: r.mediaTitle,
        type: r.mediaType,
        rating: r.rating
      })),
      genrePreferences: activity?.genreFrequency
        ? Object.entries(activity.genreFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre]) => genre)
        : [],
      recentViews: activity?.recentViews?.slice(0, 5).map(v => ({
        title: v.title,
        type: v.mediaType
      })) || []
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * Fetch discovery/recommendation context
 */
async function fetchDiscoveryContext(classification, userId) {
  const context = {};

  try {
    const [trendingMovies, trendingTV] = await Promise.all([
      remember(
        buildCacheKey('ai-context', 'discovery', 'trending', 'movie', 'week'),
        CONTEXT_CACHE_TTL,
        () => tmdbService.getTrending('movie', 'week').catch(() => [])
      ),
      remember(
        buildCacheKey('ai-context', 'discovery', 'trending', 'tv', 'week'),
        CONTEXT_CACHE_TTL,
        () => tmdbService.getTrending('tv', 'week').catch(() => [])
      )
    ]);

    context.trendingMovies = formatMediaList(trendingMovies, 5);
    context.trendingTV = formatMediaList(trendingTV, 5);

    // If user has preferences, get genre-specific content
    if (userId) {
      await connectDB();
      const user = await User.findById(userId).select('favoriteGenres').lean();

      if (user?.favoriteGenres?.length > 0) {
        const genreIds = getGenreIds(user.favoriteGenres);
        if (genreIds) {
          const recommended = await remember(
            buildCacheKey('ai-context', 'discovery', 'genres', genreIds),
            CONTEXT_CACHE_TTL,
            () => tmdbService.discoverMovies({
              genres: genreIds,
              sortBy: 'vote_average.desc',
              minRating: '7'
            }).catch(() => ({ results: [] }))
          );

          context.genreRecommendations = formatMediaList(recommended.results, 5);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching discovery context:', error);
  }

  return context;
}

/**
 * Fetch specific media context
 */
async function fetchMediaContext(entities) {
  try {
    const { mediaTitle, mediaType } = entities;

    // Search for the media
    const results = await tmdbService.searchMulti(mediaTitle).catch(() => ({ results: [] }));

    if (results.results?.length > 0) {
      const firstResult = results.results[0];
      const type = firstResult.mediaType || mediaType;

      // Get detailed info
      if (type === 'movie') {
        return await tmdbService.getMovieDetails(firstResult.id).catch(() => null);
      } else if (type === 'tv') {
        return await tmdbService.getTVDetails(firstResult.id).catch(() => null);
      } else if (type === 'person') {
        return await tmdbService.getPersonDetails(firstResult.id).catch(() => null);
      }
    }
  } catch (error) {
    console.error('Error fetching media context:', error);
  }
  return null;
}

/**
 * Fetch community/discussion context
 */
async function fetchCommunityContext(message) {
  try {
    // Use RAG to find relevant discussions
    const ragContext = await retrieveRAGContext(message);

    // Also get trending posts
    await connectDB();
    const trendingPosts = await Post.aggregate([
      { $match: { isApproved: true, isFlagged: { $ne: true } } },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: [{ $size: { $ifNull: ['$likes', []] } }, 3] },
              { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'communities',
          localField: 'community',
          foreignField: '_id',
          as: 'communityInfo'
        }
      },
      { $unwind: { path: '$communityInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          content: { $substrCP: [{ $ifNull: ['$content', ''] }, 0, 150] },
          likes: { $size: { $ifNull: ['$likes', []] } },
          communityName: '$communityInfo.name'
        }
      }
    ]);

    return {
      ragContext,
      trendingPosts
    };
  } catch (error) {
    console.error('Error fetching community context:', error);
    return null;
  }
}

/**
 * Fetch trending context
 */
async function fetchTrendingContext() {
  const cacheKey = buildCacheKey('ai-context', 'trending');

  return remember(cacheKey, CONTEXT_CACHE_TTL, async () => {
    try {
      const [movies, tv, posts] = await Promise.all([
        tmdbService.getTrending('movie', 'day').catch(() => []),
        tmdbService.getTrending('tv', 'day').catch(() => []),
        fetchTrendingPosts()
      ]);

      return {
        movies: formatMediaList(movies, 10),
        tv: formatMediaList(tv, 10),
        posts
      };
    } catch (error) {
      console.error('Error fetching trending context:', error);
      return null;
    }
  });
}

/**
 * Fetch explanation context (RAG-based)
 */
async function fetchExplanationContext(message) {
  try {
    return await retrieveRAGContext(message);
  } catch (error) {
    console.error('Error fetching explanation context:', error);
    return null;
  }
}

/**
 * Get basic platform context
 */
function getPlatformContext() {
  return {
    features: ['Communities', 'Watchlist', 'Favorites', 'Reviews', 'Leaderboard', 'Recommendations'],
    actions: ['Add to watchlist', 'Rate movies', 'Write reviews', 'Create communities', 'Join communities', 'Follow users']
  };
}

/**
 * Get detailed platform context for guidance
 */
function getDetailedPlatformContext() {
  return {
    navigation: {
      profile: 'Click avatar > Profile',
      watchlist: 'Profile > Watchlist tab OR Navigation > Watchlist',
      communities: 'Navigation bar > Communities',
      reviews: 'Any movie/TV page > Scroll to Reviews section',
      settings: 'Click avatar > Settings',
      leaderboard: 'Navigation > Leaderboard'
    },
    features: {
      communities: 'Join topic-based groups for movies, TV shows, actors. Create posts, discuss, and connect with fans.',
      watchlist: 'Save movies and shows you want to watch. Access from your profile.',
      favorites: 'Mark your all-time favorite titles. Shows on your profile.',
      reviews: 'Rate (0-10) and review any movie or TV show. Mark spoilers if needed.',
      gamification: 'Earn XP for activity. Level up, unlock badges, climb the leaderboard.',
      recommendations: 'Get personalized suggestions based on your ratings and watch history.'
    },
    howTo: {
      writeReview: '1. Go to movie/show page → 2. Scroll to Reviews → 3. Click "Write Review" → 4. Rate & write → 5. Submit',
      joinCommunity: '1. Go to Communities → 2. Browse/search → 3. Open community → 4. Click "Join"',
      createCommunity: '1. Log in → 2. Open Communities from the main navigation → 3. Click "Create Community" (top-right) → 4. Fill name, description, category, and optional media/person link → 5. Submit to publish',
      createPost: '1. Join a community → 2. Open it → 3. Click "Create Post" → 4. Write content → 5. Submit',
      addToWatchlist: '1. Go to any movie/show page → 2. Click "Add to Watchlist" button'
    }
  };
}

/**
 * Fetch trending posts from communities
 */
async function fetchTrendingPosts() {
  try {
    await connectDB();

    const posts = await Post.aggregate([
      { $match: { isApproved: true } },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: [{ $size: { $ifNull: ['$likes', []] } }, 3] },
              { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: 5 },
      { $project: { title: 1, engagementScore: 1 } }
    ]);

    return posts;
  } catch (error) {
    return [];
  }
}

/**
 * Format media list for context
 */
function formatMediaList(items, limit = 5) {
  if (!Array.isArray(items)) return [];

  return items.slice(0, limit).map(item => ({
    id: item.id,
    title: item.title,
    year: item.releaseDate?.split('-')[0],
    rating: item.rating?.toFixed?.(1) || item.rating,
    overview: item.overview?.slice(0, 100)
  }));
}

/**
 * Convert genre names to TMDB IDs
 */
function getGenreIds(genres) {
  const genreMap = {
    action: 28, adventure: 12, animation: 16, comedy: 35,
    crime: 80, documentary: 99, drama: 18, family: 10751,
    fantasy: 14, history: 36, horror: 27, music: 10402,
    mystery: 9648, romance: 10749, 'sci-fi': 878, 'science fiction': 878,
    thriller: 53, war: 10752, western: 37
  };

  const ids = genres
    .map(g => genreMap[g.toLowerCase()])
    .filter(Boolean);

  return ids.length > 0 ? ids.join(',') : null;
}

/**
 * Format context for LLM consumption
 */
function formatContextForLLM(context, classification) {
  const parts = [];

  // User context
  if (context.user) {
    parts.push(`\n--- USER PROFILE ---
Username: ${context.user.username}
Level: ${context.user.level} | Points: ${context.user.points}
Current Streak: ${context.user.streak} days
Watchlist: ${context.user.watchlistCount} items | Favorites: ${context.user.favoritesCount} items
${context.user.favoriteGenres.length ? `Favorite Genres: ${context.user.favoriteGenres.join(', ')}` : ''}
${context.user.genrePreferences.length ? `Most Watched Genres: ${context.user.genrePreferences.join(', ')}` : ''}
${context.user.recentRatings.length ? `Recent Ratings:\n${context.user.recentRatings.map(r => `  - ${r.title}: ${r.rating}/10`).join('\n')}` : ''}`);
  }

  // Content context
  if (context.content) {
    if (context.content.trendingMovies?.length) {
      parts.push(`\n--- TRENDING MOVIES ---\n${context.content.trendingMovies.map((m, i) =>
        `${i + 1}. ${m.title} (${m.year}) - ${m.rating}`
      ).join('\n')}`);
    }
    if (context.content.trendingTV?.length) {
      parts.push(`\n--- TRENDING TV ---\n${context.content.trendingTV.map((s, i) =>
        `${i + 1}. ${s.title} (${s.year}) - ${s.rating}`
      ).join('\n')}`);
    }
    if (context.content.genreRecommendations?.length) {
      parts.push(`\n--- BASED ON YOUR TASTE ---\n${context.content.genreRecommendations.map((m, i) =>
        `${i + 1}. ${m.title} (${m.year}) - ${m.rating}`
      ).join('\n')}`);
    }
    // Single media details
    if (context.content.title && context.content.id) {
      parts.push(`\n--- MEDIA DETAILS ---
Title: ${context.content.title}
Year: ${context.content.releaseDate?.split('-')[0] || context.content.firstAirDate?.split('-')[0]}
Rating: ${context.content.rating?.toFixed?.(1) || context.content.rating}
Genres: ${context.content.genres?.map(g => g.name).join(', ') || 'N/A'}
Overview: ${context.content.overview?.slice(0, 300)}...`);
    }
  }

  // Trending context
  if (context.trending) {
    if (context.trending.movies?.length) {
      parts.push(`\n--- TODAY'S TRENDING MOVIES ---\n${context.trending.movies.slice(0, 5).map((m, i) =>
        `${i + 1}. ${m.title} (${m.year}) - ${m.rating}`
      ).join('\n')}`);
    }
    if (context.trending.tv?.length) {
      parts.push(`\n--- TODAY'S TRENDING TV ---\n${context.trending.tv.slice(0, 5).map((s, i) =>
        `${i + 1}. ${s.title} (${s.year}) - ${s.rating}`
      ).join('\n')}`);
    }
  }

  // Community context
  if (context.community) {
    if (typeof context.community === 'string') {
      parts.push(context.community); // RAG context
    } else if (context.community.ragContext) {
      parts.push(context.community.ragContext);
    }
    if (context.community.trendingPosts?.length) {
      parts.push(`\n--- TRENDING DISCUSSIONS ---\n${context.community.trendingPosts.map((p, i) =>
        `${i + 1}. "${p.title}" in ${p.communityName || 'Community'} (${p.likes} likes)`
      ).join('\n')}`);
    }
  }

  // Platform context for guidance
  if (classification.intent === INTENTS.GUIDANCE && context.platform?.howTo) {
    parts.push(`\n--- PLATFORM GUIDE ---
Navigation:
${Object.entries(context.platform.navigation).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

How To:
${Object.entries(context.platform.howTo).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}
