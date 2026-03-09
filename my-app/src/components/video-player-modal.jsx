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
      className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar with Title and Close */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10" onClick={(e) => e.stopPropagation()}>
        {videoTitle && (
          <h3 className="text-lg font-semibold text-white truncate mr-4">{videoTitle}</h3>
        )}
        <button
          onClick={onClose}
          className="ml-auto p-2 transition-all active:scale-90 cursor-pointer"
          aria-label="Close video"
        >
          <X className="w-8 h-8 text-muted-foreground hover:text-primary" />
        </button>
      </div>

      {/* Fullscreen Video Container */}
      <div
        className="flex-1 relative animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
          title={videoTitle || "Video player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  )
}
