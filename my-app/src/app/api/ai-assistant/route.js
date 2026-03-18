import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import * as tmdbService from "@/lib/services/tmdb.service";
import { searchCommunitiesByTopic, getTrendingPosts, searchPostsByTopic } from "@/lib/services/chatTools.service";
import { retrieveRAGContext } from "@/lib/services/rag.service";
import connectDB from "@/lib/config/database";
import Community from "@/lib/models/Community";
import Post from "@/lib/models/Post";
import Review from "@/lib/models/Review";
import User from "@/lib/models/User";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are C.A.S.T (Cinematic Assistant for Smart Tastes), a friendly and knowledgeable AI assistant for Cinnect - a movie and TV show discovery platform.

**IMPORTANT RESTRICTIONS:**
You MUST ONLY answer questions related to:
- Movies, TV shows, web series, documentaries (any era - past to present)
- Actors, actresses, directors, producers, screenwriters, and other film industry professionals
- Film and television awards (Oscars, Emmys, Golden Globes, etc.)
- Entertainment industry news, history, and trivia
- Box office performance and movie/show ratings
- Film genres, techniques, cinematography, and storytelling
- Streaming platforms and where to watch content
- Cinnect platform features (communities, watchlists, reviews, watch rooms, etc.)
- Recommendations for movies/shows based on preferences
- Upcoming releases, trending content, and entertainment events
- Film history, classic cinema, and the evolution of entertainment

