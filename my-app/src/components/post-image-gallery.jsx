"use client"

import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

export default function PostImageGallery({ images = [] }) {
  const [showLightbox, setShowLightbox] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!images || images.length === 0) return null

  const openLightbox = (index) => {
    setCurrentImageIndex(index)
    setShowLightbox(true)
  }

  const closeLightbox = () => {
    setShowLightbox(false)
  }

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleKeyDown = (e) => {
    if (e.key === "Escape") closeLightbox()
    if (e.key === "ArrowLeft") goToPrevious()
    if (e.key === "ArrowRight") goToNext()
  }

  // Single image
  if (images.length === 1) {
    return (
      <>
        <div 
          className="mb-4 cursor-pointer overflow-hidden rounded-lg border border-border bg-black/80"
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0]}
            alt="Post image"
            className="w-full max-h-[500px] object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>
        {showLightbox && (
          <ImageLightbox
            images={images}
            currentIndex={currentImageIndex}
            onClose={closeLightbox}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onKeyDown={handleKeyDown}
          />
        )}
      </>
    )
  }

  // Two images - side by side with fixed height
  if (images.length === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {images.map((image, idx) => (
            <div
              key={idx}
              className="cursor-pointer overflow-hidden rounded-lg border border-border bg-black/80 h-64"
              onClick={() => openLightbox(idx)}
            >
              <img
                src={image}
                alt={`Post image ${idx + 1}`}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
        {showLightbox && (
          <ImageLightbox
            images={images}
            currentIndex={currentImageIndex}
            onClose={closeLightbox}
            onPrevious={goToPrevious}
            onNext={goToNext}
            onKeyDown={handleKeyDown}
          />
        )}
      </>
    )
  }

  // Three or more images - frame layout
  const remainingCount = images.length - 3

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4 h-80">
        {/* Left side - large image */}
        <div
          className="row-span-2 cursor-pointer overflow-hidden rounded-lg border border-border bg-black/80"
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0]}
            alt="Post image 1"
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Right side - two stacked images */}
        <div
          className="cursor-pointer overflow-hidden rounded-lg border border-border bg-black/80"
          onClick={() => openLightbox(1)}
        >
          <img
            src={images[1]}
            alt="Post image 2"
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div
          className="cursor-pointer overflow-hidden rounded-lg border border-border bg-black/80 relative"
          onClick={() => openLightbox(2)}
        >
          <img
            src={images[2]}
            alt="Post image 3"
            className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
          />
          {remainingCount > 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm hover:backdrop-blur-none transition-all">
              <span className="text-white text-4xl font-bold">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {showLightbox && (
        <ImageLightbox
          images={images}
          currentIndex={currentImageIndex}
          onClose={closeLightbox}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onKeyDown={handleKeyDown}
        />
      )}
    </>
  )
}

function ImageLightbox({ images, currentIndex, onClose, onPrevious, onNext, onKeyDown }) {
  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 transition-all active:scale-90 z-10 cursor-pointer"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-muted-foreground hover:text-primary" />
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={onPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 z-10"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {/* Image with blur background */}
      <div className="max-w-7xl max-h-[90vh] mx-auto px-20 relative">
        {/* Blurred background */}
        <div
          className="absolute inset-0 -m-20 scale-110"
          style={{
            backgroundImage: `url(${images[currentIndex]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(30px)",
            opacity: 0.5,
          }}
        />
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="relative z-10 max-w-full max-h-[90vh] object-contain rounded-lg mx-auto"
        />
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-90 z-10"
          aria-label="Next image"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 text-white rounded-full text-sm font-medium backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}
