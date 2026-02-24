import { Clapperboard } from "lucide-react"
import { useState } from "react"

export default function ClipsSection({ isModalOpen, setIsModalOpen, videos, movieTitle, selectedVideo, setSelectedVideo, hideHeading = false }) {
  const [hoveredVideo, setHoveredVideo] = useState(null)
  const [videoLoaded, setVideoLoaded] = useState({})

  if (!videos || videos.length === 0) {
    return null
  }

  // Sort videos to prioritize Trailers first, then Teasers
  const displayVideos = videos
    .filter(video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser' || video.type === 'Featured'))
    .sort((a, b) => {
      // Trailers come first
      if (a.type === 'Trailer' && b.type !== 'Trailer') return -1
      if (a.type !== 'Trailer' && b.type === 'Trailer') return 1
      // Then sort by official status
      if (a.official && !b.official) return -1
      if (!a.official && b.official) return 1
      return 0
    })
    .slice(0, 12)

  if (displayVideos.length === 0) {
    return null
  }

  const openVideo = (video) => {
    setSelectedVideo(video)
  }

  const closeVideo = () => {
    setSelectedVideo(null)
  }

  return (
    <>
      <section>
        {!hideHeading && (
          <div className="flex items-center gap-3 mb-6">
              <Clapperboard className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Trailers & Clips</h2>
            </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => {openVideo(video); setIsModalOpen(true)}}
              onMouseEnter={() => setHoveredVideo(video.id)}
              onMouseLeave={() => {
                setHoveredVideo(null)
                // Reset loaded state when mouse leaves
                setTimeout(() => {
                  setVideoLoaded(prev => ({ ...prev, [video.id]: false }))
                }, 300)
              }}
              className="group relative overflow-hidden rounded-lg cursor-pointer bg-secondary/50 aspect-video flex items-center justify-center transition-all duration-300"
            >
              {/* YouTube Thumbnail */}
              <img
                src={`https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`}
                alt={video.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  // Fallback to hqdefault if maxresdefault is not available
                  e.target.src = `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`
                }}
              />
              
              {/* Preloaded iframe for smooth hover preview */}
              {hoveredVideo === video.id && (
                <>
                  <iframe
                    src={`https://www.youtube.com/embed/${video.key}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&loop=1&playlist=${video.key}&playsinline=1&enablejsapi=1`}
                    title={video.name}
                    className={`absolute inset-0 w-full h-full object-cover scale-110 transition-opacity duration-700 ${
                      videoLoaded[video.id] ? 'opacity-100' : 'opacity-0'
                    }`}
                    allow="autoplay; encrypted-media"
                    frameBorder="0"
                    onLoad={() => {
                      // Delay to let video start playing before showing
                      setTimeout(() => {
                        setVideoLoaded(prev => ({ ...prev, [video.id]: true }))
                      }, 800)
                    }}
                  />
                  
                  {/* Loading overlay to hide YouTube UI */}
                  {!videoLoaded[video.id] && (
                    <div className="absolute inset-0 bg-secondary/50 animate-pulse z-20" />
                  )}
                </>
              )}
              
              {/* Play Button - only show when not hovering */}
              {/* {hoveredVideo !== video.id && (
                <div className="relative z-10 transition-all duration-300 group-hover:scale-125 group-hover:opacity-0">
                  <div className="w-16 h-16 rounded-full bg-primary/90 group-hover:bg-primary flex items-center justify-center shadow-lg">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                </div>
              )} */}

              {/* Video Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col items-start justify-end p-4 transition-all duration-300">
                <p className="text-white font-semibold text-sm line-clamp-2 mb-1 transition-all duration-300 group-hover:text-primary">
                  {video.name}
                </p>
                <p className="text-white/70 text-xs uppercase tracking-wide">{video.type}</p>
              </div>

              {/* Hover Border Effect */}
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 rounded-lg transition-all duration-300" />
            </div>
          ))}
        </div>
      </section>
      {/* Video Player Modal */}
    </>
  )
}
