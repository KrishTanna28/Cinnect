import { cookies } from "next/headers"
import { 
  getPopular, 
  getPopularTV, 
  getTopRated, 
  getTopRatedTV,
  getTrending,
  getNowPlaying,
  getUpcoming,
  getAiringTodayTV,
  getOnTheAirTV,
  getMoviesByGenre,
  getTVByGenre,
  getCriticallyAcclaimed,
  getHiddenGems,
  getDocumentaries,
  getTrendingMovies,
  getTrendingTV,
  getNewReleases,
  getFeelGoodMovies,
  getMindBendingMovies,
  getBingeWorthyTV,
  getAnime,
  getAnimeTV,
  getCrimeDramas,
  getBasedOnTrueStory,
  getMovieDetails,
  getTVDetails,
} from "@/lib/services/tmdb.service.js"
import { searchNews } from "@/lib/news.service.js"
import { verifyAccessToken, verifyRefreshToken } from "@/lib/utils/jwt"
import connectDB from "@/lib/config/database.js"
import Review from "@/lib/models/Review.js"
import { getLeaderboardPage } from "@/lib/utils/ranking.js"
import HomeClient from "@/components/home-client"
import LandingPage from "@/components/landing-page"
import { HomeSkeleton } from "@/components/skeletons"

// Metadata for SEO
export const metadata = {
  title: "Home - Cinnect | Discover Movies & TV Shows",
  description: "Discover and explore popular movies, top-rated TV shows, and trending content on Cinnect. Where cinema connects people.",
}

function hasValidSession(authToken, refreshToken) {
  if (!process.env.JWT_SECRET) {
    return !!(authToken || refreshToken)
  }

  if (authToken) {
    try {
      verifyAccessToken(authToken)
      return true
    } catch {}
  }

  if (refreshToken) {
    try {
      verifyRefreshToken(refreshToken)
      return true
    } catch {}
  }

  return false
}

function createMediaLookup(items = []) {
  const lookup = new Map()
  items.forEach((item) => {
    if (!item?.id || !item?.mediaType) return
    lookup.set(`${item.mediaType}:${String(item.id)}`, {
      poster: item.poster || null,
      releaseDate: item.releaseDate || null,
    })
  })
  return lookup
}

