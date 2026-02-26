"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import RecommendationCarousel from "@/components/recommendation-carousel"
import Top10Carousel from "@/components/top10-carousel"
import { useUser } from "@/contexts/UserContext"
import * as movieAPI from "@/lib/movies"

export default function HomeClient({ initialData }) {
  // Basic categories - with state setters for load more
  const [popularMovies, setPopularMovies] = useState(initialData.popularMovies)
  const [popularTV, setPopularTV] = useState(initialData.popularTV)
  const [topRatedMovies, setTopRatedMovies] = useState(initialData.topRatedMovies)
  const [topRatedTV, setTopRatedTV] = useState(initialData.topRatedTV)
  const [featuredItems, setFeaturedItems] = useState(initialData.featuredItems)
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0)

  // Additional categories from initial data - with state setters
  const [trending, setTrending] = useState(initialData.trending || [])
  const [nowPlaying, setNowPlaying] = useState(initialData.nowPlaying || [])
  const [upcoming, setUpcoming] = useState(initialData.upcoming || [])
  const [airingToday, setAiringToday] = useState(initialData.airingToday || [])
  const [onTheAir, setOnTheAir] = useState(initialData.onTheAir || [])

  // Genre-based movies - with state setters
  const [actionMovies, setActionMovies] = useState(initialData.actionMovies || [])
  const [comedyMovies, setComedyMovies] = useState(initialData.comedyMovies || [])
  const [horrorMovies, setHorrorMovies] = useState(initialData.horrorMovies || [])
  const [sciFiMovies, setSciFiMovies] = useState(initialData.sciFiMovies || [])
  const [dramaMovies, setDramaMovies] = useState(initialData.dramaMovies || [])
  const [romanceMovies, setRomanceMovies] = useState(initialData.romanceMovies || [])
  const [thrillerMovies, setThrillerMovies] = useState(initialData.thrillerMovies || [])
  const [animationMovies, setAnimationMovies] = useState(initialData.animationMovies || [])

  // Genre-based TV - with state setters
  const [dramaTV, setDramaTV] = useState(initialData.dramaTV || [])
  const [comedyTV, setComedyTV] = useState(initialData.comedyTV || [])
  const [sciFiTV, setSciFiTV] = useState(initialData.sciFiTV || [])

  // Special categories - with state setters
  const [criticallyAcclaimed, setCriticallyAcclaimed] = useState(initialData.criticallyAcclaimed || [])
  const [hiddenGems, setHiddenGems] = useState(initialData.hiddenGems || [])
  const [documentaries, setDocumentaries] = useState(initialData.documentaries || [])
  const [trendingMovies, setTrendingMovies] = useState(initialData.trendingMovies || [])
  const [trendingTV, setTrendingTV] = useState(initialData.trendingTV || [])
  const [newReleases, setNewReleases] = useState(initialData.newReleases || [])
  const [feelGoodMovies, setFeelGoodMovies] = useState(initialData.feelGoodMovies || [])
  const [mindBendingMovies, setMindBendingMovies] = useState(initialData.mindBendingMovies || [])
  const [bingeWorthyTV, setBingeWorthyTV] = useState(initialData.bingeWorthyTV || [])
  const [animeMovies, setAnimeMovies] = useState(initialData.animeMovies || [])
  const [animeTV, setAnimeTV] = useState(initialData.animeTV || [])
  const [crimeDramas, setCrimeDramas] = useState(initialData.crimeDramas || [])
  const [basedOnTrueStory, setBasedOnTrueStory] = useState(initialData.basedOnTrueStory || [])

  // Touch handling for mobile swipe (use refs for reliable cross-event tracking)
  const touchStartRef = useRef(null)
  const touchEndRef = useRef(null)
  const swipedRef = useRef(false)

  // Pagination states for all categories
  const [pages, setPages] = useState({
    popularMovies: 1,
    popularTV: 1,
    topRatedMovies: 1,
    topRatedTV: 1,
    nowPlaying: 1,
    upcoming: 1,
    airingToday: 1,
    onTheAir: 1,
    actionMovies: 1,
    comedyMovies: 1,
    horrorMovies: 1,
    sciFiMovies: 1,
    dramaMovies: 1,
    romanceMovies: 1,
    thrillerMovies: 1,
    animationMovies: 1,
    dramaTV: 1,
    comedyTV: 1,
    sciFiTV: 1,
    criticallyAcclaimed: 1,
    hiddenGems: 1,
    documentaries: 1,
    trendingMovies: 1,
    trendingTV: 1,
    newReleases: 1,
    feelGoodMovies: 1,
    mindBendingMovies: 1,
    bingeWorthyTV: 1,
    animeMovies: 1,
    animeTV: 1,
    crimeDramas: 1,
    basedOnTrueStory: 1,
  })

  const [loadingMore, setLoadingMore] = useState({
    popularMovies: false,
    popularTV: false,
    topRatedMovies: false,
    topRatedTV: false,
    nowPlaying: false,
    upcoming: false,
    airingToday: false,
    onTheAir: false,
    actionMovies: false,
    comedyMovies: false,
    horrorMovies: false,
    sciFiMovies: false,
    dramaMovies: false,
    romanceMovies: false,
    thrillerMovies: false,
    animationMovies: false,
    dramaTV: false,
    comedyTV: false,
    sciFiTV: false,
    criticallyAcclaimed: false,
    hiddenGems: false,
    documentaries: false,
    trendingMovies: false,
    trendingTV: false,
    newReleases: false,
    feelGoodMovies: false,
    mindBendingMovies: false,
    bingeWorthyTV: false,
    animeMovies: false,
    animeTV: false,
    crimeDramas: false,
    basedOnTrueStory: false,
  })

  const [hasMore, setHasMore] = useState({
    popularMovies: initialData.hasMore?.popularMovies ?? true,
    popularTV: initialData.hasMore?.popularTV ?? true,
    topRatedMovies: initialData.hasMore?.topRatedMovies ?? true,
    topRatedTV: initialData.hasMore?.topRatedTV ?? true,
    nowPlaying: true,
    upcoming: true,
    airingToday: true,
    onTheAir: true,
    actionMovies: true,
    comedyMovies: true,
    horrorMovies: true,
    sciFiMovies: true,
    dramaMovies: true,
    romanceMovies: true,
    thrillerMovies: true,
    animationMovies: true,
    dramaTV: true,
    comedyTV: true,
    sciFiTV: true,
    criticallyAcclaimed: true,
    hiddenGems: true,
    documentaries: true,
    trendingMovies: true,
    trendingTV: true,
    newReleases: true,
    feelGoodMovies: true,
    mindBendingMovies: true,
    bingeWorthyTV: true,
    animeMovies: true,
    animeTV: true,
    crimeDramas: true,
    basedOnTrueStory: true,
  })

  const { user } = useUser()
  const isAuthenticated = !!user
  const featuredItem = featuredItems[currentFeaturedIndex] || null

  // Personalized recommendations state
  const [personalizedRecs, setPersonalizedRecs] = useState({
    recommended: [],
    becauseYouLiked: null,
    trendingInCircles: [],
    top10Movies: [],
    top10TV: [],
    country: 'US',
    countryName: 'Your Country',
  })
  const [personalizedLoaded, setPersonalizedLoaded] = useState(false)

  // Fetch personalized recommendations when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || personalizedLoaded) return

    const token = localStorage.getItem("token")
    if (!token) return

    const fetchRecs = async () => {
      try {
        // Detect user's country via IP geolocation
        let country = 'US'
        let countryName = 'Your Country'
        try {
          const geoRes = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
          if (geoRes.ok) {
            const geoData = await geoRes.json()
            if (geoData.country_code) country = geoData.country_code
            if (geoData.country_name) countryName = geoData.country_name
          }
        } catch {
          // fallback to US
        }

        const res = await fetch(`/api/recommendations/all?country=${country}&countryName=${encodeURIComponent(countryName)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setPersonalizedRecs(json.data)
          }
        }
      } catch (err) {
        console.error("Failed to fetch personalized recommendations:", err)
      } finally {
        setPersonalizedLoaded(true)
      }
    }

    fetchRecs()
  }, [isAuthenticated, personalizedLoaded])

  // Keyboard navigation for featured items
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (featuredItems.length === 0) return

      if (e.key === "ArrowRight") {
        setCurrentFeaturedIndex((prev) =>
          prev === featuredItems.length - 1 ? 0 : prev + 1
        )
      } else if (e.key === "ArrowLeft") {
        setCurrentFeaturedIndex((prev) =>
          prev === 0 ? featuredItems.length - 1 : prev - 1
        )
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [featuredItems.length])

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    touchEndRef.current = null
    swipedRef.current = false
    touchStartRef.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartRef.current === null || touchEndRef.current === null) return

    const distance = touchStartRef.current - touchEndRef.current
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && featuredItems.length > 0) {
      swipedRef.current = true
      setCurrentFeaturedIndex((prev) =>
        prev === featuredItems.length - 1 ? 0 : prev + 1
      )
    }

    if (isRightSwipe && featuredItems.length > 0) {
      swipedRef.current = true
      setCurrentFeaturedIndex((prev) =>
        prev === 0 ? featuredItems.length - 1 : prev - 1
      )
    }
  }

  // Load more functions
  const loadMorePopularMovies = async () => {
    if (loadingMore.popularMovies || !hasMore.popularMovies) return

    setLoadingMore(prev => ({ ...prev, popularMovies: true }))
    try {
      const nextPage = pages.popularMovies + 1
      const data = await movieAPI.getPopular(nextPage)

      setPopularMovies(prev => [...prev, ...(data.data?.results || [])])
      setPages(prev => ({ ...prev, popularMovies: nextPage }))
      setHasMore(prev => ({ ...prev, popularMovies: data.data?.page < data.data?.totalPages }))
    } catch (error) {
      console.error('Failed to load more popular movies:', error)
    } finally {
      setLoadingMore(prev => ({ ...prev, popularMovies: false }))
    }
  }

  const loadMorePopularTV = async () => {
    if (loadingMore.popularTV || !hasMore.popularTV) return

    setLoadingMore(prev => ({ ...prev, popularTV: true }))
    try {
      const nextPage = pages.popularTV + 1
      const data = await movieAPI.getPopularTV(nextPage)

      setPopularTV(prev => [...prev, ...(data.data?.results || [])])
      setPages(prev => ({ ...prev, popularTV: nextPage }))
      setHasMore(prev => ({ ...prev, popularTV: data.data?.page < data.data?.totalPages }))
    } catch (error) {
      console.error('Failed to load more popular TV:', error)
    } finally {
      setLoadingMore(prev => ({ ...prev, popularTV: false }))
    }
  }

  const loadMoreTopRatedMovies = async () => {
    if (loadingMore.topRatedMovies || !hasMore.topRatedMovies) return

    setLoadingMore(prev => ({ ...prev, topRatedMovies: true }))
    try {
      const nextPage = pages.topRatedMovies + 1
      const data = await movieAPI.getTopRated(nextPage)

      setTopRatedMovies(prev => [...prev, ...(data.data?.results || [])])
      setPages(prev => ({ ...prev, topRatedMovies: nextPage }))
      setHasMore(prev => ({ ...prev, topRatedMovies: data.data?.page < data.data?.totalPages }))
    } catch (error) {
      console.error('Failed to load more top rated movies:', error)
    } finally {
      setLoadingMore(prev => ({ ...prev, topRatedMovies: false }))
    }
  }

  const loadMoreTopRatedTV = async () => {
    if (loadingMore.topRatedTV || !hasMore.topRatedTV) return

    setLoadingMore(prev => ({ ...prev, topRatedTV: true }))
    try {
      const nextPage = pages.topRatedTV + 1
      const data = await movieAPI.getTopRatedTV(nextPage)

      setTopRatedTV(prev => [...prev, ...(data.data?.results || [])])
      setPages(prev => ({ ...prev, topRatedTV: nextPage }))
      setHasMore(prev => ({
        ...prev,
        topRatedTV: data.data?.page < data.data?.totalPages
      }))
    } catch (error) {
      console.error('Failed to load more top rated TV:', error)
    } finally {
      setLoadingMore(prev => ({ ...prev, topRatedTV: false }))
    }
  }

  // Generic load more function creator
  const createLoadMore = (key, apiFunction, setter) => async () => {
    if (loadingMore[key] || !hasMore[key]) return

    setLoadingMore(prev => ({ ...prev, [key]: true }))
    try {
      const nextPage = pages[key] + 1
      const data = await apiFunction(nextPage)

      setter(prev => [...prev, ...(data.data?.results || data.results || [])])
      setPages(prev => ({ ...prev, [key]: nextPage }))
      setHasMore(prev => ({
        ...prev,
        [key]: (data.data?.page || data.page || nextPage) < (data.data?.totalPages || data.totalPages || 500)
      }))
    } catch (error) {
      console.error(`Failed to load more ${key}:`, error)
    } finally {
      setLoadingMore(prev => ({ ...prev, [key]: false }))
    }
  }

  // Load more functions for all categories
  const loadMoreNowPlaying = createLoadMore('nowPlaying', movieAPI.getNowPlaying, setNowPlaying)
  const loadMoreUpcoming = createLoadMore('upcoming', movieAPI.getUpcoming, setUpcoming)
  const loadMoreAiringToday = createLoadMore('airingToday', movieAPI.getAiringTodayTV, setAiringToday)
  const loadMoreOnTheAir = createLoadMore('onTheAir', movieAPI.getOnTheAirTV, setOnTheAir)

  // Genre-based movies load more
  const loadMoreActionMovies = createLoadMore('actionMovies', (page) => movieAPI.getMoviesByGenre(28, page), setActionMovies)
  const loadMoreComedyMovies = createLoadMore('comedyMovies', (page) => movieAPI.getMoviesByGenre(35, page), setComedyMovies)
  const loadMoreHorrorMovies = createLoadMore('horrorMovies', (page) => movieAPI.getMoviesByGenre(27, page), setHorrorMovies)
  const loadMoreSciFiMovies = createLoadMore('sciFiMovies', (page) => movieAPI.getMoviesByGenre(878, page), setSciFiMovies)
  const loadMoreDramaMovies = createLoadMore('dramaMovies', (page) => movieAPI.getMoviesByGenre(18, page), setDramaMovies)
  const loadMoreRomanceMovies = createLoadMore('romanceMovies', (page) => movieAPI.getMoviesByGenre(10749, page), setRomanceMovies)
  const loadMoreThrillerMovies = createLoadMore('thrillerMovies', (page) => movieAPI.getMoviesByGenre(53, page), setThrillerMovies)
  const loadMoreAnimationMovies = createLoadMore('animationMovies', (page) => movieAPI.getMoviesByGenre(16, page), setAnimationMovies)

  // Genre-based TV load more
  const loadMoreDramaTV = createLoadMore('dramaTV', (page) => movieAPI.getTVByGenre(18, page), setDramaTV)
  const loadMoreComedyTV = createLoadMore('comedyTV', (page) => movieAPI.getTVByGenre(35, page), setComedyTV)
  const loadMoreSciFiTV = createLoadMore('sciFiTV', (page) => movieAPI.getTVByGenre(10765, page), setSciFiTV)

  // Special categories load more
  const loadMoreCriticallyAcclaimed = createLoadMore('criticallyAcclaimed', movieAPI.getCriticallyAcclaimed, setCriticallyAcclaimed)
  const loadMoreHiddenGems = createLoadMore('hiddenGems', movieAPI.getHiddenGems, setHiddenGems)
  const loadMoreDocumentaries = createLoadMore('documentaries', movieAPI.getDocumentaries, setDocumentaries)
  const loadMoreTrendingMovies = createLoadMore('trendingMovies', (page) => movieAPI.getTrendingMovies('day', page), setTrendingMovies)
  const loadMoreTrendingTV = createLoadMore('trendingTV', (page) => movieAPI.getTrendingTV('day', page), setTrendingTV)
  const loadMoreNewReleases = createLoadMore('newReleases', movieAPI.getNewReleases, setNewReleases)
  const loadMoreFeelGoodMovies = createLoadMore('feelGoodMovies', movieAPI.getFeelGoodMovies, setFeelGoodMovies)
  const loadMoreMindBendingMovies = createLoadMore('mindBendingMovies', movieAPI.getMindBendingMovies, setMindBendingMovies)
  const loadMoreBingeWorthyTV = createLoadMore('bingeWorthyTV', movieAPI.getBingeWorthyTV, setBingeWorthyTV)
  const loadMoreAnimeMovies = createLoadMore('animeMovies', movieAPI.getAnimeMovies, setAnimeMovies)
  const loadMoreAnimeTV = createLoadMore('animeTV', movieAPI.getAnimeTV, setAnimeTV)
  const loadMoreCrimeDramas = createLoadMore('crimeDramas', movieAPI.getCrimeDramas, setCrimeDramas)
  const loadMoreBasedOnTrueStory = createLoadMore('basedOnTrueStory', movieAPI.getBasedOnTrueStory, setBasedOnTrueStory)


  // Auto-rotate featured content every 5 seconds
  useEffect(() => {
    if (featuredItems.length === 0) return

    const interval = setInterval(() => {
      setCurrentFeaturedIndex((prevIndex) =>
        prevIndex === featuredItems.length - 1 ? 0 : prevIndex + 1
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [featuredItems.length])

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section - extends behind navbar */}
      {featuredItem && (
        <section
          className="relative h-[70vh] sm:h-screen flex items-end pb-16 sm:pb-32 overflow-hidden -mt-16 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
            style={{
              backgroundImage: `url('${featuredItem.backdrop}')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>

          <Link
            href={user ? featuredItem.mediaType === 'tv' ? `/tv/${featuredItem.id}` : `/movies/${featuredItem.id}` : "/login"}
            className="relative z-10 w-full cursor-pointer group"
            onClick={(e) => {
              // Prevent navigation if user was swiping
              if (swipedRef.current) {
                e.preventDefault()
                swipedRef.current = false
              }
            }}
          >
            <div className="max-w-2xl px-4 sm:px-6 lg:px-8 sm:ml-8 lg:ml-12">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase">
                  {featuredItem.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-3 sm:mb-4 text-balance leading-tight group-hover:text-primary transition-colors">{featuredItem.title}</h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-4 sm:mb-6 line-clamp-2 sm:line-clamp-3">{featuredItem.overview}</p>

              <div className="flex flex-wrap gap-2 mb-4 mt-4 sm:mt-10">
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  {featuredItem.rating?.toFixed(1)}
                </span>
                <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                  {featuredItem.releaseDate?.split('-')[0]}
                </span>
              </div>
            </div>
          </Link>

          {/* Featured navigation dots - centered across full page width */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10 mt-20">
            {featuredItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentFeaturedIndex(index)}
                className={`h-1 rounded-full transition-all ${index === currentFeaturedIndex
                  ? 'w-8 bg-primary'
                  : 'w-1 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                aria-label={`Go to featured item ${index + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ===== Personalized Carousels (Top of the list for authenticated users) ===== */}
        {isAuthenticated && personalizedLoaded && (
          <>
            {/* 1. Recommendations For You */}
            {personalizedRecs.recommended.length > 0 && (
              <RecommendationCarousel
                title="Recommendations For You"
                movies={personalizedRecs.recommended}
              />
            )}

            {/* 2. Because You Liked ... */}
            {personalizedRecs.becauseYouLiked && personalizedRecs.becauseYouLiked.items?.length > 0 && (
              <RecommendationCarousel
                title={`Because You Liked ${personalizedRecs.becauseYouLiked.anchorTitle}`}
                movies={personalizedRecs.becauseYouLiked.items}
              />
            )}

            {/* 3. Trending In Your Circle */}
            {personalizedRecs.trendingInCircles.length > 0 && (
              <RecommendationCarousel
                title="Trending In Your Circle"
                movies={personalizedRecs.trendingInCircles}
              />
            )}

            {/* 4. Top 10 Trending Movies in [Country] */}
            {personalizedRecs.top10Movies.length > 0 && (
              <Top10Carousel
                title={`Top 10 Movies in ${personalizedRecs.countryName} Today`}
                movies={personalizedRecs.top10Movies}
              />
            )}

            {/* 5. Top 10 Trending Shows in [Country] */}
            {personalizedRecs.top10TV.length > 0 && (
              <Top10Carousel
                title={`Top 10 Shows in ${personalizedRecs.countryName} Today`}
                movies={personalizedRecs.top10TV}
              />
            )}
          </>
        )}

        {/* ===== General Carousels ===== */}
        {/* Trending Today - Show to everyone */}
        {trendingMovies.length > 0 && (
          <RecommendationCarousel
            title="Trending Today"
            movies={trendingMovies}
            requireAuth={!isAuthenticated}
            onLoadMore={loadMoreTrendingMovies}
            hasMore={hasMore.trendingMovies}
            isLoadingMore={loadingMore.trendingMovies}
          />
        )}

        {popularMovies.length > 0 && (
          <RecommendationCarousel
            title="Popular Movies"
            movies={popularMovies}
            requireAuth={!isAuthenticated}
            onLoadMore={loadMorePopularMovies}
            hasMore={hasMore.popularMovies}
            isLoadingMore={loadingMore.popularMovies}
          />
        )}

        {popularTV.length > 0 && (
          <RecommendationCarousel
            title="Popular TV Shows"
            movies={popularTV}
            requireAuth={!isAuthenticated}
            onLoadMore={loadMorePopularTV}
            hasMore={hasMore.popularTV}
            isLoadingMore={loadingMore.popularTV}
          />
        )}

        {/* New Releases - Show to everyone */}
        {newReleases.length > 0 && (
          <RecommendationCarousel
            title="New Releases"
            movies={newReleases}
            requireAuth={!isAuthenticated}
            onLoadMore={loadMoreNewReleases}
            hasMore={hasMore.newReleases}
            isLoadingMore={loadingMore.newReleases}
          />
        )}

        {/* Authenticated user sections - Netflix style personalized rows */}
        {isAuthenticated && (
          <>
            {/* Now Playing in Theaters */}
            {nowPlaying.length > 0 && (
              <RecommendationCarousel
                title="Now Playing in Theaters"
                movies={nowPlaying}
                onLoadMore={loadMoreNowPlaying}
                hasMore={hasMore.nowPlaying}
                isLoadingMore={loadingMore.nowPlaying}
              />
            )}

            {/* Coming Soon */}
            {upcoming.length > 0 && (
              <RecommendationCarousel
                title="Coming Soon"
                movies={upcoming}
                onLoadMore={loadMoreUpcoming}
                hasMore={hasMore.upcoming}
                isLoadingMore={loadingMore.upcoming}
              />
            )}

            {/* Trending TV Shows */}
            {trendingTV.length > 0 && (
              <RecommendationCarousel
                title="Trending TV Shows"
                movies={trendingTV}
                onLoadMore={loadMoreTrendingTV}
                hasMore={hasMore.trendingTV}
                isLoadingMore={loadingMore.trendingTV}
              />
            )}

            {/* Top Rated Movies */}
            {topRatedMovies.length > 0 && (
              <RecommendationCarousel
                title="Top Rated Movies"
                movies={topRatedMovies}
                onLoadMore={loadMoreTopRatedMovies}
                hasMore={hasMore.topRatedMovies}
                isLoadingMore={loadingMore.topRatedMovies}
              />
            )}

            {/* Top Rated TV */}
            {topRatedTV.length > 0 && (
              <RecommendationCarousel
                title="Top Rated TV Shows"
                movies={topRatedTV}
                onLoadMore={loadMoreTopRatedTV}
                hasMore={hasMore.topRatedTV}
                isLoadingMore={loadingMore.topRatedTV}
              />
            )}

            {/* Critically Acclaimed */}
            {criticallyAcclaimed.length > 0 && (
              <RecommendationCarousel
                title="Critically Acclaimed"
                movies={criticallyAcclaimed}
                onLoadMore={loadMoreCriticallyAcclaimed}
                hasMore={hasMore.criticallyAcclaimed}
                isLoadingMore={loadingMore.criticallyAcclaimed}
              />
            )}

            {/* Hidden Gems */}
            {hiddenGems.length > 0 && (
              <RecommendationCarousel
                title="Hidden Gems"
                movies={hiddenGems}
                onLoadMore={loadMoreHiddenGems}
                hasMore={hasMore.hiddenGems}
                isLoadingMore={loadingMore.hiddenGems}
              />
            )}

            {/* Action Movies */}
            {actionMovies.length > 0 && (
              <RecommendationCarousel
                title="Action & Adventure"
                movies={actionMovies}
                onLoadMore={loadMoreActionMovies}
                hasMore={hasMore.actionMovies}
                isLoadingMore={loadingMore.actionMovies}
              />
            )}

            {/* Feel Good Movies */}
            {feelGoodMovies.length > 0 && (
              <RecommendationCarousel
                title="Feel-Good Movies"
                movies={feelGoodMovies}
                onLoadMore={loadMoreFeelGoodMovies}
                hasMore={hasMore.feelGoodMovies}
                isLoadingMore={loadingMore.feelGoodMovies}
              />
            )}

            {/* Comedy Movies */}
            {comedyMovies.length > 0 && (
              <RecommendationCarousel
                title="Comedy"
                movies={comedyMovies}
                onLoadMore={loadMoreComedyMovies}
                hasMore={hasMore.comedyMovies}
                isLoadingMore={loadingMore.comedyMovies}
              />
            )}

            {/* Horror Movies */}
            {horrorMovies.length > 0 && (
              <RecommendationCarousel
                title="Horror"
                movies={horrorMovies}
                onLoadMore={loadMoreHorrorMovies}
                hasMore={hasMore.horrorMovies}
                isLoadingMore={loadingMore.horrorMovies}
              />
            )}

            {/* Thriller Movies */}
            {thrillerMovies.length > 0 && (
              <RecommendationCarousel
                title="Thrillers"
                movies={thrillerMovies}
                onLoadMore={loadMoreThrillerMovies}
                hasMore={hasMore.thrillerMovies}
                isLoadingMore={loadingMore.thrillerMovies}
              />
            )}

            {/* Mind-Bending Movies */}
            {mindBendingMovies.length > 0 && (
              <RecommendationCarousel
                title="Mind-Bending"
                movies={mindBendingMovies}
                onLoadMore={loadMoreMindBendingMovies}
                hasMore={hasMore.mindBendingMovies}
                isLoadingMore={loadingMore.mindBendingMovies}
              />
            )}

            {/* Sci-Fi Movies */}
            {sciFiMovies.length > 0 && (
              <RecommendationCarousel
                title="Sci-Fi"
                movies={sciFiMovies}
                onLoadMore={loadMoreSciFiMovies}
                hasMore={hasMore.sciFiMovies}
                isLoadingMore={loadingMore.sciFiMovies}
              />
            )}

            {/* Drama Movies */}
            {dramaMovies.length > 0 && (
              <RecommendationCarousel
                title="Drama"
                movies={dramaMovies}
                onLoadMore={loadMoreDramaMovies}
                hasMore={hasMore.dramaMovies}
                isLoadingMore={loadingMore.dramaMovies}
              />
            )}

            {/* Romance Movies */}
            {romanceMovies.length > 0 && (
              <RecommendationCarousel
                title="Romance"
                movies={romanceMovies}
                onLoadMore={loadMoreRomanceMovies}
                hasMore={hasMore.romanceMovies}
                isLoadingMore={loadingMore.romanceMovies}
              />
            )}

            {/* Animation Movies */}
            {animationMovies.length > 0 && (
              <RecommendationCarousel
                title="Animation"
                movies={animationMovies}
                onLoadMore={loadMoreAnimationMovies}
                hasMore={hasMore.animationMovies}
                isLoadingMore={loadingMore.animationMovies}
              />
            )}

            {/* Anime Movies */}
            {animeMovies.length > 0 && (
              <RecommendationCarousel
                title="Anime Movies"
                movies={animeMovies}
                onLoadMore={loadMoreAnimeMovies}
                hasMore={hasMore.animeMovies}
                isLoadingMore={loadingMore.animeMovies}
              />
            )}

            {/* Anime TV Shows */}
            {animeTV.length > 0 && (
              <RecommendationCarousel
                title="Anime Series"
                movies={animeTV}
                onLoadMore={loadMoreAnimeTV}
                hasMore={hasMore.animeTV}
                isLoadingMore={loadingMore.animeTV}
              />
            )}

            {/* Binge-Worthy TV */}
            {bingeWorthyTV.length > 0 && (
              <RecommendationCarousel
                title="Binge-Worthy TV"
                movies={bingeWorthyTV}
                onLoadMore={loadMoreBingeWorthyTV}
                hasMore={hasMore.bingeWorthyTV}
                isLoadingMore={loadingMore.bingeWorthyTV}
              />
            )}

            {/* Crime Dramas */}
            {crimeDramas.length > 0 && (
              <RecommendationCarousel
                title="Crime Dramas"
                movies={crimeDramas}
                onLoadMore={loadMoreCrimeDramas}
                hasMore={hasMore.crimeDramas}
                isLoadingMore={loadingMore.crimeDramas}
              />
            )}

            {/* Drama TV */}
            {dramaTV.length > 0 && (
              <RecommendationCarousel
                title="Drama TV Series"
                movies={dramaTV}
                onLoadMore={loadMoreDramaTV}
                hasMore={hasMore.dramaTV}
                isLoadingMore={loadingMore.dramaTV}
              />
            )}

            {/* Comedy TV */}
            {comedyTV.length > 0 && (
              <RecommendationCarousel
                title="Comedy TV Shows"
                movies={comedyTV}
                onLoadMore={loadMoreComedyTV}
                hasMore={hasMore.comedyTV}
                isLoadingMore={loadingMore.comedyTV}
              />
            )}

            {/* Sci-Fi TV */}
            {sciFiTV.length > 0 && (
              <RecommendationCarousel
                title="Sci-Fi & Fantasy TV"
                movies={sciFiTV}
                onLoadMore={loadMoreSciFiTV}
                hasMore={hasMore.sciFiTV}
                isLoadingMore={loadingMore.sciFiTV}
              />
            )}

          </>
        )}

        {/* Call to action for non-authenticated users */}
        {!isAuthenticated && (
          <div className="mt-16 text-center py-12 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Explore More Movies & Shows
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Sign in to access the full collection of movies and TV shows.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Sign In to Explore More
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
