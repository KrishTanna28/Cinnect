"use client"

import { useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import MovieCard from "@/components/movie-card"

export default function RecommendationCarousel({
  title,
  movies = [],
  requireAuth = false,
  onLoadMore = null,
  hasMore = false,
  isLoadingMore = false
}) {
  const containerRef = useRef(null)
  const router = useRouter()

  // Filter duplicates by unique id + mediaType
  const uniqueMovies = movies.filter(
    (m, i, self) =>
      i === self.findIndex(t => t.id === m.id && t.mediaType === m.mediaType)
  )

  const loadMoreRef = useInfiniteScroll(
    () => {
      if (onLoadMore && hasMore && !isLoadingMore) onLoadMore()
    },
    hasMore,
    isLoadingMore,
    300
  )

  const scroll = useCallback((direction) => {
    const container = containerRef.current
    if (!container) return
    const scrollAmount = 400
    const newPosition = direction === "left"
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount
    container.scrollTo({ left: newPosition, behavior: "smooth" })
  }, [])

  return (
    <section className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      </div>

      <div className="relative group">
        <div
          ref={containerRef}
          className="carousel-container flex gap-3 overflow-x-auto pb-4 touch-pan-x"
          style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
        >
          {uniqueMovies.map((movie, index) => {
            const key = `${movie.mediaType || "movie"}-${movie.id}-${index}`

            return (
              <div key={key} className="flex-shrink-0 w-36">
                <MovieCard
                  movie={movie}
                  alwaysShowInfo={false}
                  onClick={requireAuth ? () => router.push("/login") : undefined}
                  draggable={false}
                />
              </div>
            )
          })}

          {hasMore && onLoadMore && (
            <div
              ref={loadMoreRef}
              className="flex-shrink-0 w-16 flex items-center justify-center self-stretch"
            >
              {isLoadingMore && (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>
    </section>
  )
}
