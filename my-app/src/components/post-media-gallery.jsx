"use client"

import { useState, useRef, useEffect } from "react"
import { X, ChevronLeft, ChevronRight, RotateCcw, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react"

// Helper to check if URL is a GIF
const isGif = (url) => {
  if (!url) return false
  return url.toLowerCase().includes('.gif') || url.toLowerCase().includes('gif')
}

// Helper to check if URL is a video
const isVideo = (url) => {
  if (!url) return false
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || 
         url.includes('/video/') || 
         url.includes('resource_type=video')
}

export default function PostMediaGallery({ images = [], videos = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)
  
  // Combine all media into one array with type info
  const allMedia = [
    ...(images || []).map(url => ({ 
      url, 
      type: isGif(url) ? 'gif' : 'image' 
    })),
    ...(videos || []).map(url => ({ 
      url, 
      type: 'video' 
    }))
  ]

  if (allMedia.length === 0) return null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1))
  }

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setShowLightbox(false)
    if (e.key === "ArrowLeft") goToPrevious()
    if (e.key === "ArrowRight") goToNext()
  }

  const currentMedia = allMedia[currentIndex]

  return (
    <>
      {/* Main Gallery */}
      <div className="mb-4 relative group">
        <div 
          className="overflow-hidden rounded-lg border border-border bg-black/80 cursor-pointer"
          onClick={() => setShowLightbox(true)}
        >
          <MediaItem 
            media={currentMedia} 
            className="w-full max-h-[500px] object-contain"
            showControls={true}
            onPrevious={goToPrevious}
            onNext={goToNext}
            hasMultiple={allMedia.length > 1}
          />
        </div>

        {/* Navigation Arrows */}
        {allMedia.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white hover:text-primary opacity-0 group-hover:opacity-100 transition-all active:scale-90 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white hover:text-primary opacity-0 group-hover:opacity-100 transition-all active:scale-90 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {allMedia.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {allMedia.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentIndex 
                    ? 'bg-primary w-4' 
                    : 'bg-white/50 hover:bg-primary/75'
                }`}
              />
            ))}
          </div>
        )}

        {/* Media Counter */}
        {allMedia.length > 1 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded text-white text-xs">
            {currentIndex + 1} / {allMedia.length}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <MediaLightbox
          media={allMedia}
          currentIndex={currentIndex}
          onClose={() => setShowLightbox(false)}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onKeyDown={handleKeyDown}
          setCurrentIndex={setCurrentIndex}
        />
      )}
    </>
  )
}

// Individual Media Item Component
function MediaItem({ media, className = "", showControls = true, inLightbox = false, onPrevious, onNext, hasMultiple = false }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControlsOverlay, setShowControlsOverlay] = useState(true)
  const controlsTimeoutRef = useRef(null)

  // Format time as M:SS
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00"
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Handle video click to play/pause
  const handleVideoClick = (e) => {
    e.stopPropagation()
    if (media.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  // Handle seek
  const handleSeek = (e) => {
    e.stopPropagation()
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * duration
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleRestart = (e) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handlePlayPause = (e) => {
    e.stopPropagation()
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }

  const handleMuteToggle = (e) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Show controls on mouse move, hide after delay
  const handleMouseMove = () => {
    setShowControlsOverlay(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControlsOverlay(false)
      }, 3000)
    }
  }

  // GIF - auto plays, no controls needed
  if (media.type === 'gif') {
    return (
      <img
        src={media.url}
        alt="GIF"
        className={`${className} hover:scale-105 transition-transform duration-300`}
      />
    )
  }

  // Video - plays on click with YouTube-style controls
  if (media.type === 'video') {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
      <div 
        className="relative w-full h-full bg-black"
        onClick={handleVideoClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControlsOverlay(false)}
      >
        <video
          ref={videoRef}
          src={media.url}
          className={className}
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
        
        {/* Play indicator when not playing */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="p-4 bg-black/60 rounded-full">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        )}

        {/* YouTube-style bottom controls */}
        {showControls && (
          <div 
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-8 pb-2 px-2 transition-opacity duration-300 ${
              showControlsOverlay || !isPlaying ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bar */}
            <div 
              className="w-full h-1 bg-white/30 rounded-full mb-2 cursor-pointer group/progress"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-primary rounded-full relative transition-all"
                style={{ width: `${progress}%` }}
              >
                {/* Seek dot */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-1">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="p-1.5 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                {/* Previous/Next for multiple media */}
                {hasMultiple && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onPrevious?.(); }}
                      className="p-1.5 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
                      title="Previous"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                      className="p-1.5 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
                      title="Next"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Mute */}
                <button
                  onClick={handleMuteToggle}
                  className="p-1.5 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Time Display */}
                <span className="text-white text-xs ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1">
                {/* Restart */}
                <button
                  onClick={handleRestart}
                  className="p-1.5 text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular Image
  return (
    <img
      src={media.url}
      alt="Post image"
      className={`${className} hover:scale-105 transition-transform duration-300`}
    />
  )
}

// Lightbox Component
function MediaLightbox({ media, currentIndex, onClose, onPrevious, onNext, onKeyDown, setCurrentIndex }) {
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = "auto"
    }
  }, [onKeyDown])

  const currentMedia = media[currentIndex]

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 transition-all active:scale-90 cursor-pointer z-10"
      >
        <X className="w-6 h-6 text-muted-foreground hover:text-primary" />
      </button>

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white hover:text-primary transition-all active:scale-90 cursor-pointer"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Media Display */}
      <div 
        className="max-w-[90vw] max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaItem 
          media={currentMedia} 
          className="max-w-[90vw] max-h-[90vh] object-contain"
          showControls={true}
          inLightbox={true}
          onPrevious={onPrevious}
          onNext={onNext}
          hasMultiple={media.length > 1}
        />
      </div>

      {/* Thumbnail Strip */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[90vw] overflow-x-auto p-2 bg-black/60 rounded-lg">
          {media.map((item, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden cursor-pointer transition-all ${
                idx === currentIndex ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              ) : (
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 rounded text-white text-sm">
        {currentIndex + 1} / {media.length}
      </div>
    </div>
  )
}
