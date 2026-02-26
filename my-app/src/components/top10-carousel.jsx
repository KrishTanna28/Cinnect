"use client"

import { useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function Top10Carousel({
  title,
  movies = [],
  description,
  requireAuth = false,
}) {
  const containerRef = useRef(null)
  const router = useRouter()

  // Only show first 10
  const items = movies.slice(0, 10)

  const scroll = useCallback((direction) => {
    const container = containerRef.current
    if (!container) return

    const scrollAmount = 400
    const newPosition =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: newPosition,
      behavior: "smooth",
    })
  }, [])

  if (items.length === 0) return null

  return (
    <section className="py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Wrapper prevents page overflow but keeps swipe */}
      <div className="relative group overflow-hidden">
        <div
          ref={containerRef}
          className="carousel-container flex gap-3 overflow-x-auto overflow-y-hidden pb-6 touch-pan-x items-end"
          style={{
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((movie, index) => {
            const rank = index + 1

            const detailHref =
              movie.mediaType === "tv"
                ? `/tv/${movie.id}`
                : `/movies/${movie.id}`

            const card = (
              <div
                className="flex-shrink-0 relative flex items-end"
                style={{
                  width: "clamp(180px,22vw,240px)",
                  height: "clamp(220px,28vw,300px)",
                }}
              >
                {/* BIG RANK NUMBER */}
                <span
  className="absolute bottom-0 -left-2 font-black select-none pointer-events-none text-primary"
  style={{
    fontSize: "220px",
    lineHeight: "0.8",
    opacity: 0.28,
    zIndex: 0,
  }}
>
  {rank}
</span>

                {/* POSTER */}
                <div
                  className="absolute right-2 bottom-1 z-10 rounded-lg overflow-hidden shadow-2xl border-2 border-border/40 group/card"
                  style={{
                    width: "clamp(100px,12vw,140px)",
                    height: "clamp(150px,18vw,210px)",
                  }}
                >
                  <img
                    src={movie.poster || "/placeholder.svg"}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-end p-2">
                    <div className="w-full">
                      <h3 className="font-bold text-white text-xs line-clamp-2 mb-1">
                        {movie.title}
                      </h3>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-primary font-semibold">
                          {movie.rating?.toFixed(1)}
                        </span>

                        <span className="text-[10px] text-white/70">
                          {movie.releaseDate?.split("-")[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )

            return requireAuth ? (
              <div
                key={`top10-${movie.id}-${index}`}
                onClick={() => router.push("/login")}
                className="cursor-pointer touch-manipulation group/card"
              >
                {card}
              </div>
            ) : (
              <Link
                key={`top10-${movie.id}-${index}`}
                href={detailHref}
                className="cursor-pointer touch-manipulation block group/card"
                draggable={false}
              >
                {card}
              </Link>
            )
          })}
        </div>

        {/* LEFT BUTTON */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 z-20 shadow-lg"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>

        {/* RIGHT BUTTON */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 z-20 shadow-lg"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {/* Local scrollbar hide */}
      <style jsx>{`
        .carousel-container::-webkit-scrollbar {
          display: none;
        }
        .carousel-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </section>
  )
}