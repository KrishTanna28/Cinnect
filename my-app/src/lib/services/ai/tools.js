/**
 * Cinnect AI Assistant - Tool Definitions
 * Defines all available tools for the AI to call
 */

import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';
import Review from '@/lib/models/Review';
import Community from '@/lib/models/Community';
import Post from '@/lib/models/Post';
import * as tmdbService from '@/lib/services/tmdb.service';
import { retrieveRAGContext } from '@/lib/services/rag.service';
import { searchCommunitiesByTopic, getTrendingPosts, searchPostsByTopic } from '@/lib/services/chatTools.service';

// Tool declarations for Gemini function calling
export const toolDeclarations = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT DISCOVERY TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'getTrendingContent',
    description: 'Get trending movies and/or TV shows. Use for "what\'s trending", "what\'s hot", "popular right now".',
    parameters: {
      type: 'object',
      properties: {
        mediaType: { type: 'string', description: 'movie, tv, or all (default: all)' },
        timeWindow: { type: 'string', description: 'day or week (default: week)' }
      }
    }
  },
  {
    name: 'getPopularMovies',
    description: 'Get currently popular movies. Use for "popular movies", "movies everyone is watching".',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' }
      }
    }
  },
  {
    name: 'getTopRatedMovies',
    description: 'Get highest rated movies of all time. Use for "best movies", "top rated", "all-time classics".',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' }
      }
    }
  },
  {
    name: 'getPopularTVShows',
    description: 'Get currently popular TV shows. Use for "popular shows", "TV everyone is watching".',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' }
      }
    }
  },
  {
    name: 'getTopRatedTVShows',
    description: 'Get highest rated TV shows. Use for "best TV shows", "top rated series".',
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'number', description: 'Page number (default: 1)' }
      }
    }
  },
  {
    name: 'discoverMovies',
    description: 'Discover movies by genre, year, rating. Use for "sci-fi movies from 2023", "action movies rated above 7".',
    parameters: {
      type: 'object',
      properties: {
        genres: { type: 'string', description: 'Genre IDs: Action=28, Comedy=35, Drama=18, Horror=27, Sci-Fi=878, Romance=10749, Thriller=53, Animation=16' },
        year: { type: 'string', description: 'Release year (e.g., 2023)' },
        minRating: { type: 'string', description: 'Minimum rating (e.g., 7)' },
        maxRating: { type: 'string', description: 'Maximum rating' },
        sortBy: { type: 'string', description: 'popularity.desc, vote_average.desc, release_date.desc' },
        language: { type: 'string', description: 'Language code (hi, en, ko, etc.)' }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'searchMovies',
    description: 'Search for movies by title. Use when user mentions a specific movie name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Movie title to search' }
      },
      required: ['query']
    }
  },
  {
    name: 'searchTVShows',
    description: 'Search for TV shows by title. Use when user mentions a specific show name.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'TV show title to search' }
      },
      required: ['query']
    }
  },
  {
    name: 'searchMultiContent',
    description: 'Search movies, TV, and people together. Use for person searches or ambiguous queries.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (person name, title, etc.)' }
      },
      required: ['query']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAIL TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'getMovieById',
    description: 'Get full movie details by TMDB ID. Use after searching to get complete info.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'TMDB movie ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'getTVShowById',
    description: 'Get full TV show details by TMDB ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'TMDB TV show ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'getTVEpisodeSummary',
    description: 'Get a specific TV episode summary by show ID, season number, and episode number. Use when users ask for a season/episode recap or summary.',
    parameters: {
      type: 'object',
      properties: {
        tvId: { type: 'string', description: 'TMDB TV show ID' },
        seasonNumber: { type: 'number', description: 'Season number (e.g., 1)' },
        episodeNumber: { type: 'number', description: 'Episode number (e.g., 2)' }
      },
      required: ['tvId', 'seasonNumber', 'episodeNumber']
    }
  },
  {
    name: 'getPersonById',
    description: 'Get actor/director details by TMDB ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'TMDB person ID' }
      },
      required: ['id']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'searchCommunitiesByTopic',
    description: 'Search Cinnect communities by topic. Use for "Marvel communities", "anime groups".',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to search (Marvel, anime, etc.)' }
      },
      required: ['topic']
    }
  },
  {
    name: 'getCommunities',
    description: 'Browse popular communities on Cinnect.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        sort: { type: 'string', description: 'popular, recent, or members' },
        limit: { type: 'number', description: 'Number of communities (default: 10)' }
      }
    }
  },
  {
    name: 'getCommunityPosts',
    description: 'Get posts from a specific community by slug.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Community slug' },
        sort: { type: 'string', description: 'recent, popular, or hot' },
        limit: { type: 'number', description: 'Number of posts' }
      },
      required: ['slug']
    }
  },
  {
    name: 'getTrendingPosts',
    description: 'Get trending posts across all communities.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of posts (max 10)' }
      }
    }
  },
  {
    name: 'searchPostsByTopic',
    description: 'Search community posts by keyword.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to search' }
      },
      required: ['topic']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEWS TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'searchReviewsAndPosts',
    description: 'Search user reviews and discussions (RAG). Use for "what do people think about X".',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for opinions/discussions' }
      },
      required: ['query']
    }
  },
  {
    name: 'getReviews',
    description: 'Get Cinnect reviews for a specific movie/TV show by TMDB ID.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'TMDB media ID' },
        mediaType: { type: 'string', description: 'movie or tv' },
        limit: { type: 'number', description: 'Number of reviews' }
      },
      required: ['mediaId', 'mediaType']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // USER TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'getLeaderboard',
    description: 'Get top users on Cinnect by points.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of users (default: 10)' }
      }
    }
  },
  {
    name: 'searchUsers',
    description: 'Search for Cinnect users by username.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Username to search' },
        limit: { type: 'number', description: 'Number of results' }
      },
      required: ['query']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // USER ACTION TOOLS (require authentication)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: 'addToWatchlist',
    description: 'Add a movie/TV show to the user\'s watchlist. Requires user to be logged in.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'TMDB media ID' },
        mediaType: { type: 'string', description: 'movie or tv' },
        mediaTitle: { type: 'string', description: 'Title of the media' }
      },
      required: ['mediaId', 'mediaType', 'mediaTitle']
    }
  },
  {
    name: 'removeFromWatchlist',
    description: 'Remove a movie/TV show from watchlist.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'TMDB media ID' },
        mediaType: { type: 'string', description: 'movie or tv' }
      },
      required: ['mediaId', 'mediaType']
    }
  },
  {
    name: 'addToFavorites',
    description: 'Add a movie/TV show to favorites.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'TMDB media ID' },
        mediaType: { type: 'string', description: 'movie or tv' },
        mediaTitle: { type: 'string', description: 'Title of the media' }
      },
      required: ['mediaId', 'mediaType', 'mediaTitle']
    }
  },
  {
    name: 'removeFromFavorites',
    description: 'Remove from favorites.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'TMDB media ID' },
        mediaType: { type: 'string', description: 'movie or tv' }
      },
      required: ['mediaId', 'mediaType']
    }
  },
  {
    name: 'markAsWatched',
    description: 'Mark a movie/TV show as watched.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'TMDB media ID' },
        mediaType: { type: 'string', description: 'movie or tv' },
        mediaTitle: { type: 'string', description: 'Title of the media' }
      },
      required: ['mediaId', 'mediaType', 'mediaTitle']
    }
  },
  {
    name: 'getUserWatchlist',
    description: 'Get the current user\'s watchlist.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of items to return' }
      }
    }
  },
  {
    name: 'getUserFavorites',
    description: 'Get the current user\'s favorites.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of items to return' }
      }
    }
  },
  {
    name: 'getUserStats',
    description: 'Get the current user\'s stats (level, points, streaks, achievements).',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
];