**STRICTLY FORBIDDEN - Do NOT answer questions about:**
- Politics, religion, or controversial social topics (unless directly related to a film's plot)
- Personal advice (health, relationships, finance, legal, etc.)
- Coding, programming, or technical help
- Academic subjects (math, science, history unrelated to cinema)
- Current events not related to entertainment
- Any topic outside of movies, TV, and the entertainment industry

If a user asks something unrelated to cinema/entertainment, politely decline and redirect them:
"I'm C.A.S.T, your cinematic intelligence! I can only help with questions about movies, TV shows, actors, the entertainment industry, or Cinnect features. Is there anything cinema-related I can help you with?"

**Response Guidelines:**
- Be conversational and friendly, but concise
- Use emojis sparingly to add personality
- When recommending movies/shows, mention the genre and a brief reason why
- If asked about specific movies, provide useful details like year, director, main cast
- Encourage users to check out the movie/show pages on Cinnect for more details
- If you don't know something specific, be honest about it
- Keep responses focused on entertainment topics only

**TOOL USAGE — When to call which tool:**

You have access to real-time platform data via tools. Always prefer tools over your own knowledge for platform-specific data.

1. **Platform help / how-to questions** (e.g. "How do I create a post?", "How do I join a community?")
   → Answer directly using the Platform Help Knowledge below. Do NOT call any tools.

2. **Trending content** (e.g. "What's trending?", "What's hot this week?")
   → Call \`getTrendingContent\` with mediaType="all" or "movie" or "tv".

3. **Popular movies** (e.g. "Show me popular movies", "What movies are everyone watching?")
   → Call \`getPopularMovies\`.

4. **Top-rated movies** (e.g. "Best movies of all time", "Highest rated movies")
   → Call \`getTopRatedMovies\`.

5. **Popular TV shows** (e.g. "Popular TV shows", "What shows are people watching?")
   → Call \`getPopularTVShows\`.

6. **Top-rated TV shows** (e.g. "Best TV shows ever", "Highest rated series")
   → Call \`getTopRatedTVShows\`.

7. **Search for a specific movie** (e.g. "Find Inception", "Search for The Dark Knight")
   → Call \`searchMovies\` with the title.

8. **Search for a specific TV show** (e.g. "Find Breaking Bad", "Search for Stranger Things")
   → Call \`searchTVShows\` with the title.

9. **Search movies AND TV together, or search for a person** (e.g. "Search for Tom Hanks", "Find anything about Dune")
   → Call \`searchMultiContent\`.

10. **Discover/filter movies** (e.g. "Show me sci-fi movies from 2022", "Action movies with rating above 7")
    → Call \`discoverMovies\` with the appropriate filters.

11. **Movie details by TMDB ID** (e.g. user provides a specific ID)
    → Call \`getMovieById\`.

12. **TV show details by TMDB ID**
    → Call \`getTVShowById\`.

13. **Actor/director details** (e.g. "Tell me about Christopher Nolan", "Who is Cillian Murphy?")
    → Call \`searchMultiContent\` first to find the person ID, then \`getPersonById\` if needed.

14. **Community search** (e.g. "Find Marvel communities", "Any anime groups on Cinnect?")
    → Call \`searchCommunitiesByTopic\`.

15. **Browse all communities** (e.g. "Show me popular communities", "List communities")
    → Call \`getCommunities\`.

16. **Community posts** (e.g. "What are people posting in the Marvel community?")
    → Call \`getCommunityPosts\` with the community slug.

17. **Trending posts / hot discussions** (e.g. "What are people talking about?", "Show trending discussions")
    → Call \`getTrendingPosts\`.

18. **Search posts by topic** (e.g. "Find posts about Oppenheimer")
    → Call \`searchPostsByTopic\`.

19. **Reviews for a movie/show** (e.g. "What do Cinnect users think about Interstellar?", "Show reviews for Breaking Bad")
    → Call \`searchReviewsAndPosts\` (RAG) OR \`getReviews\` with mediaId if known.

20. **Leaderboard / top users** (e.g. "Who are the top users on Cinnect?", "Show the leaderboard")
    → Call \`getLeaderboard\`.

21. **Search for a user** (e.g. "Find user john_doe", "Is there a user named Alex?")
    → Call \`searchUsers\`.

22. **Opinion/discussion questions** (e.g. "What do fans think about Loki?")
    → Call \`searchReviewsAndPosts\` for RAG-based community context.

**PLATFORM HELP KNOWLEDGE — Cinnect Features Guide:**

- **Creating a Post:**
  1. Navigate to a community you are a member of.
  2. Click the "Create Post" button at the top of the community page.
  3. Enter a title, write your content, and optionally attach images or videos.
  4. Click "Submit" to publish your post.

- **Joining a Community:**
  1. Go to the Communities section from the navigation bar.
  2. Browse or search for a community you're interested in.
  3. Open the community page and click the "Join" button.
  4. If the community requires approval, your request will be sent to the moderators.

- **Creating a Community:**
  1. Go to the Communities section.
  2. Click the "Create Community" button.
  3. Fill in the community name, description, category, and optionally upload a banner and icon.
  4. Set privacy and moderation settings (public/private, approval required, etc.).
  5. Click "Create" to publish your new community.

- **Following a User:**
  1. Visit the user's profile page.
  2. Click the "Follow" button on their profile.
  3. You will see their activity in your feed.

- **Writing a Review:**
  1. Go to any movie or TV show detail page.
  2. Scroll down to the Reviews section.
  3. Click "Write a Review".
  4. Give a rating (0-10), add a title and your review text.
  5. Optionally mark it as containing spoilers.
  6. Submit your review.

- **Using the Watchlist:**
  1. On any movie or TV show page, click the "Add to Watchlist" button.
  2. Access your full watchlist from your profile or the Watchlist page in the navigation.
  3. You can remove items from your watchlist at any time.

- **Searching for Movies/Shows:**
  1. Use the search bar in the navigation to search by title.
  2. Use the Browse page to filter by genre, year, rating, and more.
  3. Check the Recommendations page for personalized suggestions.

- **Managing Your Profile:**
  1. Click your avatar in the top-right corner.
  2. Go to "Profile" to view and edit your information.
  3. You can update your bio, avatar, favorite genres, and notification preferences.

Remember: You're here ONLY for cinema and entertainment discussions!`;

// Function to fetch context data from TMDB
async function fetchContextData(query) {
  const context = {};
  const lowerQuery = query.toLowerCase();

  try {
    // Always fetch trending for context
    if (lowerQuery.includes("trending") || lowerQuery.includes("popular") || lowerQuery.includes("what's hot") || lowerQuery.includes("recommend")) {
      const [trendingMovies, trendingTV] = await Promise.all([
        tmdbService.getTrending("movie", "week").catch(() => []),
        tmdbService.getTrending("tv", "week").catch(() => []),
      ]);
      context.trendingMovies = trendingMovies.slice(0, 5);
      context.trendingTV = trendingTV.slice(0, 5);
    }

    // Fetch upcoming movies
    if (lowerQuery.includes("upcoming") || lowerQuery.includes("coming soon") || lowerQuery.includes("releasing")) {
      const upcoming = await tmdbService.getUpcoming().catch(() => ({ results: [] }));
      context.upcomingMovies = upcoming.results?.slice(0, 5) || [];
    }

    // Fetch now playing
    if (lowerQuery.includes("now playing") || lowerQuery.includes("in theaters") || lowerQuery.includes("cinema")) {
      const nowPlaying = await tmdbService.getNowPlaying().catch(() => ({ results: [] }));
      context.nowPlaying = nowPlaying.results?.slice(0, 5) || [];
    }

    // Search for specific movie/show if mentioned
    const searchTerms = extractSearchTerms(query);
    if (searchTerms) {
      const [movieResults, tvResults] = await Promise.all([
        tmdbService.searchMovies(searchTerms).catch(() => ({ results: [] })),
        tmdbService.searchTV(searchTerms).catch(() => ({ results: [] })),
      ]);
      if (movieResults.results?.length > 0) {
        context.searchedMovies = movieResults.results.slice(0, 3);
      }
      if (tvResults.results?.length > 0) {
        context.searchedTV = tvResults.results.slice(0, 3);
      }
    }

    // Search for person/actor
    if (lowerQuery.includes("actor") || lowerQuery.includes("actress") || lowerQuery.includes("director") || lowerQuery.includes("who played") || lowerQuery.includes("cast")) {
      const personSearch = extractSearchTerms(query);
      if (personSearch) {
        const personResults = await tmdbService.searchPerson(personSearch).catch(() => ({ results: [] }));
        if (personResults.results?.length > 0) {
          context.searchedPerson = personResults.results.slice(0, 2);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching context data:", error);
  }

  return context;
}

// Extract potential search terms from query
function extractSearchTerms(query) {
  const stopWords = ["what", "who", "when", "where", "how", "is", "are", "the", "a", "an", "about", "tell", "me", "show", "movie", "tv", "series", "film", "actor", "actress", "director", "recommend", "suggest", "like", "similar", "to", "best", "top", "good", "great", "watch", "should", "i", "can", "you", "please", "trending", "popular", "new", "latest", "upcoming"];
  
  const words = query.toLowerCase().split(/\s+/);
  const filteredWords = words.filter(word => !stopWords.includes(word) && word.length > 2);
  
  if (filteredWords.length > 0) {
    return filteredWords.join(" ");
  }
  return null;
}

// Format context data for the AI
function formatContextForAI(context) {
  let contextStr = "\n\n--- CURRENT CINNECT DATA ---\n";

  if (context.trendingMovies?.length > 0) {
    contextStr += "\n[TRENDING] Trending Movies This Week:\n";
    context.trendingMovies.forEach((movie, i) => {
      contextStr += `${i + 1}. ${movie.title} (${movie.releaseDate?.split("-")[0] || "N/A"}) - Rating: ${movie.rating?.toFixed(1) || "N/A"}\n`;
    });
  }

  if (context.trendingTV?.length > 0) {
    contextStr += "\n[TRENDING] Trending TV Shows This Week:\n";
    context.trendingTV.forEach((show, i) => {
      contextStr += `${i + 1}. ${show.title} (${show.releaseDate?.split("-")[0] || "N/A"}) - Rating: ${show.rating?.toFixed(1) || "N/A"}\n`;
    });
  }

  if (context.upcomingMovies?.length > 0) {
    contextStr += "\n[UPCOMING] Upcoming Movies:\n";
    context.upcomingMovies.forEach((movie, i) => {
      contextStr += `${i + 1}. ${movie.title} - Releasing: ${movie.releaseDate || "TBA"}\n`;
    });
  }

  if (context.nowPlaying?.length > 0) {
    contextStr += "\n[NOW PLAYING] Now Playing in Theaters:\n";
    context.nowPlaying.forEach((movie, i) => {
      contextStr += `${i + 1}. ${movie.title} - Rating: ${movie.rating?.toFixed(1) || "N/A"}\n`;
    });
  }

  if (context.searchedMovies?.length > 0) {
    contextStr += "\n[SEARCH] Relevant Movies Found:\n";
    context.searchedMovies.forEach((movie, i) => {
      contextStr += `${i + 1}. ${movie.title} (${movie.releaseDate?.split("-")[0] || "N/A"}) - Rating: ${movie.rating?.toFixed(1) || "N/A"} - ${movie.overview?.slice(0, 100) || "No description"}...\n`;
    });
  }

  if (context.searchedTV?.length > 0) {
    contextStr += "\n[SEARCH] Relevant TV Shows Found:\n";
    context.searchedTV.forEach((show, i) => {
      contextStr += `${i + 1}. ${show.title} (${show.releaseDate?.split("-")[0] || "N/A"}) - Rating: ${show.rating?.toFixed(1) || "N/A"} - ${show.overview?.slice(0, 100) || "No description"}...\n`;
    });
  }

  if (context.searchedPerson?.length > 0) {
    contextStr += "\n[PEOPLE] People Found:\n";
    context.searchedPerson.forEach((person, i) => {
      contextStr += `${i + 1}. ${person.name} - Known for: ${person.knownForDepartment || "Acting"}\n`;
    });
  }

  return contextStr === "\n\n--- CURRENT CINNECT DATA ---\n" ? "" : contextStr;
}

// ────────────────────────────────────────────────────────────────────────────
// Tool definitions for Gemini function-calling
// ────────────────────────────────────────────────────────────────────────────
const tools = [
  {
    functionDeclarations: [
      // ── Existing tools (unchanged) ──────────────────────────────────────
      {
        name: "searchCommunitiesByTopic",
        description:
          "Search Cinnect communities by topic. Use when the user asks about communities, groups, or fan clubs on the platform.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description:
                "The topic to search for (e.g. 'Marvel', 'anime', 'Game of Thrones').",
            },
          },
          required: ["topic"],
        },
      },
      {
        name: "getMovieDetails",
        description:
          "Get detailed information about a specific movie or TV show from TMDB. Use when the user asks for specific details about a title.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The title of the movie or TV show to look up.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "searchReviewsAndPosts",
        description:
          "Search Cinnect user reviews and community posts about a movie, show, or topic. Use when the user asks what people think, what fans are saying, or asks for opinions/discussions from the platform.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The search query describing what the user wants to know about (e.g. 'Interstellar opinions', 'Loki fan reactions').",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "getTrendingPosts",
        description:
          "Get the currently trending / most popular posts across all Cinnect communities. Use when the user asks for trending discussions, popular posts, hot topics, or what people are talking about on the platform.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of posts to return (default 5, max 10).",
            },
          },
        },
      },
      {
        name: "searchPostsByTopic",
        description:
          "Search Cinnect community posts by a keyword or topic. Use when the user asks to find posts, discussions, or threads about a specific subject.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description:
                "The topic or keyword to search posts for (e.g. 'Marvel', 'best horror scenes', 'Dune review').",
            },
          },
          required: ["topic"],
        },
      },

      // ── New tools ────────────────────────────────────────────────────────
      {
        name: "getTrendingContent",
        description:
          "Get trending movies and/or TV shows from TMDB. Use when the user asks what is trending, hot, or popular right now. Prefer this over getPopularMovies when the user says 'trending'.",
        parameters: {
          type: "object",
          properties: {
            mediaType: {
              type: "string",
              description: "Type of content: 'movie', 'tv', or 'all'. Defaults to 'all'.",
            },
            timeWindow: {
              type: "string",
              description: "Time window: 'day' or 'week'. Defaults to 'week'.",
            },
          },
        },
      },
      {
        name: "getPopularMovies",
        description:
          "Get currently popular movies from TMDB. Use when the user asks for popular movies, what movies everyone is watching, or wants a general list of movies to watch.",
        parameters: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
        },
      },
      {
        name: "getTopRatedMovies",
        description:
          "Get the highest-rated movies of all time from TMDB. Use when the user asks for the best movies, all-time classics, or top-rated films.",
        parameters: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
        },
      },
      {
        name: "searchMovies",
        description:
          "Search for movies by title on TMDB. Use when the user asks to find or search for a specific movie by name.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The movie title or keywords to search for.",
            },
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "getMovieById",
        description:
          "Get full details of a specific movie by its TMDB ID. Use when you already know the TMDB movie ID.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The TMDB movie ID.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "discoverMovies",
        description:
          "Discover and filter movies by genre, year, language, rating, or sort order. Use when the user wants to find movies matching specific criteria like 'sci-fi movies from 2023' or 'action movies rated above 7'.",
        parameters: {
          type: "object",
          properties: {
            genres: {
              type: "string",
              description: "Comma-separated genre IDs (e.g. '28,12' for Action, Adventure). Common IDs: Action=28, Comedy=35, Drama=18, Horror=27, Sci-Fi=878, Romance=10749, Thriller=53, Animation=16, Documentary=99.",
            },
            year: {
              type: "string",
              description: "Release year to filter by (e.g. '2023').",
            },
            minRating: {
              type: "string",
              description: "Minimum vote average (e.g. '7' for 7+).",
            },
            maxRating: {
              type: "string",
              description: "Maximum vote average (e.g. '10').",
            },
            sortBy: {
              type: "string",
              description: "Sort order: 'popularity.desc', 'vote_average.desc', 'release_date.desc', 'revenue.desc'. Defaults to 'popularity.desc'.",
            },
            language: {
              type: "string",
              description: "Language code (e.g. 'hi' for Hindi, 'en' for English, 'ko' for Korean).",
            },
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
        },
      },
      {
        name: "getPopularTVShows",
        description:
          "Get currently popular TV shows from TMDB. Use when the user asks for popular series, what shows everyone is watching, or wants a list of TV shows.",
        parameters: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
        },
      },
      {
        name: "getTopRatedTVShows",
        description:
          "Get the highest-rated TV shows of all time from TMDB. Use when the user asks for the best TV series, top-rated shows, or all-time great television.",
        parameters: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
        },
      },
      {
        name: "searchTVShows",
        description:
          "Search for TV shows by title on TMDB. Use when the user asks to find or search for a specific TV series by name.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The TV show title or keywords to search for.",
            },
            page: {
              type: "number",
              description: "Page number (default 1).",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "getTVShowById",
        description:
          "Get full details of a specific TV show by its TMDB ID. Use when you already know the TMDB TV show ID.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The TMDB TV show ID.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "searchMultiContent",
        description:
          "Search across movies, TV shows, and people simultaneously on TMDB. Use when the user searches for a person (actor, director) by name, or when you're unsure if they mean a movie or TV show.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (person name, movie/show title, or general term).",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "getPersonById",
        description:
          "Get detailed information about an actor, director, or other film industry person by their TMDB ID. Use after searchMultiContent to get full details about a specific person.",
        parameters: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The TMDB person ID.",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "getCommunities",
        description:
          "Browse all public communities on Cinnect. Use when the user wants to see a list of communities, browse by category, or find popular communities.",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Filter by category (e.g. 'movies', 'tv', 'anime', 'general').",
            },
            sort: {
              type: "string",
              description: "Sort order: 'popular', 'recent', or 'members'. Defaults to 'popular'.",
            },
            limit: {
              type: "number",
              description: "Number of communities to return (default 10).",
            },
          },
        },
      },
      {
        name: "getCommunityPosts",
        description:
          "Get posts from a specific Cinnect community by its slug. Use when the user asks what people are posting in a specific community.",
        parameters: {
          type: "object",
          properties: {
            slug: {
              type: "string",
              description: "The community slug (URL-friendly name, e.g. 'marvel-fans').",
            },
            sort: {
              type: "string",
              description: "Sort order: 'recent', 'popular', or 'hot'. Defaults to 'hot'.",
            },
            limit: {
              type: "number",
              description: "Number of posts to return (default 5).",
            },
          },
          required: ["slug"],
        },
      },
      {
        name: "getReviews",
        description:
          "Get Cinnect user reviews for a specific movie or TV show by its TMDB media ID. Use when the user asks for reviews or ratings of a specific title on the platform.",
        parameters: {
          type: "object",
          properties: {
            mediaId: {
              type: "string",
              description: "The TMDB ID of the movie or TV show.",
            },
            mediaType: {
              type: "string",
              description: "Type of media: 'movie' or 'tv'.",
            },
            limit: {
              type: "number",
              description: "Number of reviews to return (default 5).",
            },
          },
          required: ["mediaId", "mediaType"],
        },
      },
      {
        name: "getLeaderboard",
        description:
          "Get the top users on Cinnect ranked by points. Use when the user asks about the leaderboard, top contributors, most active users, or who has the most points.",
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of users to return (default 10).",
            },
          },
        },
      },
      {
        name: "searchUsers",
        description:
          "Search for Cinnect users by username or display name. Use when the user asks to find a specific user on the platform. Only returns public profile information.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The username or display name to search for.",
            },
            limit: {
              type: "number",
              description: "Number of results to return (default 5).",
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Tool execution handlers
// ────────────────────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    // ── Existing tools ──────────────────────────────────────────────────────
    case "searchCommunitiesByTopic": {
      const communities = await searchCommunitiesByTopic(args.topic);
      return JSON.stringify(communities);
    }

    case "getMovieDetails": {
      const [movieResults, tvResults] = await Promise.all([
        tmdbService.searchMovies(args.query).catch(() => ({ results: [] })),
        tmdbService.searchTV(args.query).catch(() => ({ results: [] })),
      ]);
      const results = {
        movies: movieResults.results?.slice(0, 3) || [],
        tvShows: tvResults.results?.slice(0, 3) || [],
      };
      return JSON.stringify(results);
    }

    case "searchReviewsAndPosts": {
      const ragContext = await retrieveRAGContext(args.query);
      return ragContext || "No reviews or posts found for this topic on Cinnect.";
    }

    case "getTrendingPosts": {
      const posts = await getTrendingPosts(args.limit || 5);
      return JSON.stringify(posts);
    }

    case "searchPostsByTopic": {
      const posts = await searchPostsByTopic(args.topic);
      return JSON.stringify(posts);
    }

    // ── New tools ────────────────────────────────────────────────────────────
    case "getTrendingContent": {
      const mediaType = args.mediaType || "all";
      const timeWindow = args.timeWindow || "week";
      // getTrending returns a formatted array directly
      const results = await tmdbService.getTrending(mediaType, timeWindow).catch(() => []);
      const list = Array.isArray(results) ? results : [];
      return JSON.stringify(list.slice(0, 10).map(m => ({
        id: m.id,
        type: m.mediaType,
        title: m.title,
        year: m.releaseDate?.split("-")[0],
        rating: m.rating?.toFixed ? m.rating.toFixed(1) : m.rating,
        overview: m.overview?.slice(0, 150),
      })));
    }

    case "getPopularMovies": {
      // getPopular returns { results: formattedArray } with releaseDate, rating already set
      const data = await tmdbService.getPopular(args.page || 1).catch(() => ({ results: [] }));
      const movies = (data?.results || []).slice(0, 10).map(m => ({
        id: m.id,
        title: m.title,
        year: m.releaseDate?.split("-")[0],
        rating: m.rating?.toFixed ? m.rating.toFixed(1) : m.rating,
        overview: m.overview?.slice(0, 150),
      }));
      return JSON.stringify(movies);
    }

    case "getTopRatedMovies": {
      const data = await tmdbService.getTopRated(args.page || 1).catch(() => ({ results: [] }));
      const movies = (data?.results || []).slice(0, 10).map(m => ({
        id: m.id,
        title: m.title,
        year: m.releaseDate?.split("-")[0],
        rating: m.rating?.toFixed ? m.rating.toFixed(1) : m.rating,
        overview: m.overview?.slice(0, 150),
      }));
      return JSON.stringify(movies);
    }

    case "searchMovies": {
      const data = await tmdbService.searchMovies(args.query, args.page || 1).catch(() => ({ results: [] }));
      const movies = (data?.results || []).slice(0, 8).map(m => ({
        id: m.id,
        title: m.title,
        year: m.releaseDate?.split("-")[0],
        rating: m.rating?.toFixed ? m.rating.toFixed(1) : m.rating,
        overview: m.overview?.slice(0, 150),
      }));
      return JSON.stringify(movies);
    }

    case "getMovieById": {
      // getMovieDetails returns formatMovieDetails output: releaseDate, rating, cast[], crew[]
      const movie = await tmdbService.getMovieDetails(args.id).catch(() => null);
      if (!movie) return JSON.stringify({ error: "Movie not found" });
      return JSON.stringify({
        id: movie.id,
        title: movie.title,
        year: movie.releaseDate?.split("-")[0],
        rating: movie.rating?.toFixed ? movie.rating.toFixed(1) : movie.rating,
        overview: movie.overview,
        genres: movie.genres?.map(g => g.name),
        runtime: movie.runtime,
        director: movie.crew?.find(c => c.job === "Director")?.name,
        cast: movie.cast?.slice(0, 5).map(c => c.name),
        tagline: movie.tagline,
        status: movie.status,
      });
    }

    case "discoverMovies": {
      const filters = {
        page: args.page || 1,
        genres: args.genres || null,
        year: args.year || null,
        language: args.language || null,
        sortBy: args.sortBy || "popularity.desc",
        minRating: args.minRating || null,
        maxRating: args.maxRating || null,
      };
      const data = await tmdbService.discoverMovies(filters).catch(() => ({ results: [] }));
      const movies = (data?.results || []).slice(0, 10).map(m => ({
        id: m.id,
        title: m.title,
        year: m.releaseDate?.split("-")[0],
        rating: m.rating?.toFixed ? m.rating.toFixed(1) : m.rating,
        overview: m.overview?.slice(0, 150),
      }));
      return JSON.stringify(movies);
    }

    case "getPopularTVShows": {
      // getPopularTV returns { results: formattedArray } with releaseDate (= first_air_date), rating
      const data = await tmdbService.getPopularTV(args.page || 1).catch(() => ({ results: [] }));
      const shows = (data?.results || []).slice(0, 10).map(s => ({
        id: s.id,
        title: s.title,
        year: s.releaseDate?.split("-")[0],
        rating: s.rating?.toFixed ? s.rating.toFixed(1) : s.rating,
        overview: s.overview?.slice(0, 150),
      }));
      return JSON.stringify(shows);
    }

    case "getTopRatedTVShows": {
      const data = await tmdbService.getTopRatedTV(args.page || 1).catch(() => ({ results: [] }));
      const shows = (data?.results || []).slice(0, 10).map(s => ({
        id: s.id,
        title: s.title,
        year: s.releaseDate?.split("-")[0],
        rating: s.rating?.toFixed ? s.rating.toFixed(1) : s.rating,
        overview: s.overview?.slice(0, 150),
      }));
      return JSON.stringify(shows);
    }

    case "searchTVShows": {
      const data = await tmdbService.searchTV(args.query, args.page || 1).catch(() => ({ results: [] }));
      const shows = (data?.results || []).slice(0, 8).map(s => ({
        id: s.id,
        title: s.title,
        year: s.releaseDate?.split("-")[0],
        rating: s.rating?.toFixed ? s.rating.toFixed(1) : s.rating,
        overview: s.overview?.slice(0, 150),
      }));
      return JSON.stringify(shows);
    }

    case "getTVShowById": {
      // getTVDetails returns formatTVDetails: title, firstAirDate, numberOfSeasons, numberOfEpisodes, cast[]
      const show = await tmdbService.getTVDetails(args.id).catch(() => null);
      if (!show) return JSON.stringify({ error: "TV show not found" });
      return JSON.stringify({
        id: show.id,
        title: show.title,
        year: show.firstAirDate?.split("-")[0],
        rating: show.rating?.toFixed ? show.rating.toFixed(1) : show.rating,
        overview: show.overview,
        genres: show.genres?.map(g => g.name),
        seasons: show.numberOfSeasons,
        episodes: show.numberOfEpisodes,
        status: show.status,
        cast: show.cast?.slice(0, 5).map(c => c.name),
        tagline: show.tagline,
      });
    }

    case "searchMultiContent": {
      // searchMulti returns formatted results: mediaType, title, releaseDate, rating, knownFor
      const data = await tmdbService.searchMulti(args.query).catch(() => ({ results: [] }));
      const results = (data?.results || []).slice(0, 8).map(item => ({
        id: item.id,
        type: item.mediaType,
        title: item.title,
        year: item.releaseDate?.split("-")[0],
        rating: item.rating?.toFixed ? item.rating.toFixed(1) : item.rating,
        overview: item.overview?.slice(0, 120),
        knownFor: item.knownFor, // for person results
      }));
      return JSON.stringify(results);
    }

    case "getPersonById": {
      // getPersonDetails returns formatPersonDetails: knownForDepartment, movieCredits, tvCredits
      const person = await tmdbService.getPersonDetails(args.id).catch(() => null);
      if (!person) return JSON.stringify({ error: "Person not found" });
      const topMovies = (person.movieCredits?.cast || []).slice(0, 5).map(c => ({
        title: c.title,
        year: c.releaseDate?.split("-")[0],
        type: "movie",
      }));
      const topTV = (person.tvCredits?.cast || []).slice(0, 3).map(c => ({
        title: c.title,
        year: c.firstAirDate?.split("-")[0],
        type: "tv",
      }));
      return JSON.stringify({
        id: person.id,
        name: person.name,
        knownFor: person.knownForDepartment,
        biography: person.biography?.slice(0, 400),
        birthday: person.birthday,
        placeOfBirth: person.placeOfBirth,
        popularity: person.popularity?.toFixed ? person.popularity.toFixed(1) : person.popularity,
        knownForWorks: [...topMovies, ...topTV],
      });
    }

    case "getCommunities": {
      await connectDB();
      const query = { isActive: true };
      if (args.category && args.category !== "all") query.category = args.category;
      const limit = Math.min(args.limit || 10, 15);
      let sort = { postCount: -1, memberCount: -1 };
      if (args.sort === "recent") sort = { createdAt: -1 };
      if (args.sort === "members") sort = { memberCount: -1 };
      const communities = await Community.find(query)
        .select("name slug description category memberCount postCount icon")
        .sort(sort)
        .limit(limit)
        .lean();
      return JSON.stringify(communities);
    }

    case "getCommunityPosts": {
      await connectDB();
      const community = await Community.findOne({ slug: args.slug }).lean();
      if (!community) return JSON.stringify({ error: "Community not found" });
      if (community.isPrivate) return JSON.stringify({ error: "Cannot retrieve posts from a private community" });

      const limit = Math.min(args.limit || 5, 10);
      const posts = await Post.find({ community: community._id, isApproved: true })
        .populate("user", "username fullName")
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title content createdAt likes comments")
        .lean();
      return JSON.stringify(posts.map(p => ({
        title: p.title,
        content: p.content?.slice(0, 200),
        author: p.user?.username,
        likes: p.likes?.length || 0,
        comments: p.comments?.length || 0,
        createdAt: p.createdAt,
      })));
    }

    case "getReviews": {
      await connectDB();
      const query = { mediaId: args.mediaId, mediaType: args.mediaType };
      const limit = Math.min(args.limit || 5, 10);
      const reviews = await Review.find(query)
        .populate("user", "username fullName")
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("title content rating spoiler createdAt mediaTitle")
        .lean();
      return JSON.stringify(reviews.map(r => ({
        title: r.title,
        content: r.content?.slice(0, 300),
        rating: r.rating,
        author: r.user?.username,
        spoiler: r.spoiler,
        createdAt: r.createdAt,
      })));
    }

    case "getLeaderboard": {
      await connectDB();
      const limit = Math.min(args.limit || 10, 20);
      const users = await User.find()
        .select("username fullName avatar points level achievements")
        .sort({ "points.total": -1, points: -1 })
        .limit(limit)
        .lean();
      return JSON.stringify(users.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        fullName: u.fullName,
        points: u.points?.total || u.points || 0,
        level: u.level,
      })));
    }

    case "searchUsers": {
      await connectDB();
      const limit = Math.min(args.limit || 5, 10);
      const regex = { $regex: args.query, $options: "i" };
      const users = await User.find({
        $or: [{ username: regex }, { fullName: regex }],
      })
        .select("username fullName avatar bio points level")
        .limit(limit)
        .lean();
      return JSON.stringify(users.map(u => ({
        username: u.username,
        fullName: u.fullName,
        bio: u.bio?.slice(0, 100),
        points: u.points?.total || u.points || 0,
        level: u.level,
      })));
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: extract text from a Gemini result without triggering the
// "non-text parts" warning that the .text getter emits.
// ────────────────────────────────────────────────────────────────────────────
function extractText(result) {
  const parts = result.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

// ────────────────────────────────────────────────────────────────────────────
// POST handler
// ────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Fetch TMDB context (existing logic)
    const contextData = await fetchContextData(message);
    const contextStr = formatContextForAI(contextData);

    // Build contents (chat-style memory)
    const contents = [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: "model",
        parts: [
          {
            text: "Understood! I'm C.A.S.T, ready to help you explore movies and TV shows.",
          },
        ],
      },
      ...conversationHistory
        .filter((msg) => msg.content && msg.content.trim() !== "")
        .map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
      {
        role: "user",
        parts: [
          {
            text: contextStr
              ? `${message}\n${contextStr}`
              : message,
          },
        ],
      },
    ];

    // ── First call: let the LLM decide whether to call tools ──
    let result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        tools,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    // ── Agentic loop: keep handling tool calls until the model returns text ──
    const MAX_TOOL_ROUNDS = 5;
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      // Read parts directly — never use the .text getter here to avoid the
      // "non-text parts" warning when functionCall parts are present.
      const parts = result.candidates?.[0]?.content?.parts || [];
      const functionCalls = parts.filter((p) => p.functionCall);

      if (functionCalls.length === 0) break; // No tool calls → go to text response

      // Execute every requested tool for this round
      const toolResultParts = [];
      for (const fc of functionCalls) {
        const output = await executeTool(fc.functionCall.name, fc.functionCall.args);
        toolResultParts.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: { result: output },
          },
        });
      }

      // Append the model's tool-call turn (only functionCall parts, never empty/undefined)
      contents.push({
        role: "model",
        parts: functionCalls.map((fc) => ({ functionCall: fc.functionCall })),
      });

      // Append the tool results as a user turn
      contents.push({
        role: "user",
        parts: toolResultParts,
      });

      // Call the model again with the updated conversation
      result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          tools,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });
    }

    // Extract the final text response from parts directly (avoids the .text warning)
    const responseText = extractText(result);

    return NextResponse.json({
      message: responseText,
      context: Object.keys(contextData).length ? contextData : null,
    });
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return NextResponse.json(
      { error: "Failed to process your request." },
      { status: 500 }
    );
  }
}