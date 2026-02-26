"use client"

import { useRef, useState } from "react"
import { Play, Pause, Image as ImageIcon, Video } from "lucide-react"

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

export default function PostMediaPreview({ images = [], videos = [] }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Combine all media into one array
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

  const firstMedia = allMedia[0]
  const totalCount = allMedia.length
  const imageCount = (images || []).length
  const videoCount = (videos || []).length

  const handleVideoClick = (e) => {
    e.stopPropagation()
    if (firstMedia.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current.play().catch(() => {})
        setIsPlaying(true)
      }
    }
  }

  return (
    <div className="mt-3 mb-2">
      <div 
        className="relative bg-black/80 border border-border rounded-lg overflow-hidden aspect-[16/9] w-full max-w-full group"
      >
        {/* GIF - always plays */}
        {firstMedia.type === 'gif' && (
          <img
            src={firstMedia.url}
            alt="Post preview"
            className="w-full h-full object-contain"
          />
        )}

        {/* Video - plays on click */}
        {firstMedia.type === 'video' && (
          <div onClick={handleVideoClick} className="w-full h-full cursor-pointer">
            <video
              ref={videoRef}
              src={firstMedia.url}
              className="w-full h-full object-contain"
              loop
              muted
              playsInline
              preload="metadata"
            />
            {/* Play/Pause icon overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-all ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
              <div className="p-3 bg-black/60 rounded-full active:scale-90 transition-transform">
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white fill-white" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image */}
        {firstMedia.type === 'image' && (
          <img
            src={firstMedia.url}
            alt="Post preview"
            className="w-full h-full object-contain"
          />
        )}

        {/* Media count badge */}
        {totalCount > 1 && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs flex items-center gap-1">
            {imageCount > 0 && (
              <span className="flex items-center gap-0.5">
                <ImageIcon className="w-3 h-3" />
                {imageCount}
              </span>
            )}
            {imageCount > 0 && videoCount > 0 && <span>•</span>}
            {videoCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Video className="w-3 h-3" />
                {videoCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* More media indicator */}
      {totalCount > 1 && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          +{totalCount - 1} more {totalCount === 2 ? 'item' : 'items'}
        </p>
      )}
    </div>
  )
}
