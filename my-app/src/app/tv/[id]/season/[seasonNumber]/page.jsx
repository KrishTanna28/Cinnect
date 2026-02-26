"use client"

import { useState, useEffect, use, useRef, useCallback } from "react"
import { Award, Calendar, Clock, ArrowLeft, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {getTVSeasonDetails} from "@/lib/movies"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SeasonDetailSkeleton, InlineLoadingSkeleton } from "@/components/skeletons"

export default function SeasonDetailsPage({ params }) {
  const unwrappedParams = use(params)
  const [season, setSeason] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [displayedEpisodes, setDisplayedEpisodes] = useState(12) // Show 12 episodes initially
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const fetchSeasonDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await getTVSeasonDetails(unwrappedParams.id, unwrappedParams.seasonNumber)
        if (response.success) {
          setSeason(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch season details:', err)
        setError(err.message || 'Failed to load season details')
      } finally {
        setLoading(false)
      }
    }
    fetchSeasonDetails()
  }, [unwrappedParams.id, unwrappedParams.seasonNumber])

  // Infinite scroll logic
  const loadMoreEpisodes = useCallback(() => {
    if (isLoadingMore || !season?.episodes) return
    
    const totalEpisodes = season.episodes.length
    if (displayedEpisodes >= totalEpisodes) return

    setIsLoadingMore(true)
    setTimeout(() => {
      setDisplayedEpisodes(prev => Math.min(prev + 12, totalEpisodes))
      setIsLoadingMore(false)
    }, 500) // Simulate loading delay
  }, [displayedEpisodes, season, isLoadingMore])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreEpisodes()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadMoreEpisodes])

  if (loading) {
    return <SeasonDetailSkeleton />
  }

  if (error || !season) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive text-xl mb-4">{error || 'Season not found'}</p>
          <Link href={`/tv/${unwrappedParams.id}`}>
            <ArrowLeft className="w-7 h-7" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
      onClick={() => router.back()}
      className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer mb-5"
    >
      <ArrowLeft className="w-7 h-7" />
    </button>

        <div className="grid grid-cols-4 gap-4 md:gap-8 mb-12">
          {/* Season Poster */}
          <div className="col-span-1">
            <img 
              src={season.poster || "/placeholder.svg"} 
              alt={season.name} 
              className="w-full rounded-lg shadow-2xl" 
            />
          </div>

          {/* Season Info */}
          <div className="col-span-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">{season.name}</h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 mb-6">
              {season.rating > 0 && (
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">{season.rating.toFixed(1)}/10</span>
                </div>
              )}
              {season.airDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-lg text-foreground">{new Date(season.airDate).getFullYear()}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium">
                  {season.episodes?.length || 0} Episodes
                </span>
              </div>
            </div>

            {/* Overview */}
            {season.overview && (
              <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">{season.overview}</p>
            )}
          </div>
        </div>

        {/* Episodes List */}
        {season.episodes && season.episodes.length > 0 && (
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
              Episodes ({displayedEpisodes} of {season.episodes.length})
            </h2>
            <div className="space-y-4">
              {season.episodes.slice(0, displayedEpisodes).map((episode) => (
                <div 
                  key={episode.id} 
                  className="bg-secondary/30 rounded-lg p-4 sm:p-6 hover:bg-secondary/50 transition-colors"
                >
                  <div className="grid grid-cols-4 gap-4">
                    {/* Episode Still */}
                    <div className="col-span-1">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary group cursor-pointer">
                        {episode.stillPath ? (
                          <img
                            src={episode.stillPath}
                            alt={episode.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Episode Info */}
                    <div className="col-span-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-foreground">
                          {episode.episodeNumber}. {episode.name}
                        </h3>
                        {episode.rating > 0 && (
                          <span className="px-2 py-1 bg-primary/20 text-primary rounded text-sm font-medium flex items-center gap-1 flex-shrink-0 ml-2">
                            <Award className="w-3 h-3" />
                            {episode.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mb-3 text-sm text-muted-foreground">
                        {episode.airDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(episode.airDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        )}
                        {episode.runtime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {episode.runtime} min
                          </span>
                        )}
                        {episode.voteCount > 0 && (
                          <span>({episode.voteCount.toLocaleString()} votes)</span>
                        )}
                      </div>

                      {episode.overview && (
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3">
                          {episode.overview}
                        </p>
                      )}

                      {/* Guest Stars */}
                      {episode.guestStars && episode.guestStars.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Guest Stars: </span>
                            {episode.guestStars.map(star => star.name).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {displayedEpisodes < season.episodes.length && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {isLoadingMore &&
                  <InlineLoadingSkeleton count={3} />
                }
              </div>
            )}

            {/* All Episodes Loaded */}
            {displayedEpisodes >= season.episodes.length && season.episodes.length > 12 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">All episodes loaded</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
