"use client"

import { useState, useEffect, use } from "react"
import { Share2, Heart, Clock, Award, Calendar, DollarSign, Film, Newspaper, Star, Bookmark, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import * as movieAPI from "@/lib/movies"
import ReviewSection from "@/components/review-section"
import CastSection from "@/components/cast-section"
import ClipsSection from "@/components/clips-section"
import VideoPlayerModal from "@/components/video-player-modal"
import Link from "next/link"
import NewsCarousel from "@/components/news-carousel"
import ReviewPreview from "@/components/review-preview"
import VideosGrid from "@/components/videos-grid"
import StreamingProviders from "@/components/streaming-providers"
import MovieCard from "@/components/movie-card"
import { useUser } from "@/contexts/UserContext"
import { useRouter } from "next/navigation"
import { MovieDetailSkeleton } from "@/components/skeletons"
import FriendsLikedBy from "@/components/friends-liked-by"

export default function DetailsPage({ params }) {
  const unwrappedParams = use(params)
  const { user } = useUser()
  const router = useRouter()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liked, setLiked] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [newsPage, setNewsPage] = useState(1)
  const [hasMoreNews, setHasMoreNews] = useState(true)
  const [isLoadingMoreNews, setIsLoadingMoreNews] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState([])
  const [loadingFeaturedVideos, setLoadingFeaturedVideos] = useState(true)
  const [videosPage, setVideosPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false)
  const [isUpdatingFavorites, setIsUpdatingFavorites] = useState(false)


  // Fetch YouTube videos about the movie
  const fetchMovieYouTubeVideos = async (movieTitle, pageNum = 1, pageToken = null) => {
    if (pageNum === 1) {
      setLoadingFeaturedVideos(true)
    } else {
      setIsLoadingMoreVideos(true)
    }
    console.log('🎬 Fetching YouTube videos for movie:', movieTitle, 'Page:', pageNum)
    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
      
      if (!apiKey || apiKey === 'demo') {
        console.log('❌ YouTube API key not configured')
        setFeaturedVideos([])
        setLoadingFeaturedVideos(false)
        setIsLoadingMoreVideos(false)
        return
      }

      // Search for videos about the movie (trailers, reviews, interviews, clips)
      const searchQuery = `${movieTitle} official trailer OR review OR interview OR clip OR behind the scenes`
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=12&order=relevance&videoDuration=medium&key=${apiKey}`
      
      if (pageToken) {
        url += `&pageToken=${pageToken}`
      }
      
      console.log('📡 Fetching from YouTube API...')
      const response = await fetch(url)
      const data = await response.json()

      console.log('🎥 YouTube API Response:', data)

      if (data.items && data.items.length > 0) {
        const videos = data.items.map(item => ({
          id: item.id.videoId,
          key: item.id.videoId,
          name: item.snippet.title,
          type: 'Featured',
          site: 'YouTube',
          official: false
        }))

        console.log('✅ Found', videos.length, 'YouTube videos')
        
        if (pageNum === 1) {
          setFeaturedVideos(videos)
        } else {
          setFeaturedVideos(prev => [...prev, ...videos])
        }

        setNextPageToken(data.nextPageToken || null)
        setHasMoreVideos(!!data.nextPageToken)
      } else {
        console.log('⚠️ No videos found or API error:', data.error?.message)
        if (pageNum === 1) {
          setFeaturedVideos([])
        }
        setHasMoreVideos(false)
      }
    } catch (err) {
      console.error('❌ Failed to fetch YouTube videos:', err)
      if (pageNum === 1) {
        setFeaturedVideos([])
      }
      setHasMoreVideos(false)
    } finally {
      setLoadingFeaturedVideos(false)
      setIsLoadingMoreVideos(false)
    }
  }

  // Load more videos
  const loadMoreVideos = () => {
    if (!isLoadingMoreVideos && hasMoreVideos && movie && nextPageToken) {
      const nextPage = videosPage + 1
      setVideosPage(nextPage)
      fetchMovieYouTubeVideos(movie.title, nextPage, nextPageToken)
    }
  }

  // Fetch news about the movie
  const fetchMovieNews = async (movieTitle, pageNum = 1) => {
    if (pageNum === 1) {
      setLoadingNews(true)
    } else {
      setIsLoadingMoreNews(true)
    }
    console.log('🔍 Fetching news for:', movieTitle, 'Page:', pageNum)
    try {
      const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY
      console.log('🔑 API Key exists:', !!apiKey, 'Length:', apiKey?.length)
      
      if (!apiKey || apiKey === 'demo') {
        console.log('❌ News API key not configured, showing placeholder')
        setNews([])
        setLoadingNews(false)
        setIsLoadingMoreNews(false)
        return
      }
      
      const url = `https://newsapi.org/v2/everything?q="${encodeURIComponent(movieTitle)}" AND (movie OR film OR cinema)&sortBy=relevancy&pageSize=20&page=${pageNum}&language=en&apiKey=${apiKey}`
      console.log('📡 Fetching from NewsAPI...')
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('📰 NewsAPI Response:', data)
      
      if (data.status === 'ok' && data.articles && data.articles.length > 0) {
        // Filter articles to only include those that actually mention the movie title
        const filteredArticles = data.articles.filter(article => {
          const titleLower = movieTitle.toLowerCase()
          const articleTitle = (article.title || '').toLowerCase()
          const articleDesc = (article.description || '').toLowerCase()
          const articleContent = (article.content || '').toLowerCase()
          
          return articleTitle.includes(titleLower) || 
                 articleDesc.includes(titleLower) || 
                 articleContent.includes(titleLower)
        })
        
        console.log('✅ Found', filteredArticles.length, 'relevant news articles (filtered from', data.articles.length, ')')
        
        if (pageNum === 1) {
          setNews(filteredArticles)
        } else {
          setNews(prev => [...prev, ...filteredArticles])
        }
        
        setHasMoreNews(filteredArticles.length > 0 && data.articles.length === 20)
      } else {
        console.log('⚠️ No news articles found or API error:', data.message || data.code)
        if (pageNum === 1) {
          setNews([])
        }
        setHasMoreNews(false)
      }
    } catch (err) {
      console.error('❌ Failed to fetch news:', err)
      if (pageNum === 1) {
        setNews([])
      }
      setHasMoreNews(false)
    } finally {
      setLoadingNews(false)
      setIsLoadingMoreNews(false)
      console.log('✅ News loading complete')
    }
  }

  // Load more news
  const loadMoreNews = () => {
    if (!isLoadingMoreNews && hasMoreNews && movie) {
      const nextPage = newsPage + 1
      setNewsPage(nextPage)
      fetchMovieNews(movie.title, nextPage)
    }
  }

  useEffect(() => {
    const fetchMovieDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await movieAPI.getMovieDetails(unwrappedParams.id)
        if (response.success) {
          setMovie(response.data)
          setLikeCount(response.data.voteCount || 0)
          
          // Check if movie is in watchlist/favorites
          if (user) {
            checkIfInWatchlist()
            checkIfInFavorites()
          }
          
          // Fetch YouTube videos and news about the movie
          if (response.data.title) {
            setVideosPage(1)
            fetchMovieYouTubeVideos(response.data.title, 1)
            setNewsPage(1)
            fetchMovieNews(response.data.title, 1)
          } else {
            setLoadingFeaturedVideos(false)
            setLoadingNews(false)
          }
        }
      } catch (err) {
        console.error('Failed to fetch movie details:', err)
        setError(err.message || 'Failed to load movie details')
        setLoadingFeaturedVideos(false)
        setLoadingNews(false)
      } finally {
        setLoading(false)
      }
    }
    fetchMovieDetails()
  }, [unwrappedParams.id, user])

  const handleLike = async () => {
  if (!user || isUpdatingFavorites) return

  setIsUpdatingFavorites(true)

  try {
    const token = localStorage.getItem('token')

    const response = await fetch(
      liked
        ? `/api/users/me/favorites/${movie.id}`
        : `/api/users/me/favorites`,
      {
        method: liked ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: liked ? undefined : JSON.stringify({ movieId: movie.id?.toString() }),
      }
    )

    const data = await response.json()
    if (data.success) {
      setLiked(!liked)
      setLikeCount(prev => Math.max(0, prev + (liked ? -1 : 1)))
    } else {
      toast({
        title: "Error",
        description: data.message || 'Favorites update failed',
        variant: "destructive"
      })
    }
  } catch (err) {
    console.error('Favorites error:', err)
  } finally {
    setIsUpdatingFavorites(false)
  }
}


  const checkIfInWatchlist = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/me/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        const isInList = data.data.some(item => item.movieId === unwrappedParams.id)
        setInWatchlist(isInList)
      }
    } catch (error) {
      console.error('Error checking watchlist:', error)
    }
  }

  const checkIfInFavorites = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/me/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      if (data.success) {
        const isInList = data.data.some(item => item.movieId === unwrappedParams.id)
        setLiked(isInList)
      }
    } catch (error) {
      console.error('Error checking favorites:', error)
    }
  }

  const handleAddToWatchlist = async () => {
  if (!user || isUpdatingWatchlist) return

  setIsUpdatingWatchlist(true)

  try {
    const token = localStorage.getItem('token')

    const response = await fetch(
      inWatchlist
        ? `/api/users/me/watchlist/${movie.id}`
        : `/api/users/me/watchlist`,
      {
        method: inWatchlist ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: inWatchlist ? undefined : JSON.stringify({ movieId: movie.id?.toString() }),
      }
    )

    const data = await response.json()
    if (data.success) {
      setInWatchlist(!inWatchlist)
    } else {
      toast({
        title: "Error",
        description: data.message || 'Watchlist update failed',
        variant: "destructive"
      })
    }
  } catch (err) {
    console.error('Watchlist error:', err)
  } finally {
    setIsUpdatingWatchlist(false)
  }
}


  if (loading) {
    return <MovieDetailSkeleton />
  }

  if (error || !movie) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Film className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Movie Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'Unable to load movie details'}</p>
          <Link href="/browse">
            <Button>Browse Movies</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {isModalOpen && (
        <VideoPlayerModal
          videoKey={selectedVideo.key}
          videoTitle={selectedVideo.name}
          onClose={() => setIsModalOpen(false)}
        />
      )}
          <div className={`transition-all duration-300 ${isModalOpen ? 'blur-md pointer-events-none' : ''}`}>
      {/* Hero Section - extends behind navbar */}
      <div className="relative h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden -mt-16">
        <img src={movie.backdrop || "/placeholder.svg"} alt={movie.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-40 md:-mt-48 relative z-10">
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
          {/* Poster */}
          <div className="col-span-1">
            <img src={movie.poster || "/placeholder.svg"} alt={movie.title} className="w-full rounded-lg shadow-2xl" />
          </div>

          {/* Info */}
          <div className="col-span-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance">{movie.title}</h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-sm sm:text-base md:text-lg font-semibold text-foreground">{movie.rating?.toFixed(1) || 'N/A'}/10</span>
                <span className="text-xs sm:text-sm text-muted-foreground">({movie.voteCount?.toLocaleString()} votes)</span>
              </div>
              {movie.runtime && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">{movie.runtime} min</span>
                </div>
              )}
              {movie.releaseDate && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">{new Date(movie.releaseDate).getFullYear()}</span>
                </div>
              )}
              {movie.certification && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary/20 text-primary rounded-full text-xs sm:text-sm font-bold border border-primary">{movie.certification}</span>
                </div>
              )}
              {movie.status && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary/20 text-primary rounded-full text-xs sm:text-sm font-medium">{movie.status}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
              {movie.genres?.map((genre) => (
                <span key={genre.id} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-secondary text-secondary-foreground rounded-full text-xs sm:text-sm">
                  {genre.name}
                </span>
              ))}
            </div>

            {/* Tagline - hidden on mobile, visible on desktop */}
            {movie.tagline && (
              <p className="hidden md:block text-sm sm:text-base md:text-lg lg:text-xl italic text-primary mb-3 sm:mb-4">"{movie.tagline}"</p>
            )}

            {/* Description - hidden on mobile, visible on desktop */}
            <p className="hidden md:block text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">{movie.overview}</p>

            {/* Additional Info - hidden on mobile, visible on desktop */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {movie.budget > 0 && (
                <div>
                  <span className="text-muted-foreground">Budget: </span>
                  <span className="font-semibold text-foreground">${(movie.budget / 1000000).toFixed(0)}M</span>
                </div>
              )}
              {movie.revenue > 0 && (
                <div>
                  <span className="text-muted-foreground">Revenue: </span>
                  <span className="font-semibold text-foreground">${(movie.revenue / 1000000).toFixed(0)}M</span>
                </div>
              )}
              {movie.originalLanguage && (
                <div>
                  <span className="text-muted-foreground">Language: </span>
                  <span className="font-semibold text-foreground">{movie.originalLanguage.toUpperCase()}</span>
                </div>
              )}
              {movie.productionCompanies && movie.productionCompanies.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Production: </span>
                  <span className="font-semibold text-foreground">{movie.productionCompanies[0].name}</span>
                </div>
              )}
            </div>

            {/* Streaming Providers - desktop only (mobile version is below) */}
            <div className="hidden md:block">
              <StreamingProviders type="movie" id={movie.id} />
            </div>

            {/* Action Buttons - hidden on mobile, visible on desktop */}
            <div className="hidden md:flex flex-wrap gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
              <Button 
                size="sm" 
                variant={inWatchlist ? "default" : "outline"}
                className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3" 
                onClick={handleAddToWatchlist}
                disabled={isUpdatingWatchlist}
              >
                <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${inWatchlist ? "fill-current" : ""}`} />
                Watchlist
              </Button>
              <Button 
                size="sm" 
                variant={liked ? "default" : "outline"}
                className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3" 
                onClick={handleLike}
                disabled={isUpdatingFavorites}
              >
                <Heart className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${liked ? "fill-current" : ""}`} />
                {liked ? "Like" : "Like"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3">
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                Share
              </Button>
            </div>

            {/* Friends who liked - desktop */}
            <div className="hidden md:block">
              <FriendsLikedBy contentId={unwrappedParams.id} mediaType="movie" />
            </div>
          </div>
        </div>

        {/* Mobile-only: Full Width Content Below Poster */}
        <div className="md:hidden mb-12">
          {/* Tagline */}
          {movie.tagline && (
            <p className="text-sm sm:text-base md:text-lg lg:text-xl italic text-primary mb-3 sm:mb-4">"{movie.tagline}"</p>
          )}

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">{movie.overview}</p>

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {movie.budget > 0 && (
              <div>
                <span className="text-muted-foreground">Budget: </span>
                <span className="font-semibold text-foreground">${(movie.budget / 1000000).toFixed(0)}M</span>
              </div>
            )}
            {movie.revenue > 0 && (
              <div>
                <span className="text-muted-foreground">Revenue: </span>
                <span className="font-semibold text-foreground">${(movie.revenue / 1000000).toFixed(0)}M</span>
              </div>
            )}
            {movie.originalLanguage && (
              <div>
                <span className="text-muted-foreground">Language: </span>
                <span className="font-semibold text-foreground">{movie.originalLanguage.toUpperCase()}</span>
              </div>
            )}
            {movie.productionCompanies && movie.productionCompanies.length > 0 && (
              <div>
                <span className="text-muted-foreground">Production: </span>
                <span className="font-semibold text-foreground">{movie.productionCompanies[0].name}</span>
              </div>
            )}
          </div>

          {/* Streaming Providers - mobile */}
          <StreamingProviders type="movie" id={movie.id} />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
            <Button 
              size="sm" 
              variant={inWatchlist ? "default" : "outline"}
              className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3" 
              onClick={handleAddToWatchlist}
              disabled={isUpdatingWatchlist}
            >
              <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${inWatchlist ? "fill-current" : ""}`} />
                Watchlist
            </Button>
            <Button 
              size="sm" 
              variant={liked ? "default" : "outline"}
              className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3" 
              onClick={handleLike}
              disabled={isUpdatingFavorites}
            >
              <Heart className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${liked ? "fill-current" : ""}`} />
              Like
            </Button>
            <Button size="sm" variant="outline" className="gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3">
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              Share
            </Button>
          </div>

          {/* Friends who liked - mobile */}
          <div className="mt-4">
            <FriendsLikedBy contentId={unwrappedParams.id} mediaType="movie" />
          </div>
        </div>

        {/* Tabs Content */}
        <div className="space-y-12">
          {/* Cast Section */}
          {movie.cast && movie.cast.length > 0 && (
            <CastSection cast={movie.cast} />
          )}

          {/* Clips Section */}
          {movie.videos && movie.videos.length > 0 && (
            <ClipsSection 
              isModalOpen={isModalOpen} 
              setIsModalOpen={setIsModalOpen} 
              videos={movie.videos} 
              movieTitle={movie.title}
              selectedVideo={selectedVideo}
              setSelectedVideo={setSelectedVideo}
            />
          )}

          {/* Featured Clips Section - YouTube videos about the movie */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Film className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Featured Content</h2>
            </div>

            {!loadingFeaturedVideos && featuredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <Film className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No Featured Content Available</p>
                </div>
            ) : (
              <VideosGrid
                videos={featuredVideos}
                loading={loadingFeaturedVideos}
                onLoadMore={loadMoreVideos}
                hasMore={hasMoreVideos}
                isLoadingMore={isLoadingMoreVideos}
                onVideoClick={setSelectedVideo}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
              />
            )}
          </div>

          {/* Reviews Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">User Reviews</h2>
            </div>
            <ReviewPreview mediaId={movie.id} mediaType="movie" mediaTitle={movie.title} />
          </div>

          {/* News Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Newspaper className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Latest News</h2>
            </div>
            <NewsCarousel
              news={news}
              loading={loadingNews}
              onLoadMore={loadMoreNews}
              hasMore={hasMoreNews}
              isLoadingMore={isLoadingMoreNews}
              entityName={movie.title}
            />
          </div>

          {/* Similar Movies */}
          {((movie.recommendations && movie.recommendations.length > 0) || (movie.similar && movie.similar.length > 0)) && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">More Like This</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                {/* Prioritize recommendations, then fill with similar movies */}
                {[...new Map(
                  [...(movie.recommendations || []), ...(movie.similar || [])]
                    .map(item => [item.id, item])
                ).values()].slice(0, 14).map((item) => (
                  <MovieCard
                    key={item.id}
                    movie={{ ...item, mediaType: item.mediaType || "movie" }}
                    href={`/movies/${item.id}`}
                    alwaysShowInfo={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </main>
  )
}
