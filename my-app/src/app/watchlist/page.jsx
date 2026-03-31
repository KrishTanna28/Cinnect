"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trash2, Share2, MoreVertical, Loader2, Film } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { WatchlistSkeleton } from "@/components/skeletons"

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Fetch watchlist IDs from the user's account
      const res = await fetch("/api/users/me/watchlist")
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch watchlist")
      }

      const watchlistItems = data.data || []

      // Enrich each item with TMDB movie details
      const enriched = await Promise.all(
        watchlistItems.map(async (item) => {
          try {
            const movieRes = await fetch(`/api/movies/${item.movieId}`)
            const movieData = await movieRes.json()
            if (movieRes.ok && movieData) {
              return {
                id: item.movieId,
                title: movieData.title || movieData.name || "Unknown",
                description: movieData.overview || "",
                poster: movieData.poster_path
                  ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}`
                  : null,
                rating: movieData.vote_average
                  ? movieData.vote_average.toFixed(1)
                  : "N/A",
                year: movieData.release_date
                  ? movieData.release_date.split("-")[0]
                  : movieData.first_air_date
                    ? movieData.first_air_date.split("-")[0]
                    : "N/A",
                genres: movieData.genres
                  ? movieData.genres.map((g) => g.name)
                  : [],
                addedAt: item.addedAt,
              }
            }
          } catch {
            // If TMDB fetch fails, return minimal item
          }
          return {
            id: item.movieId,
            title: `Movie #${item.movieId}`,
            description: "",
            poster: null,
            rating: "N/A",
            year: "N/A",
            genres: [],
            addedAt: item.addedAt,
          }
        })
      )

      setWatchlist(enriched)
    } catch (err) {
      console.error("Watchlist fetch error:", err)
      setError(err.message || "Failed to load watchlist")
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromWatchlist = async (movieId) => {
    try {
      const res = await fetch(`/api/users/me/watchlist/${movieId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setWatchlist((prev) => prev.filter((m) => m.id !== movieId))
      }
    } catch (err) {
      console.error("Remove from watchlist error:", err)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-secondary/30 border-b border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-2">My Watchlist</h1>
          {!isLoading && !error && (
            <p className="text-muted-foreground">{watchlist.length} items</p>
          )}
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <WatchlistSkeleton />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive text-lg mb-4">{error}</p>
            <Link href="/login">
              <Button>Log In</Button>
            </Link>
          </div>
        ) : watchlist.length > 0 ? (
          <div className="space-y-4">
            {watchlist.map((movie) => (
              <div
                key={movie.id}
                className="bg-secondary/20 rounded-lg p-6 border border-border hover:border-primary/50 transition-colors flex items-center gap-6"
              >
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-24 h-32 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-32 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Film className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Link href={`/movies/${movie.id}`} className="cursor-pointer">
                    <h3 className="text-xl font-bold text-foreground hover:text-primary transition-colors mb-2">
                      {movie.title}
                    </h3>
                  </Link>
                  {movie.description && (
                    <p className="text-muted-foreground mb-3 line-clamp-2">{movie.description}</p>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    {movie.rating !== "N/A" && (
                      <span className="rating-badge">{movie.rating}</span>
                    )}
                    {movie.year !== "N/A" && (
                      <span className="text-sm text-muted-foreground">{movie.year}</span>
                    )}
                    {movie.genres.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {movie.genres.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="cursor-pointer p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => removeFromWatchlist(movie.id)}>
                        <Trash2 className="w-4 h-4" />
                        Remove from Watchlist
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">Your watchlist is empty</p>
            <Link href="/browse" className="cursor-pointer">
              <Button>Browse Content</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