// Export tools in Gemini format
export const tools = [{ functionDeclarations: toolDeclarations }];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function executeTool(name, args, userId = null) {
  try {
    switch (name) {
      // ─── Content Discovery ───────────────────────────────────────────────────
      case 'getTrendingContent': {
        const mediaType = args.mediaType || 'all';
        const timeWindow = args.timeWindow || 'week';
        const results = await tmdbService.getTrending(mediaType, timeWindow).catch(() => []);
        return formatMediaResults(results, 10);
      }

      case 'getPopularMovies': {
        const data = await tmdbService.getPopular(args.page || 1).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 10);
      }

      case 'getTopRatedMovies': {
        const data = await tmdbService.getTopRated(args.page || 1).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 10);
      }

      case 'getPopularTVShows': {
        const data = await tmdbService.getPopularTV(args.page || 1).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 10);
      }

      case 'getTopRatedTVShows': {
        const data = await tmdbService.getTopRatedTV(args.page || 1).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 10);
      }

      case 'discoverMovies': {
        const filters = {
          page: args.page || 1,
          genres: args.genres || null,
          year: args.year || null,
          language: args.language || null,
          sortBy: args.sortBy || 'popularity.desc',
          minRating: args.minRating || null,
          maxRating: args.maxRating || null
        };
        const data = await tmdbService.discoverMovies(filters).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 10);
      }

      // ─── Search ──────────────────────────────────────────────────────────────
      case 'searchMovies': {
        const data = await tmdbService.searchMovies(args.query, args.page || 1).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 8);
      }

      case 'searchTVShows': {
        const data = await tmdbService.searchTV(args.query, args.page || 1).catch(() => ({ results: [] }));
        return formatMediaResults(data?.results, 8);
      }

      case 'searchMultiContent': {
        const data = await tmdbService.searchMulti(args.query).catch(() => ({ results: [] }));
        return JSON.stringify((data?.results || []).slice(0, 8).map(item => ({
          id: item.id,
          type: item.mediaType,
          title: item.title,
          year: item.releaseDate?.split('-')[0],
          rating: item.rating?.toFixed?.(1) || item.rating,
          overview: item.overview?.slice(0, 120),
          knownFor: item.knownFor
        })));
      }

      // ─── Details ─────────────────────────────────────────────────────────────
      case 'getMovieById': {
        const movie = await tmdbService.getMovieDetails(args.id).catch(() => null);
        if (!movie) return JSON.stringify({ error: 'Movie not found' });
        return JSON.stringify({
          id: movie.id,
          title: movie.title,
          year: movie.releaseDate?.split('-')[0],
          rating: movie.rating?.toFixed?.(1) || movie.rating,
          overview: movie.overview,
          genres: movie.genres?.map(g => g.name),
          runtime: movie.runtime,
          director: movie.crew?.find(c => c.job === 'Director')?.name,
          cast: movie.cast?.slice(0, 5).map(c => c.name),
          tagline: movie.tagline,
          status: movie.status
        });
      }

      case 'getTVShowById': {
        const show = await tmdbService.getTVDetails(args.id).catch(() => null);
        if (!show) return JSON.stringify({ error: 'TV show not found' });
        return JSON.stringify({
          id: show.id,
          title: show.title,
          year: show.firstAirDate?.split('-')[0],
          rating: show.rating?.toFixed?.(1) || show.rating,
          overview: show.overview,
          genres: show.genres?.map(g => g.name),
          seasons: show.numberOfSeasons,
          episodes: show.numberOfEpisodes,
          status: show.status,
          cast: show.cast?.slice(0, 5).map(c => c.name)
        });
      }

      case 'getTVEpisodeSummary': {
        const seasonDetails = await tmdbService.getTVSeasonDetails(args.tvId, args.seasonNumber).catch(() => null);
        if (!seasonDetails) return JSON.stringify({ error: 'Season not found' });

        const episode = (seasonDetails.episodes || []).find(ep => Number(ep.episodeNumber) === Number(args.episodeNumber));
        if (!episode) return JSON.stringify({ error: 'Episode not found' });

        return JSON.stringify({
          tvId: args.tvId,
          seasonNumber: Number(args.seasonNumber),
          episodeNumber: Number(args.episodeNumber),
          title: episode.name,
          overview: episode.overview || 'No episode summary available.',
          airDate: episode.airDate,
          runtime: episode.runtime,
          rating: episode.rating,
          voteCount: episode.voteCount,
          guestStars: (episode.guestStars || []).slice(0, 5).map(g => g.name)
        });
      }

      case 'getPersonById': {
        const person = await tmdbService.getPersonDetails(args.id).catch(() => null);
        if (!person) return JSON.stringify({ error: 'Person not found' });
        const topMovies = (person.movieCredits?.cast || []).slice(0, 5).map(c => ({
          title: c.title,
          year: c.releaseDate?.split('-')[0]
        }));
        const topTV = (person.tvCredits?.cast || []).slice(0, 3).map(c => ({
          title: c.title,
          year: c.firstAirDate?.split('-')[0]
        }));
        return JSON.stringify({
          id: person.id,
          name: person.name,
          knownFor: person.knownForDepartment,
          biography: person.biography?.slice(0, 400),
          birthday: person.birthday,
          placeOfBirth: person.placeOfBirth,
          notableWorks: [...topMovies, ...topTV]
        });
      }

      // ─── Community ───────────────────────────────────────────────────────────
      case 'searchCommunitiesByTopic': {
        const communities = await searchCommunitiesByTopic(args.topic);
        return JSON.stringify(communities);
      }

      case 'getCommunities': {
        await connectDB();
        const query = { isActive: true };
        if (args.category && args.category !== 'all') query.category = args.category;
        const limit = Math.min(args.limit || 10, 15);
        let sort = { postCount: -1, memberCount: -1 };
        if (args.sort === 'recent') sort = { createdAt: -1 };
        if (args.sort === 'members') sort = { memberCount: -1 };
        const communities = await Community.find(query)
          .select('name slug description category memberCount postCount')
          .sort(sort)
          .limit(limit)
          .lean();
        return JSON.stringify(communities);
      }

      case 'getCommunityPosts': {
        await connectDB();
        const community = await Community.findOne({ slug: args.slug }).lean();
        if (!community) return JSON.stringify({ error: 'Community not found' });
        if (community.isPrivate) return JSON.stringify({ error: 'Private community' });
        const limit = Math.min(args.limit || 5, 10);
        const posts = await Post.find({ community: community._id, isApproved: true })
          .populate('user', 'username')
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('title content createdAt likes comments')
          .lean();
        return JSON.stringify(posts.map(p => ({
          title: p.title,
          content: p.content?.slice(0, 200),
          author: p.user?.username,
          likes: p.likes?.length || 0,
          comments: p.comments?.length || 0
        })));
      }

      case 'getTrendingPosts': {
        const posts = await getTrendingPosts(args.limit || 5);
        return JSON.stringify(posts);
      }

      case 'searchPostsByTopic': {
        const posts = await searchPostsByTopic(args.topic);
        return JSON.stringify(posts);
      }

      // ─── Reviews ─────────────────────────────────────────────────────────────
      case 'searchReviewsAndPosts': {
        const ragContext = await retrieveRAGContext(args.query);
        return ragContext || 'No reviews or discussions found for this topic.';
      }

      case 'getReviews': {
        await connectDB();
        const limit = Math.min(args.limit || 5, 10);
        const reviews = await Review.find({
          mediaId: args.mediaId,
          mediaType: args.mediaType
        })
          .populate('user', 'username')
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('title content rating spoiler createdAt')
          .lean();
        return JSON.stringify(reviews.map(r => ({
          title: r.title,
          content: r.content?.slice(0, 300),
          rating: r.rating,
          author: r.user?.username,
          spoiler: r.spoiler
        })));
      }

      // ─── Users ───────────────────────────────────────────────────────────────
      case 'getLeaderboard': {
        await connectDB();
        const limit = Math.min(args.limit || 10, 20);
        const users = await User.find()
          .select('username fullName points level')
          .sort({ 'points.total': -1 })
          .limit(limit)
          .lean();
        return JSON.stringify(users.map((u, i) => ({
          rank: i + 1,
          username: u.username,
          points: u.points?.total || 0,
          level: u.level
        })));
      }

      case 'searchUsers': {
        await connectDB();
        const limit = Math.min(args.limit || 5, 10);
        const regex = { $regex: args.query, $options: 'i' };
        const users = await User.find({
          $or: [{ username: regex }, { fullName: regex }]
        })
          .select('username fullName bio points level')
          .limit(limit)
          .lean();
        return JSON.stringify(users.map(u => ({
          username: u.username,
          fullName: u.fullName,
          bio: u.bio?.slice(0, 100),
          level: u.level
        })));
      }

      // ─── User Actions ────────────────────────────────────────────────────────
      case 'addToWatchlist': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in to add to watchlist', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return JSON.stringify({ error: 'User not found' });

        const exists = user.watchlist?.some(item =>
          item.mediaId === args.mediaId && item.mediaType === args.mediaType
        );
        if (exists) return JSON.stringify({ success: true, message: `"${args.mediaTitle}" is already in your watchlist` });

        user.watchlist.push({
          mediaId: args.mediaId,
          mediaType: args.mediaType,
          title: args.mediaTitle,
          addedAt: new Date()
        });
        await user.save();
        return JSON.stringify({ success: true, message: `Added "${args.mediaTitle}" to your watchlist!`, watchlistCount: user.watchlist.length });
      }

      case 'removeFromWatchlist': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return JSON.stringify({ error: 'User not found' });

        const before = user.watchlist?.length || 0;
        user.watchlist = user.watchlist.filter(item =>
          !(item.mediaId === args.mediaId && item.mediaType === args.mediaType)
        );
        await user.save();
        const removed = before > user.watchlist.length;
        return JSON.stringify({
          success: removed,
          message: removed ? 'Removed from watchlist' : 'Item was not in watchlist'
        });
      }

      case 'addToFavorites': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return JSON.stringify({ error: 'User not found' });

        const exists = user.favorites?.some(item =>
          item.mediaId === args.mediaId && item.mediaType === args.mediaType
        );
        if (exists) return JSON.stringify({ success: true, message: `"${args.mediaTitle}" is already in your favorites` });

        user.favorites.push({
          mediaId: args.mediaId,
          mediaType: args.mediaType,
          title: args.mediaTitle,
          addedAt: new Date()
        });
        await user.save();
        return JSON.stringify({ success: true, message: `Added "${args.mediaTitle}" to your favorites!` });
      }

      case 'removeFromFavorites': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return JSON.stringify({ error: 'User not found' });

        user.favorites = user.favorites.filter(item =>
          !(item.mediaId === args.mediaId && item.mediaType === args.mediaType)
        );
        await user.save();
        return JSON.stringify({ success: true, message: 'Removed from favorites' });
      }

      case 'markAsWatched': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId);
        if (!user) return JSON.stringify({ error: 'User not found' });

        const exists = user.watchHistory?.some(item =>
          item.mediaId === args.mediaId && item.mediaType === args.mediaType
        );
        if (!exists) {
          user.watchHistory.push({
            mediaId: args.mediaId,
            mediaType: args.mediaType,
            title: args.mediaTitle,
            watchedAt: new Date()
          });
          await user.save();
        }
        return JSON.stringify({ success: true, message: `Marked "${args.mediaTitle}" as watched!` });
      }

      case 'getUserWatchlist': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId).select('watchlist').lean();
        if (!user) return JSON.stringify({ error: 'User not found' });
        const limit = args.limit || 10;
        return JSON.stringify({
          count: user.watchlist?.length || 0,
          items: (user.watchlist || []).slice(0, limit).map(w => ({
            title: w.title,
            mediaType: w.mediaType,
            mediaId: w.mediaId
          }))
        });
      }

      case 'getUserFavorites': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId).select('favorites').lean();
        if (!user) return JSON.stringify({ error: 'User not found' });
        const limit = args.limit || 10;
        return JSON.stringify({
          count: user.favorites?.length || 0,
          items: (user.favorites || []).slice(0, limit).map(f => ({
            title: f.title,
            mediaType: f.mediaType,
            mediaId: f.mediaId
          }))
        });
      }

      case 'getUserStats': {
        if (!userId) return JSON.stringify({ error: 'You need to be logged in', actionRequired: 'login' });
        await connectDB();
        const user = await User.findById(userId)
          .select('username level points streaks achievements badges')
          .lean();
        if (!user) return JSON.stringify({ error: 'User not found' });
        return JSON.stringify({
          username: user.username,
          level: user.level,
          points: user.points?.total || 0,
          streak: user.streaks?.current || 0,
          longestStreak: user.streaks?.longest || 0,
          reviewsWritten: user.achievements?.reviewsWritten || 0,
          ratingsGiven: user.achievements?.ratingsGiven || 0,
          badgeCount: user.badges?.length || 0
        });
      }

      default:
        return JSON.stringify({ error: 'Unknown tool' });
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error);
    return JSON.stringify({ error: 'Failed to execute action' });
  }
}

// Helper to format media results consistently
function formatMediaResults(items, limit = 10) {
  if (!Array.isArray(items)) return JSON.stringify([]);
  return JSON.stringify(items.slice(0, limit).map(m => ({
    id: m.id,
    type: m.mediaType,
    title: m.title,
    year: m.releaseDate?.split('-')[0],
    rating: m.rating?.toFixed?.(1) || m.rating,
    overview: m.overview?.slice(0, 150)
  })));
}
