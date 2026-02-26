"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Film, Loader2 } from "lucide-react"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { VideoRowSkeleton } from "@/components/skeletons"

export default function VideosGrid({
  videos = [],
  loading = false,
  onLoadMore = null,
  hasMore = false,
  isLoadingMore = false,
  onVideoClick = null,
  isModalOpen = false,
  setIsModalOpen = null
}) {
  const [hoveredVideo, setHoveredVideo] = useState(null)
  const [videoLoaded, setVideoLoaded] = useState({})
  const [scrollPosition, setScrollPosition] = useState(0)

  const loadMoreRef = useInfiniteScroll(
    () => {
      if (onLoadMore && hasMore && !isLoadingMore) {
        onLoadMore()
      }
    },
    hasMore,
    isLoadingMore,
    300
  )

  const scroll = (direction) => {
    const container = document.getElementById('videos-carousel')
    if (container) {
      const scrollAmount = 400
      const newPosition = direction === "left" ? scrollPosition - scrollAmount : scrollPosition + scrollAmount
      container.scrollLeft = newPosition
      setScrollPosition(newPosition)
    }
  }

  const decodeHTMLEntities = (text) => {
    if (typeof window === "undefined") return text
    const textarea = document.createElement("textarea")
    textarea.innerHTML = text
    return textarea.value
  }

  if (loading) {
    return <VideoRowSkeleton />
  }

  if (videos.length === 0) {
    return null
  }

  return (
    <div className="relative group">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 z-10 cursor-pointer shadow-lg"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 z-10 cursor-pointer shadow-lg"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div
        id="videos-carousel"
        className="carousel-container flex gap-4 overflow-x-auto scroll-smooth pb-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {videos.length > 0 ? (videos.map((video, index) => (
          <div
            key={`${video.id || video.key}-${index}`}
            onClick={() => {
              if (onVideoClick) {
                onVideoClick(video)
              }
              if (setIsModalOpen) {
                setIsModalOpen(true)
              }
            }}
            onMouseEnter={() => setHoveredVideo(video.id || video.key)}
            onMouseLeave={() => {
              setHoveredVideo(null)
              setTimeout(() => {
                setVideoLoaded(prev => ({ ...prev, [video.id || video.key]: false }))
              }, 300)
            }}
            className="flex-shrink-0 w-80 group/video relative overflow-hidden rounded-lg cursor-pointer bg-secondary/50 aspect-video flex items-center justify-center transition-all duration-300"
          >
            {/* YouTube Thumbnail */}
            <img
              src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
              alt={decodeHTMLEntities(video.name)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                e.target.src = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`
              }}
            />

            {/* Preloaded iframe for smooth hover preview */}
            {hoveredVideo === (video.id || video.key) && (
              <>
                <iframe
                  src={`https://www.youtube.com/embed/${video.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${video.key}&playsinline=1&enablejsapi=1`}
                  title={decodeHTMLEntities(video.name)}
                  className={`absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-700 ${videoLoaded[video.id || video.key] ? 'opacity-100' : 'opacity-0'
                    }`}
                  allow="autoplay; encrypted-media"
                  frameBorder="0"
                  onLoad={() => {
                    setTimeout(() => {
                      setVideoLoaded(prev => ({ ...prev, [video.id || video.key]: true }))
                    }, 800)
                  }}
                />

                {!videoLoaded[video.id || video.key] && (
                  <div className="absolute inset-0 bg-secondary/50 animate-pulse z-20" />
                )}
              </>
            )}

            {/* Video Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col items-start justify-end p-4 transition-all duration-300">
              <p className="text-white font-semibold text-sm line-clamp-2 mb-1 transition-all duration-300 group-hover/video:text-primary">
                {decodeHTMLEntities(video.name)}
              </p>
              <p className="text-white/70 text-xs uppercase tracking-wide">{video.type || 'Video'}</p>
            </div>

            {/* Hover Border Effect */}
            <div className="absolute inset-0 border-2 border-transparent group-hover/video:border-primary/50 rounded-lg transition-all duration-300" />
          </div>
        ))) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Film className="w-12 h-12 mb-3 opacity-60" />
            <p className="text-sm font-medium">No videos available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back later for trailers or related clips.
            </p>
          </div>
        )}

        {hasMore && (
          <div ref={loadMoreRef} className="flex-shrink-0 w-16 flex items-center justify-center self-stretch">
            {isLoadingMore && (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
