"use client"

import { useState } from "react"
import { Play, Share2, Heart, Clock, Award, Calendar, Film, Star, Bookmark, Check, Tv } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"
import { useRouter } from "next/navigation"
import VideoPlayerModal from "./video-player-modal"
import CastSection from "./cast-section"
import CrewSection from "./crew-section"
import ReviewPreview from "./review-preview"
import VideosGrid from "./videos-grid"
import NewsCarousel from "./news-carousel"

export default function TVDetailsClient({ 
  show, 
  initialLiked, 
  initialInWatchlist,
  videos = [],
  news = []
}) {
  const { user } = useUser()
  const router = useRouter()
  const [liked, setLiked] = useState(initialLiked)
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist)
  const [likeCount, setLikeCount] = useState(show.voteCount || 0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)

  const handleLike = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    const wasLiked = liked
    setLiked(!liked)
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1)

    try {
      const token = localStorage.getItem('token')
      
      if (wasLiked) {
        const response = await fetch(`/api/users/me/favorites/${show.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.message)
      } else {
        const response = await fetch('/api/users/me/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ movieId: show.id?.toString(), mediaType: 'tv' })
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error updating favorites:', error)
      setLiked(wasLiked)
      setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1))
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleWatchlist = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    const wasInWatchlist = inWatchlist
    setInWatchlist(!inWatchlist)

    try {
      const token = localStorage.getItem('token')
      
      if (wasInWatchlist) {
        const response = await fetch(`/api/users/me/watchlist/${show.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.message)
      } else {
        const response = await fetch('/api/users/me/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ movieId: show.id?.toString(), mediaType: 'tv' })
        })
        const data = await response.json()
        if (!data.success) throw new Error(data.message)
      }
    } catch (error) {
      console.error('Error updating watchlist:', error)
      setInWatchlist(wasInWatchlist)
      toast({
        title: "Error",
        description: "Failed to update watchlist. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: show.name,
      text: `Check out ${show.name} on Cinnect!`,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link Copied",
          description: "Link has been copied to clipboard!",
          variant: "success"
        })
      }
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handlePlayTrailer = () => {
    if (show.videos?.results?.length > 0) {
      const trailer = show.videos.results.find(v => v.type === 'Trailer') || show.videos.results[0]
      setSelectedVideo(trailer)
      setIsModalOpen(true)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative h-[70vh] min-h-[500px]">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://image.tmdb.org/t/p/original${show.backdropPath})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>

          <div className="relative container mx-auto px-4 h-full flex items-end pb-12">
            <div className="flex gap-8 w-full">
              <img
                src={`https://image.tmdb.org/t/p/w500${show.posterPath}`}
                alt={show.name}
                className="w-64 rounded-lg shadow-2xl hidden md:block"
              />

              <div className="flex-1 space-y-4">
                <h1 className="text-5xl font-bold text-white drop-shadow-lg">
                  {show.name}
                </h1>

                <div className="flex items-center gap-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-semibold">{show.voteAverage?.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{show.firstAirDate?.split('-')[0]}</span>
                  {show.numberOfSeasons && (
                    <>
                      <span>•</span>
                      <span>{show.numberOfSeasons} Season{show.numberOfSeasons > 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {show.genres?.map((genre) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handlePlayTrailer} size="lg" className="gap-2">
                    <Play className="w-5 h-5" />
                    Play Trailer
                  </Button>
                  <Button onClick={handleLike} variant="outline" size="lg" className="gap-2">
                    <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                    {liked ? 'Liked' : 'Like'}
                  </Button>
                  <Button onClick={handleWatchlist} variant="outline" size="lg" className="gap-2">
                    {inWatchlist ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    {inWatchlist ? 'In Watchlist' : 'Watchlist'}
                  </Button>
                  <Button onClick={handleShare} variant="outline" size="lg">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-4 py-12 space-y-12">
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Overview</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {show.overview}
            </p>
          </section>

          {/* Show Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Tv className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Seasons</p>
                <p className="font-semibold">{show.numberOfSeasons}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Film className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Episodes</p>
                <p className="font-semibold">{show.numberOfEpisodes}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">First Air Date</p>
                <p className="font-semibold">
                  {new Date(show.firstAirDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Award className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">{show.status}</p>
              </div>
            </div>
          </section>

          {/* Cast */}
          {show.credits?.cast && (
            <CastSection cast={show.credits.cast} />
          )}

          {/* Crew */}
          {show.credits?.crew && (
            <CrewSection crew={show.credits.crew} />
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Videos & Clips</h2>
              <VideosGrid 
                videos={videos} 
                onVideoClick={(video) => {
                  setSelectedVideo(video)
                  setIsModalOpen(true)
                }}
              />
            </section>
          )}

          {/* News */}
          {news.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Latest News</h2>
              <NewsCarousel news={news} />
            </section>
          )}

          {/* Reviews */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Reviews</h2>
              <Link href={`/reviews/tv/${show.id}`}>
                <Button variant="outline">View All Reviews</Button>
              </Link>
            </div>
            <ReviewPreview mediaId={show.id} mediaType="tv" />
          </section>
        </div>
      </div>

      <VideoPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        video={selectedVideo}
      />
    </>
  )
}
