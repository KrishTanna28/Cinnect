"use client"

import { useState, useEffect } from "react"
import { Tv2, ExternalLink } from "lucide-react"

/**
 * StreamingProviders
 * Fetches and displays streaming providers for a movie or TV show (region: IN).
 *
 * Props:
 *   type  — "movie" | "tv"
 *   id    — TMDB content ID (number or string)
 */
export default function StreamingProviders({ type, id }) {
  const [providers, setProviders] = useState([])
  const [watchLink, setWatchLink] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!type || !id) return

    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(`/api/content/${type}/${id}/providers`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setProviders(Array.isArray(data.providers) ? data.providers : [])
          setWatchLink(data.link || null)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [type, id])

  if (loading) {
    return (
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Available On
        </p>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-20 h-10 rounded-lg bg-secondary/60 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) return null

  return (
    <div className="mb-6 sm:mb-8">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Available On
      </p>

      {providers.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tv2 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Not available for streaming in your region</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <a
              key={provider.id}
              href={watchLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={`Watch on ${provider.name}`}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-secondary/60 border border-border rounded-lg hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-200 group cursor-pointer"
            >
              {provider.logo ? (
                <img
                  src={provider.logo}
                  alt={provider.name}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded object-contain"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-primary/20 flex items-center justify-center">
                  <Tv2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                </div>
              )}
              <span className="text-[11px] sm:text-xs font-medium text-foreground whitespace-nowrap group-hover:text-primary transition-colors">
                {provider.name}
              </span>
              <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
