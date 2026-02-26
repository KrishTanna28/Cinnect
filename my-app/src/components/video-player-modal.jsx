"use client"

import { X } from "lucide-react"
import { useEffect } from "react"

export default function VideoPlayerModal({videoKey, videoTitle, onClose }) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  if (!videoKey) return null

  return (
    <div
      className="mt-20 fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4 aspect-video animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 transition-all active:scale-90 cursor-pointer"
          aria-label="Close video"
        >
          <X className="w-8 h-8 text-muted-foreground hover:text-primary" />
        </button>

        {/* Video Title */}
        {videoTitle && (
          <div className="absolute -top-12 left-0 text-white">
            <h3 className="text-lg font-semibold">{videoTitle}</h3>
          </div>
        )}

        {/* Video Container */}
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
            title={videoTitle || "Video player"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  )
}
