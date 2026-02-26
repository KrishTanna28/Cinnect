"use client"

import { useState, useEffect, use } from "react"
import { Share2, Heart, Clock, Award, Calendar, Tv as TvIcon, Film, Newspaper, Star, Bookmark, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { getTVDetails } from "@/lib/movies"
import ReviewSection from "@/components/review-section"
import CastSection from "@/components/cast-section"
import ClipsSection from "@/components/clips-section"
import VideoPlayerModal from "@/components/video-player-modal"
import Link from "next/link"
import NewsCarousel from "@/components/news-carousel"
import StreamingProviders from "@/components/streaming-providers"
import ReviewPreview from "@/components/review-preview"
import VideosGrid from "@/components/videos-grid"
import MovieCard from "@/components/movie-card"
import { useUser } from "@/contexts/UserContext"
import { useRouter } from "next/navigation"
import { MovieDetailSkeleton } from "@/components/skeletons"
import FriendsLikedBy from "@/components/friends-liked-by"

export default function TVDetailsPage({ params }) {
  const unwrappedParams = use(params)
  const { user } = useUser()
  const router = useRouter()
  const [tvShow, setTvShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liked, setLiked] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [newsPage, setNewsPage] = useState(1)
  const [hasMoreNews, setHasMoreNews] = useState(true)
  const [isLoadingMoreNews, setIsLoadingMoreNews] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [featuredVideos, setFeaturedVideos] = useState([])
  const [loadingFeaturedVideos, setLoadingFeaturedVideos] = useState(true)
  const [videosPage, setVideosPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)

  // Fetch YouTube videos about the TV show
  const fetchTVYouTubeVideos = async (tvTitle, pageNum = 1, pageToken = null) => {
    if (pageNum === 1) {
      setLoadingFeaturedVideos(true)
    } else {
      setIsLoadingMoreVideos(true)
    }
    console.log('🎬 Fetching YouTube videos for TV show:', tvTitle, 'Page:', pageNum)
    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

      if (!apiKey || apiKey === 'demo') {
        console.log('❌ YouTube API key not configured')
        setFeaturedVideos([])
        setLoadingFeaturedVideos(false)
        setIsLoadingMoreVideos(false)
        return
      }

      // Search for videos about the TV show (trailers, reviews, interviews, clips)
      const searchQuery = `${tvTitle} official trailer OR review OR interview OR clip OR behind the scenes`
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
    if (!isLoadingMoreVideos && hasMoreVideos && tvShow && nextPageToken) {
      const nextPage = videosPage + 1
      setVideosPage(nextPage)
      fetchTVYouTubeVideos(tvShow.title, nextPage, nextPageToken)
    }
  }

  // Fetch news about the TV show
  const fetchTVNews = async (tvTitle, pageNum = 1) => {
    if (pageNum === 1) {
      setLoadingNews(true)
    } else {
      setIsLoadingMoreNews(true)
    }
    console.log('🔍 Fetching news for:', tvTitle, 'Page:', pageNum)
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

      const url = `https://newsapi.org/v2/everything?q="${encodeURIComponent(tvTitle)}" AND (TV OR series OR show)&sortBy=relevancy&pageSize=20&page=${pageNum}&language=en&apiKey=${apiKey}`
      console.log('📡 Fetching from NewsAPI...')

      const response = await fetch(url)
      const data = await response.json()

      console.log('📰 NewsAPI Response:', data)

      if (data.status === 'ok' && data.articles && data.articles.length > 0) {
        // Filter articles to only include those that actually mention the TV show title
        const filteredArticles = data.articles.filter(article => {
          const titleLower = tvTitle.toLowerCase()
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
    if (!isLoadingMoreNews && hasMoreNews && tvShow) {
      const nextPage = newsPage + 1
      setNewsPage(nextPage)
      fetchTVNews(tvShow.title, nextPage)
    }
  }

  useEffect(() => {
    const fetchTVDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await getTVDetails(unwrappedParams.id)
        if (response.success) {
          setTvShow(response.data)
          setLikeCount(response.data.voteCount || 0)

          // Check if TV show is in watchlist/favorites
          if (user) {
            checkIfInWatchlist()
            checkIfInFavorites()
          }

          // Fetch YouTube videos and news about the TV show
          if (response.data.name) {
            setVideosPage(1)
            fetchTVYouTubeVideos(response.data.name, 1)
            setNewsPage(1)
            fetchTVNews(response.data.name, 1)
          } else {
            setLoadingFeaturedVideos(false)
            setLoadingNews(false)
          }
        }
      } catch (err) {
        console.error('Failed to fetch TV show details:', err)
        setError(err.message || 'Failed to load TV show details')
        setLoadingFeaturedVideos(false)
        setLoadingNews(false)
      } finally {
        setLoading(false)
      }
    }
    fetchTVDetails()
  }, [unwrappedParams.id, user])

  const handleLike = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      const token = localStorage.getItem('token')

      if (liked) {
        // Remove from favorites
        const response = await fetch(`/api/users/me/favorites/${tvShow.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()
        if (data.success) {
          setLiked(false)
          setLikeCount(Math.max(0, likeCount - 1))
        } else {
          toast({
            title: "Error",
            description: data.message || 'Failed to remove from favorites',
            variant: "destructive"
          })
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/users/me/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ movieId: tvShow.id?.toString() })
        })

        const data = await response.json()
        if (data.success) {
          setLiked(true)
          setLikeCount(likeCount + 1)
        } else {
          toast({
            title: "Error",
            description: data.message || 'Failed to add to favorites',
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('Error updating favorites:', error)
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      })
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
    if (!user) {
      router.push('/login')
      return
    }

    try {
      const token = localStorage.getItem('token')

      if (inWatchlist) {
        // Remove from watchlist
        const response = await fetch(`/api/users/me/watchlist/${tvShow.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()
        if (data.success) {
          setInWatchlist(false)
        } else {
          toast({
            title: "Error",
            description: data.message || 'Failed to remove from watchlist',
            variant: "destructive"
          })
        }
      } else {
        // Add to watchlist
        const response = await fetch('/api/users/me/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ movieId: tvShow.id?.toString() })
        })

        const data = await response.json()
        if (data.success) {
          setInWatchlist(true)
        } else {
          toast({
            title: "Error",
            description: data.message || 'Failed to add to watchlist',
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
      toast({
        title: "Error",
        description: "Failed to update watchlist. Please try again.",
        variant: "destructive"
      })
    }
  }


  if (loading) {
    return <MovieDetailSkeleton />
  }

  if (error || !tvShow) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <TvIcon className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">TV Show Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'Unable to load TV show details'}</p>
          <Link href="/browse">
            <Button>Browse TV Shows</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Video Player Modal */}
      {isModalOpen && selectedVideo && (
        <VideoPlayerModal
          videoKey={selectedVideo.key}
          videoTitle={selectedVideo.name}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedVideo(null)
          }}
        />
      )}

      {/* Hero Section - extends behind navbar */}
      <div className="relative h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden -mt-16">
        <img src={tvShow.backdrop || "/placeholder.svg"} alt={tvShow.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 sm:-mt-40 md:-mt-48 relative z-10">
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
          {/* Poster */}
          <div className="col-span-1">
            <img src={tvShow.poster || "/placeholder.svg"} alt={tvShow.title} className="w-full rounded-lg shadow-2xl" />
          </div>

          {/* Info */}
          <div className="col-span-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4 text-balance">{tvShow.title}</h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-sm sm:text-base md:text-lg font-semibold text-foreground">{tvShow.rating?.toFixed(1) || 'N/A'}/10</span>
                <span className="text-xs sm:text-sm text-muted-foreground">({tvShow.voteCount?.toLocaleString()} votes)</span>
              </div>
              {tvShow.numberOfSeasons && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <TvIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">
                    {tvShow.numberOfSeasons} Season{tvShow.numberOfSeasons > 1 ? 's' : ''} • {tvShow.numberOfEpisodes} Episodes
                  </span>
                </div>
              )}
              {tvShow.firstAirDate && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">{new Date(tvShow.firstAirDate).getFullYear()}</span>
                </div>
              )}
              {tvShow.certification && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary/20 text-primary rounded-full text-xs sm:text-sm font-bold border border-primary">{tvShow.certification}</span>
                </div>
              )}
              {tvShow.status && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary/20 text-primary rounded-full text-xs sm:text-sm font-medium">{tvShow.status}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
              {tvShow.genres?.map((genre) => (
                <span key={genre.id} className="px-2 py-0.5 sm:px-3 sm:py-1 bg-secondary text-secondary-foreground rounded-full text-xs sm:text-sm">
                  {genre.name}
                </span>
              ))}
            </div>

            {/* Tagline - hidden on mobile, visible on desktop */}
            {tvShow.tagline && (
              <p className="hidden md:block text-sm sm:text-base md:text-lg lg:text-xl italic text-primary mb-3 sm:mb-4">"{tvShow.tagline}"</p>
            )}

            {/* Description - hidden on mobile, visible on desktop */}
            <p className="hidden md:block text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">{tvShow.overview}</p>

            {/* Additional Info - hidden on mobile, visible on desktop */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {tvShow.episodeRunTime && tvShow.episodeRunTime.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Episode Runtime: </span>
                  <span className="font-semibold text-foreground">{tvShow.episodeRunTime[0]} min</span>
                </div>
              )}
              {tvShow.originalLanguage && (
                <div>
                  <span className="text-muted-foreground">Language: </span>
                  <span className="font-semibold text-foreground">{tvShow.originalLanguage.toUpperCase()}</span>
                </div>
              )}
              {tvShow.networks && tvShow.networks.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Network: </span>
                  <span className="font-semibold text-foreground">{tvShow.networks[0].name}</span>
                </div>
              )}
              {tvShow.productionCompanies && tvShow.productionCompanies.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Production: </span>
                  <span className="font-semibold text-foreground">{tvShow.productionCompanies[0].name}</span>
                </div>
              )}
            </div>

            {/* Streaming Providers - desktop only */}
            <div className="hidden md:block">
              <StreamingProviders type="tv" id={tvShow.id} />
            </div>

            {/* Action Buttons - hidden on mobile, visible on desktop */}
            <div className="hidden md:flex flex-wrap gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
              <Button
                size="sm"
                variant={inWatchlist ? "default" : "outline"}
                className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3"
                onClick={handleAddToWatchlist}
              >
                <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${inWatchlist ? "fill-current" : ""}`} />
                Watchlist
              </Button>
              <Button
                size="sm"
                variant={liked ? "default" : "outline"}
                className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3"
                onClick={handleLike}
              >
                <Heart className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${liked ? "fill-current" : ""}`} />
                Like
              </Button>
              <Button size="sm" variant="outline" className="gap-1 sm:gap-2 bg-transparent text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3">
                <Share2 className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                Share
              </Button>
            </div>

            {/* Friends who liked - desktop */}
            <div className="hidden md:block">
              <FriendsLikedBy contentId={unwrappedParams.id} mediaType="tv" />
            </div>
          </div>
        </div>

        {/* Mobile-only: Full Width Content Below Poster */}
        <div className="md:hidden mb-12">
          {/* Tagline */}
          {tvShow.tagline && (
            <p className="text-sm sm:text-base md:text-lg lg:text-xl italic text-primary mb-3 sm:mb-4">"{tvShow.tagline}"</p>
          )}

          {/* Description */}
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">{tvShow.overview}</p>

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {tvShow.episodeRunTime && tvShow.episodeRunTime.length > 0 && (
              <div>
                <span className="text-muted-foreground">Episode Runtime: </span>
                <span className="font-semibold text-foreground">{tvShow.episodeRunTime[0]} min</span>
              </div>
            )}
            {tvShow.originalLanguage && (
              <div>
                <span className="text-muted-foreground">Language: </span>
                <span className="font-semibold text-foreground">{tvShow.originalLanguage.toUpperCase()}</span>
              </div>
            )}
            {tvShow.networks && tvShow.networks.length > 0 && (
              <div>
                <span className="text-muted-foreground">Network: </span>
                <span className="font-semibold text-foreground">{tvShow.networks[0].name}</span>
              </div>
            )}
            {tvShow.productionCompanies && tvShow.productionCompanies.length > 0 && (
              <div>
                <span className="text-muted-foreground">Production: </span>
                <span className="font-semibold text-foreground">{tvShow.productionCompanies[0].name}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4">
            <Button
              size="sm"
              variant={inWatchlist ? "default" : "outline"}
              className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3"
              onClick={handleAddToWatchlist}
            >
              <Bookmark className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${inWatchlist ? "fill-current" : ""}`} />
              Watchlist
            </Button>
            <Button
              size="sm"
              variant={liked ? "default" : "outline"}
              className="gap-1 sm:gap-2 text-xs sm:text-sm md:text-base sm:px-4 sm:py-2 md:px-6 md:py-3"
              onClick={handleLike}
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
            <FriendsLikedBy contentId={unwrappedParams.id} mediaType="tv" />
          </div>
        </div>

        {/* Tabs Content */}
        <div className="space-y-12">
          {/* Seasons */}
          {tvShow.seasons && tvShow.seasons.length > 0 && (
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Seasons</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {tvShow.seasons.filter(season => season.seasonNumber > 0).map((season) => (
                  <Link
                    key={season.id}
                    href={`/tv/${tvShow.id}/season/${season.seasonNumber}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-secondary">
                      {season.poster ? (
                        <img
                          src={season.poster}
                          alt={season.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TvIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                        <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-bold">
                          S{season.seasonNumber}
                        </span>
                        <span className="px-2 py-1 bg-black/70 text-white rounded text-xs font-medium">
                          <Star className="w-3 h-3 text-primary" /> {season.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {season.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {season.episodeCount} Episodes
                      </p>
                      {season.airDate && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(season.airDate).getFullYear()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cast Section */}
          {tvShow.cast && tvShow.cast.length > 0 && (
            <CastSection cast={tvShow.cast} />
          )}

          {/* Clips Section */}
          {tvShow.videos && tvShow.videos.length > 0 && (
            <ClipsSection
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              videos={tvShow.videos}
              movieTitle={tvShow.title}
              selectedVideo={selectedVideo}
              setSelectedVideo={setSelectedVideo}
            />
          )}

          {/* Featured Clips Section - YouTube videos about the TV show */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Film className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Content</h2>
            </div>

            {!loadingFeaturedVideos && featuredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex flex-col items-center justify-center text-center">
                  <Film className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No Featured Content Available</p>
                </div>
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
            <ReviewPreview mediaId={tvShow.id} mediaType="tv" mediaTitle={tvShow.title} />
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
              entityName={tvShow.title}
            />
          </div>

          {/* Similar TV Shows */}
          {((tvShow.recommendations && tvShow.recommendations.length > 0) || (tvShow.similar && tvShow.similar.length > 0)) && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">More Like This</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                {/* Prioritize recommendations, then fill with similar shows */}
                {[...new Map(
                  [...(tvShow.recommendations || []), ...(tvShow.similar || [])]
                    .map(item => [item.id, item])
                ).values()].slice(0, 14).map((item) => (
                  <MovieCard
                    key={item.id}
                    movie={{ ...item, mediaType: item.mediaType || "tv" }}
                    href={`/tv/${item.id}`}
                    alwaysShowInfo={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
