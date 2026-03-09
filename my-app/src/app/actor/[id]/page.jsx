"use client"

import { useState, useEffect, use } from "react"
import { User, Calendar, MapPin, Award, Film, Tv, Instagram, Facebook, Twitter, ExternalLink, Newspaper, BookOpen, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as movieAPI from "@/lib/movies"
import Link from "next/link"
import ClipsSection from "@/components/clips-section"
import VideoPlayerModal from "@/components/video-player-modal"
import NewsCarousel from "@/components/news-carousel"
import VideosGrid from "@/components/videos-grid"
import { ActorDetailSkeleton } from "@/components/skeletons"

export default function ActorDetailsPage({ params }) {
  const unwrappedParams = use(params)
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("movies")
  const [showAllMovies, setShowAllMovies] = useState(false)
  const [showAllTV, setShowAllTV] = useState(false)
  const [featuredVideos, setFeaturedVideos] = useState([])
  const [news, setNews] = useState([])
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingNews, setLoadingNews] = useState(true)
  const [newsPage, setNewsPage] = useState(1)
  const [hasMoreNews, setHasMoreNews] = useState(true)
  const [isLoadingMoreNews, setIsLoadingMoreNews] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [videosPage, setVideosPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)
  const [isLoadingMoreVideos, setIsLoadingMoreVideos] = useState(false)
  const [nextPageToken, setNextPageToken] = useState(null)


  // Fetch YouTube videos about the actor
  const fetchActorVideos = async (actorName, pageNum = 1, pageToken = null) => {
    if (pageNum === 1) {
      setLoadingVideos(true)
    } else {
      setIsLoadingMoreVideos(true)
    }
    console.log('[INFO] Fetching YouTube videos for actor:', actorName, 'Page:', pageNum)
    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY

      if (!apiKey || apiKey === 'demo') {
        console.log('[ERROR] YouTube API key not configured')
        setFeaturedVideos([])
        setLoadingVideos(false)
        setIsLoadingMoreVideos(false)
        return
      }

      // Search for videos about the actor (interviews, trailers, clips, etc.)
      const searchQuery = `${actorName} interview OR trailer OR movie OR latest`
      let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=12&order=relevance&videoDuration=medium&key=${apiKey}`

      if (pageToken) {
        url += `&pageToken=${pageToken}`
      }

      console.log('[FETCH] Fetching from YouTube API...')
      const response = await fetch(url)
      const data = await response.json()

      console.log('[INFO] YouTube API Response:', data)

      if (data.items && data.items.length > 0) {
        const videos = data.items.map(item => ({
          id: item.id.videoId,
          key: item.id.videoId,
          name: item.snippet.title,
          type: 'Featured',
          site: 'YouTube',
          official: false
        }))

        console.log('[OK] Found', videos.length, 'YouTube videos')

        if (pageNum === 1) {
          setFeaturedVideos(videos)
        } else {
          setFeaturedVideos(prev => [...prev, ...videos])
        }

        setNextPageToken(data.nextPageToken || null)
        setHasMoreVideos(!!data.nextPageToken)
      } else {
        console.log('[WARN] No videos found or API error:', data.error?.message)
        if (pageNum === 1) {
          setFeaturedVideos([])
        }
        setHasMoreVideos(false)
      }
    } catch (err) {
      console.error('[ERROR] Failed to fetch YouTube videos:', err)
      if (pageNum === 1) {
        setFeaturedVideos([])
      }
      setHasMoreVideos(false)
    } finally {
      setLoadingVideos(false)
      setIsLoadingMoreVideos(false)
    }
  }

  // Load more videos
  const loadMoreVideos = () => {
    if (!isLoadingMoreVideos && hasMoreVideos && person && nextPageToken) {
      const nextPage = videosPage + 1
      setVideosPage(nextPage)
      fetchActorVideos(person.name, nextPage, nextPageToken)
    }
  }

  // Fetch news about the actor
  const fetchActorNews = async (actorName, pageNum = 1) => {
    if (pageNum === 1) {
      setLoadingNews(true)
    } else {
      setIsLoadingMoreNews(true)
    }
    console.log('[SEARCH] Fetching news for actor:', actorName, 'Page:', pageNum)
    try {
      const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY
      console.log('[AUTH] API Key exists:', !!apiKey, 'Length:', apiKey?.length)

      if (!apiKey || apiKey === 'demo') {
        console.log('[ERROR] News API key not configured, showing placeholder')
        setNews([])
        setLoadingNews(false)
        setIsLoadingMoreNews(false)
        return
      }

      const entertainmentKeywords = 'actor OR actress OR movie OR film OR Hollywood OR celebrity OR director OR role OR cast OR premiere OR interview OR trailer'
      const url = `https://newsapi.org/v2/everything?qInTitle=${encodeURIComponent('"' + actorName + '"')}&q=${encodeURIComponent(entertainmentKeywords)}&sortBy=relevancy&pageSize=20&page=${pageNum}&language=en&apiKey=${apiKey}`
      console.log('[FETCH] Fetching from NewsAPI...')

      const response = await fetch(url)
      const data = await response.json()

      console.log('[INFO] NewsAPI Response:', data)

      if (data.status === 'ok' && data.articles && data.articles.length > 0) {
        // Filter articles: name must be in headline AND article must be entertainment-related
        const entertainmentTerms = ['actor', 'actress', 'movie', 'film', 'hollywood', 'celebrity', 'director', 'role', 'cast', 'premiere', 'interview', 'trailer', 'oscar', 'emmy', 'netflix', 'disney', 'hbo', 'amazon', 'hulu', 'series', 'tv', 'streaming', 'imdb']
        const filteredArticles = data.articles.filter(article => {
          const nameLower = actorName.toLowerCase()
          const articleTitle = (article.title || '').toLowerCase()
          const articleDesc = (article.description || '').toLowerCase()
          const articleContent = (article.content || '').toLowerCase()
          const fullText = articleTitle + ' ' + articleDesc + ' ' + articleContent

          // Name must appear in the article headline
          const nameInHeadline = articleTitle.includes(nameLower)
          // Article must contain at least one entertainment keyword
          const isEntertainment = entertainmentTerms.some(term => fullText.includes(term))

          return nameInHeadline && isEntertainment
        })

        console.log('[OK] Found', filteredArticles.length, 'relevant news articles (filtered from', data.articles.length, ')')

        if (pageNum === 1) {
          setNews(filteredArticles)
        } else {
          setNews(prev => [...prev, ...filteredArticles])
        }

        setHasMoreNews(filteredArticles.length > 0 && data.articles.length === 20)
      } else {
        console.log('[WARN] No news articles found or API error:', data.message || data.code)
        if (pageNum === 1) {
          setNews([])
        }
        setHasMoreNews(false)
      }
    } catch (err) {
      console.error('[ERROR] Failed to fetch news:', err)
      if (pageNum === 1) {
        setNews([])
      }
      setHasMoreNews(false)
    } finally {
      setLoadingNews(false)
      setIsLoadingMoreNews(false)
      console.log('[OK] News loading complete')
    }
  }

  // Load more news
  const loadMoreNews = () => {
    if (!isLoadingMoreNews && hasMoreNews && person) {
      const nextPage = newsPage + 1
      setNewsPage(nextPage)
      fetchActorNews(person.name, nextPage)
    }
  }

  useEffect(() => {
    const fetchPersonDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await movieAPI.getPersonDetails(unwrappedParams.id)
        if (response.success) {
          setPerson(response.data)

          // Fetch YouTube videos about the actor
          if (response.data.name) {
            setVideosPage(1)
            fetchActorVideos(response.data.name, 1)
            setNewsPage(1)
            fetchActorNews(response.data.name, 1)
          } else {
            setLoadingVideos(false)
            setLoadingNews(false)
          }
        }
      } catch (err) {
        console.error('Failed to fetch person details:', err)
        setError(err.message || 'Failed to load actor details')
        setLoadingVideos(false)
        setLoadingNews(false)
      } finally {
        setLoading(false)
      }
    }
    fetchPersonDetails()
  }, [unwrappedParams.id])

  const calculateAge = (birthday, deathday) => {
    if (!birthday) return null
    const birthDate = new Date(birthday)
    const endDate = deathday ? new Date(deathday) : new Date()
    const age = endDate.getFullYear() - birthDate.getFullYear()
    const monthDiff = endDate.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      return age - 1
    }
    return age
  }

  if (loading) {
    return <ActorDetailSkeleton />
  }

  if (error || !person) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Actor Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || 'Unable to load actor details'}</p>
          <Link href="/browse">
            <Button>Browse Movies</Button>
          </Link>
        </div>
      </main>
    )
  }

  // Separate movie and TV credits
  const movieCredits = [
    ...(person.movieCredits?.cast || []).map(c => ({ ...c, type: 'movie', role: c.character }))
  ].sort((a, b) => {
    const dateA = new Date(a.releaseDate || 'N/A')
    const dateB = new Date(b.releaseDate || 'N/A')
    return dateB - dateA
  })

  const tvCredits = [
    ...(person.tvCredits?.cast || []).map(c => ({ ...c, type: 'tv', role: c.character }))
  ].sort((a, b) => {
    const dateA = new Date(a.firstAirDate || 'N/A')
    const dateB = new Date(b.firstAirDate || 'N/A')
    return dateB - dateA
  })

  // Generate Wikipedia search URL
  const wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(person.name.replace(/ /g, '_'))}`

  // Get biography - show full text or stop at complete sentence
  const getBiographySummary = (bio) => {
    if (!bio) return ''

    // If biography is short enough, show it all
    if (bio.length <= 600) {
      return bio
    }

    // Find the last sentence ending before 600 characters
    const truncated = bio.substring(0, 600)
    const lastPeriod = truncated.lastIndexOf('. ')
    const lastExclamation = truncated.lastIndexOf('! ')
    const lastQuestion = truncated.lastIndexOf('? ')

    // Get the position of the last sentence ending
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion)

    // If we found a sentence ending, cut there (include the punctuation)
    if (lastSentenceEnd > 200) {
      return bio.substring(0, lastSentenceEnd + 1)
    }

    // Otherwise show full biography
    return bio
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-12">
          {/* Profile Picture */}
          <div className="col-span-1">
            <div className="w-full aspect-[2/3] rounded-lg shadow-2xl overflow-hidden bg-secondary">
              {person.profilePath ? (
                <img
                  src={person.profilePath}
                  alt={person.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="col-span-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              {person.name}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
              {person.knownForDepartment && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">{person.knownForDepartment}</span>
                </div>
              )}
              {person.birthday && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">
                    {person.deathday ? 'Died at' : 'Age'} {calculateAge(person.birthday, person.deathday)}
                  </span>
                </div>
              )}
              {person.placeOfBirth && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span className="text-sm sm:text-base md:text-lg text-foreground">{person.placeOfBirth}</span>
                </div>
              )}
            </div>

            {/* Biography Summary - hidden on mobile, visible on desktop */}
            {person.biography && (
              <div className="hidden md:block mb-6 sm:mb-8">
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                  {getBiographySummary(person.biography)}
                </p>
              </div>
            )}

            {/* Social Links - hidden on mobile, visible on desktop */}
            <div className="hidden md:flex gap-3 mb-6 sm:mb-8">
              {/* Wikipedia Link */}
              <a
                href={wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                title="Wikipedia"
              >
                <BookOpen className="w-5 h-5 text-foreground" />
              </a>

              {person.externalIds?.instagramId && (
                <a
                  href={`https://instagram.com/${person.externalIds.instagramId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5 text-foreground" />
                </a>
              )}
              {person.externalIds?.twitterId && (
                <a
                  href={`https://twitter.com/${person.externalIds.twitterId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                  title="Twitter"
                >
                  <Twitter className="w-5 h-5 text-foreground" />
                </a>
              )}
              {person.externalIds?.facebookId && (
                <a
                  href={`https://facebook.com/${person.externalIds.facebookId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5 text-foreground" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-only: Full Width Content Below Profile Picture */}
        <div className="md:hidden mb-12">
          {/* Biography Summary */}
          {person.biography && (
            <div className="mb-6 sm:mb-8">
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                {getBiographySummary(person.biography)}
              </p>
            </div>
          )}

          {/* Social Links - Icons Only */}
          <div className="flex gap-3">
            {/* Wikipedia Link */}
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
              title="Wikipedia"
            >
              <BookOpen className="w-5 h-5 text-foreground" />
            </a>

            {person.externalIds?.instagramId && (
              <a
                href={`https://instagram.com/${person.externalIds.instagramId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <Instagram className="w-5 h-5 text-foreground" />
              </a>
            )}
            {person.externalIds?.twitterId && (
              <a
                href={`https://twitter.com/${person.externalIds.twitterId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                title="Twitter"
              >
                <Twitter className="w-5 h-5 text-foreground" />
              </a>
            )}
            {person.externalIds?.facebookId && (
              <a
                href={`https://facebook.com/${person.externalIds.facebookId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors"
                title="Facebook"
              >
                <Facebook className="w-5 h-5 text-foreground" />
              </a>
            )}
          </div>
        </div>

        {/* Tabs Content */}
        <div className="space-y-12">
          {/* Known For / Filmography with Tabs */}
          {(movieCredits.length > 0 || tvCredits.length > 0) && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Known For</h2>

              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b border-border">
                <button
                  onClick={() => setActiveTab("movies")}
                  className={`pb-3 px-4 font-semibold transition-colors relative ${activeTab === "movies"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5" />
                    <span>Movies ({movieCredits.length})</span>
                  </div>
                  {activeTab === "movies" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("tv")}
                  className={`pb-3 px-4 font-semibold transition-colors relative ${activeTab === "tv"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5" />
                    <span>TV Shows ({tvCredits.length})</span>
                  </div>
                  {activeTab === "tv" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>

              {/* Credits Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                {activeTab === "movies" && movieCredits.slice(0, showAllMovies ? movieCredits.length : 14).map((credit) => (
                  <Link
                    key={`${credit.id}-${credit.role}`}
                    href={`/movies/${credit.id}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-secondary">
                      {credit.poster ? (
                        <img
                          src={credit.poster}
                          alt={credit.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      {credit.rating > 0 && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-primary text-[11px] sm:text-xs font-semibold bg-black/50">
                            <Star className="w-3 h-3 fill-primary text-primary" /> {credit.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {credit.title}
                    </h3>
                    {credit.role && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        as {credit.role}
                      </p>
                    )}
                  </Link>
                ))}

                {activeTab === "tv" && tvCredits.slice(0, showAllTV ? tvCredits.length : 14).map((credit) => (
                  <Link
                    key={`${credit.id}-${credit.role}`}
                    href={`/tv/${credit.id}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-secondary">
                      {credit.poster ? (
                        <img
                          src={credit.poster}
                          alt={credit.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Tv className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      {credit.rating > 0 && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-primary text-[11px] sm:text-xs font-semibold bg-black/50">
                            <Star className="w-3 h-3 fill-primary text-primary" /> {credit.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {credit.title}
                    </h3>
                    {credit.role && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        as {credit.role}
                      </p>
                    )}
                  </Link>
                ))}
              </div>

              {/* Show More Button */}
              {activeTab === "movies" && movieCredits.length > 14 && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllMovies(!showAllMovies)}
                    className="px-8"
                  >
                    {showAllMovies ? "Show Less" : `Show More Movies (${movieCredits.length - 14} more)`}
                  </Button>
                </div>
              )}

              {activeTab === "tv" && tvCredits.length > 14 && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllTV(!showAllTV)}
                    className="px-8"
                  >
                    {showAllTV ? "Show Less" : `Show More TV Shows (${tvCredits.length - 14} more)`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Featured Clips Section - YouTube videos about the actor */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Film className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Content</h2>
            </div>
            {!loadingVideos && featuredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <Film className="w-16 h-16 sm:w-20 sm:h-20 text-muted-foreground mb-4" />
                <p className="text-base text-muted-foreground mb-2">No Featured Content Available</p>
              </div>
            ) : (
              <VideosGrid
                videos={featuredVideos}
                loading={loadingVideos}
                onLoadMore={loadMoreVideos}
                hasMore={hasMoreVideos}
                isLoadingMore={isLoadingMoreVideos}
                onVideoClick={setSelectedVideo}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
              />
            )}
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
              entityName={person.name}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
