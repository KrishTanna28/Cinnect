"use client"

import Link from "next/link"

/**
 * MovieCard — Unified card component used across the app.
 *
 * Props:
 *   movie         — { id, title, poster, rating, releaseDate, year, mediaType }
 *   alwaysShowInfo — If true, info overlay is always visible (grid pages).
 *                    If false, overlay only appears on hover (carousels).
 *   href          — Custom link. Falls back to /movies/:id or /tv/:id.
 *   onClick       — Optional click handler (e.g. requireAuth redirect).
 *   className     — Extra classes on the outer wrapper.
 *   draggable     — Passed to the img element (default false).
 */
export default function MovieCard({
  movie,
  alwaysShowInfo = false,
  href,
  onClick,
  className = "",
  draggable = false,
}) {
  const detailHref =
    href ||
    (movie.mediaType === "tv" ? `/tv/${movie.id}` : `/movies/${movie.id}`)

  const year =
    movie.releaseDate?.split("-")[0] || movie.year || null

  const card = (
    <div
      className={`poster-card group/card ${alwaysShowInfo ? "aspect-[2/3]" : ""} ${className}`}
    >
      {/* Poster */}
      {movie.poster ? (
        <img
          src={movie.poster}
          alt={movie.title}
          className={`rounded-lg object-cover ${
            alwaysShowInfo ? "w-full h-full" : "w-full h-54"
          }`}
          draggable={draggable}
        />
      ) : (
        <div
          className={`w-full rounded-lg bg-secondary flex items-center justify-center ${
            alwaysShowInfo ? "h-full" : "h-54"
          }`}
        >
          <span className="text-4xl text-muted-foreground">🎬</span>
        </div>
      )}

      {/* Info overlay — gradient from bottom */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-2 sm:p-3 transition-opacity duration-300 ${
          alwaysShowInfo
            ? "opacity-100"
            : "opacity-0 group-hover/card:opacity-100"
        }`}
      >
        <div className="w-full">
          {/* Media type badge */}
          {movie.mediaType && (
            <span className="inline-block px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-primary text-primary-foreground rounded text-[10px] sm:text-xs font-bold uppercase mb-1">
              {movie.mediaType === "tv" ? "TV" : "Movie"}
            </span>
          )}

          {/* Title */}
          <h3 className="font-bold text-white text-xs sm:text-sm leading-tight line-clamp-2 mb-1">
            {movie.title}
          </h3>

          {/* Rating + Year */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {movie.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-primary text-[11px] sm:text-xs font-semibold bg-black/50">
                ★ {movie.rating.toFixed(1)}
              </span>
            )}
            {year && (
              <span className="text-[10px] sm:text-xs text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                {year}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (onClick) {
    return (
      <div onClick={onClick} className="cursor-pointer touch-manipulation">
        {card}
      </div>
    )
  }

  return (
    <Link
      href={detailHref}
      className="cursor-pointer touch-manipulation block"
      draggable={false}
    >
      {card}
    </Link>
  )
}