function mergeUniqueMedia(...groups) {
  const merged = []
  const seen = new Set()

  groups.flat().forEach((item) => {
    if (!item?.id) return
    const mediaType = item.mediaType || (item.title ? 'movie' : 'tv')
    const key = `${mediaType}:${String(item.id)}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push(item)
  })

  return merged
}

async function getLandingCommunityData(mediaLookup) {
  try {
    await connectDB()

    const [topReviewIds, leaderboard] = await Promise.all([
      Review.aggregate([
        { $match: { isRemoved: { $ne: true } } },
        { $addFields: { likesCount: { $size: { $ifNull: ["$likes", []] } } } },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $limit: 5 },
        { $project: { _id: 1, likesCount: 1 } },
      ]),
      getLeaderboardPage({ page: 1, limit: 5 }),
    ])

    const idOrder = topReviewIds.map((entry) => String(entry._id))
    const likesById = new Map(topReviewIds.map((entry) => [String(entry._id), entry.likesCount || 0]))

    const reviewDocs = idOrder.length
      ? await Review.find({ _id: { $in: idOrder } })
          .select("_id mediaId mediaType mediaTitle rating content user createdAt")
          .populate("user", "username avatar fullName")
          .lean()
      : []

    const reviewDocById = new Map(reviewDocs.map((doc) => [String(doc._id), doc]))

    const communityReviews = idOrder
      .map((id) => {
        const doc = reviewDocById.get(id)
        if (!doc) return null

        const mediaMeta = mediaLookup.get(`${doc.mediaType}:${String(doc.mediaId)}`) || {}
        return {
          _id: id,
          mediaId: doc.mediaId,
          mediaType: doc.mediaType,
          mediaTitle: doc.mediaTitle,
          rating: doc.rating,
          excerpt: `${(doc.content || "").slice(0, 140)}${(doc.content || "").length > 140 ? "..." : ""}`,
          likesCount: likesById.get(id) || 0,
          poster: mediaMeta.poster || null,
          releaseYear: mediaMeta.releaseDate ? String(mediaMeta.releaseDate).split("-")[0] : null,
          username: doc.user?.username || "cinephile",
          userId: doc.user?._id ? String(doc.user._id) : null,
        }
      })
      .filter(Boolean)

    // Fallback poster lookup for reviews whose media is not in the preloaded lists.
    const enrichedCommunityReviews = await Promise.all(
      communityReviews.map(async (review) => {
        if (review.poster || !review.mediaId) {
          return review
        }

        try {
          if (review.mediaType === "tv") {
            const tv = await getTVDetails(review.mediaId)
            return {
              ...review,
              poster: tv?.poster || review.poster,
              releaseYear: review.releaseYear || (tv?.firstAirDate ? String(tv.firstAirDate).split("-")[0] : null),
            }
          }

          const movie = await getMovieDetails(review.mediaId)
          return {
            ...review,
            poster: movie?.poster || review.poster,
            releaseYear: review.releaseYear || (movie?.releaseDate ? String(movie.releaseDate).split("-")[0] : null),
          }
        } catch {
          return review
        }
      })
    )

    const topReviewers = (leaderboard?.users || []).map((reviewer) => ({
      _id: String(reviewer._id),
      username: reviewer.username,
      fullName: reviewer.fullName,
      avatar: reviewer.avatar,
      stats: reviewer.stats,
    }))

    return { communityReviews: enrichedCommunityReviews, topReviewers }
  } catch {
    return { communityReviews: [], topReviewers: [] }
  }
}

// This is now a Server Component - data fetching happens on the server
export default async function Home() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth_token")?.value || null
  const refreshToken = cookieStore.get("refresh_token")?.value || null
  const isAuthenticated = hasValidSession(authToken, refreshToken)

  if (!isAuthenticated) {
    const [
      trendingData,
      popularMoviesData,
      popularMoviesDataPage2,
      popularTVData,
      popularTVDataPage2,
      topRatedMoviesData,
      topRatedMoviesDataPage2,
      newReleasesData,
      newReleasesDataPage2,
      landingNewsData,
    ] = await Promise.all([
      getTrending('all', 'day').catch(() => []),
      getPopular(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
      getPopular(2).catch(() => ({ results: [], page: 2, totalPages: 2 })),
      getPopularTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
      getPopularTV(2).catch(() => ({ results: [], page: 2, totalPages: 2 })),
      getTopRated(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
      getTopRated(2).catch(() => ({ results: [], page: 2, totalPages: 2 })),
      getNewReleases(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
      getNewReleases(2).catch(() => ({ results: [], page: 2, totalPages: 2 })),
      searchNews('movie', 1).catch(() => ({ articles: [], hasMore: false })),
    ])

    const fallbackFeatured = [...(popularMoviesData?.results || []), ...(popularTVData?.results || [])]
    const featuredItems = (trendingData?.length ? trendingData : fallbackFeatured)
      .filter((item) => item?.backdrop || item?.poster)
      .slice(0, 10)

    const mediaLookup = createMediaLookup([
      ...featuredItems,
      ...(topRatedMoviesData?.results || []).slice(0, 14),
      ...(topRatedMoviesDataPage2?.results || []).slice(0, 14),
      ...(newReleasesData?.results || []).slice(0, 14),
      ...(newReleasesDataPage2?.results || []).slice(0, 14),
      ...(popularMoviesData?.results || []).slice(0, 14),
      ...(popularMoviesDataPage2?.results || []).slice(0, 14),
      ...(popularTVData?.results || []).slice(0, 14),
      ...(popularTVDataPage2?.results || []).slice(0, 14),
    ])

    const trendingMixed = mergeUniqueMedia(
      featuredItems,
      popularMoviesData?.results || [],
      popularMoviesDataPage2?.results || [],
      popularTVData?.results || [],
      popularTVDataPage2?.results || []
    ).filter((item) => item?.poster)

    const audienceFavorites = mergeUniqueMedia(
      topRatedMoviesData?.results || [],
      topRatedMoviesDataPage2?.results || [],
      popularTVData?.results || [],
      popularTVDataPage2?.results || []
    ).filter((item) => item?.poster)

    const freshDrops = mergeUniqueMedia(
      newReleasesData?.results || [],
      newReleasesDataPage2?.results || [],
      popularMoviesData?.results || [],
      popularMoviesDataPage2?.results || []
    ).filter((item) => item?.poster)

    const curatedLists = [
      {
        title: "Trending Across Genres",
        itemCount: trendingMixed.length,
        items: trendingMixed.slice(0, 12),
      },
      {
        title: "Audience Favorites",
        itemCount: audienceFavorites.length,
        items: audienceFavorites.slice(0, 12),
      },
      {
        title: "Fresh Drops",
        itemCount: freshDrops.length,
        items: freshDrops.slice(0, 12),
      },
    ].filter((list) => list.items.length > 0)

    const { communityReviews, topReviewers } = await getLandingCommunityData(mediaLookup)

    return (
      <LandingPage
        featuredItems={featuredItems}
        news={landingNewsData?.articles || []}
        communityReviews={communityReviews}
        curatedLists={curatedLists}
        topReviewers={topReviewers}
      />
    )
  }

  // Fetch all data in parallel on the server using tmdbService directly
  const [
    popularMoviesData,
    popularTVData,
    topRatedMoviesData,
    topRatedTVData,
    trendingData,
    nowPlayingData,
    upcomingData,
    airingTodayData,
    onTheAirData,
    // Genre-based content
    actionMoviesData,
    comedyMoviesData,
    horrorMoviesData,
    sciFiMoviesData,
    dramaMoviesData,
    romanceMoviesData,
    thrillerMoviesData,
    animationMoviesData,
    // TV genres
    dramaTVData,
    comedyTVData,
    sciFiTVData,
    // Special categories
    criticallyAcclaimedData,
    hiddenGemsData,
    documentariesData,
    trendingMoviesData,
    trendingTVData,
    newReleasesData,
    feelGoodData,
    mindBendingData,
    bingeWorthyData,
    animeMoviesData,
    animeTVData,
    crimeDramasData,
    trueStoryData,
  ] = await Promise.all([
    getPopular(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getPopularTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTopRated(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTopRatedTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTrending('all', 'day').catch(() => []),
    getNowPlaying(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getUpcoming(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getAiringTodayTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getOnTheAirTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    // Genre IDs: Action=28, Comedy=35, Horror=27, Sci-Fi=878, Drama=18, Romance=10749, Thriller=53, Animation=16
    getMoviesByGenre(28, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(35, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(27, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(878, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(18, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(10749, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(53, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMoviesByGenre(16, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    // TV genres: Drama=18, Comedy=35, Sci-Fi=10765
    getTVByGenre(18, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTVByGenre(35, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTVByGenre(10765, 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    // Special categories
    getCriticallyAcclaimed(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getHiddenGems(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getDocumentaries(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTrendingMovies('day', 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getTrendingTV('day', 1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getNewReleases(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getFeelGoodMovies(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getMindBendingMovies(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getBingeWorthyTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getAnime(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getAnimeTV(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getCrimeDramas(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
    getBasedOnTrueStory(1).catch(() => ({ results: [], page: 1, totalPages: 1 })),
  ])

  // Prepare initial data for client component
  const initialData = {
    // Basic categories
    popularMovies: popularMoviesData?.results || [],
    popularTV: popularTVData?.results || [],
    topRatedMovies: topRatedMoviesData?.results || [],
    topRatedTV: topRatedTVData?.results || [],
    trending: trendingData || [],
    nowPlaying: nowPlayingData?.results || [],
    upcoming: upcomingData?.results || [],
    airingToday: airingTodayData?.results || [],
    onTheAir: onTheAirData?.results || [],
    featuredItems: (trendingData || popularMoviesData?.results || []).slice(0, 10),
    
    // Genre-based movies
    actionMovies: actionMoviesData?.results || [],
    comedyMovies: comedyMoviesData?.results || [],
    horrorMovies: horrorMoviesData?.results || [],
    sciFiMovies: sciFiMoviesData?.results || [],
    dramaMovies: dramaMoviesData?.results || [],
    romanceMovies: romanceMoviesData?.results || [],
    thrillerMovies: thrillerMoviesData?.results || [],
    animationMovies: animationMoviesData?.results || [],
    
    // Genre-based TV
    dramaTV: dramaTVData?.results || [],
    comedyTV: comedyTVData?.results || [],
    sciFiTV: sciFiTVData?.results || [],
    
    // Special categories
    criticallyAcclaimed: criticallyAcclaimedData?.results || [],
    hiddenGems: hiddenGemsData?.results || [],
    documentaries: documentariesData?.results || [],
    trendingMovies: trendingMoviesData?.results || [],
    trendingTV: trendingTVData?.results || [],
    newReleases: newReleasesData?.results || [],
    feelGoodMovies: feelGoodData?.results || [],
    mindBendingMovies: mindBendingData?.results || [],
    bingeWorthyTV: bingeWorthyData?.results || [],
    animeMovies: animeMoviesData?.results || [],
    animeTV: animeTVData?.results || [],
    crimeDramas: crimeDramasData?.results || [],
    basedOnTrueStory: trueStoryData?.results || [],
    
    hasMore: {
      popularMovies: popularMoviesData?.page < popularMoviesData?.totalPages,
      popularTV: popularTVData?.page < popularTVData?.totalPages,
      topRatedMovies: topRatedMoviesData?.page < topRatedMoviesData?.totalPages,
      topRatedTV: topRatedTVData?.page < topRatedTVData?.totalPages,
    }
  }

  return <HomeClient initialData={initialData} />
}

// Loading UI for Suspense
export function Loading() {
  return <HomeSkeleton />
}
