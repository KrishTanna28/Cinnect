"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Newspaper, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { NewsRowSkeleton } from "@/components/skeletons"

export default function NewsCarousel({
  news = [],
  loading = false,
  onLoadMore = null,
  hasMore = false,
  isLoadingMore = false,
  entityName = ""
}) {
  const [scrollPosition, setScrollPosition] = useState(0)

  const loadMoreRef = useInfiniteScroll(
    () => {
      if (onLoadMore && hasMore && !isLoadingMore) {
        onLoadMore()
      }
    },
    hasMore,
    isLoadingMore,
    300
  )

  const scroll = (direction) => {
    const container = document.getElementById('news-carousel')
    if (container) {
      const scrollAmount = 400
      const newPosition = direction === "left" ? scrollPosition - scrollAmount : scrollPosition + scrollAmount
      container.scrollLeft = newPosition
      setScrollPosition(newPosition)
    }
  }

  if (loading) {
    return <NewsRowSkeleton />
  }

  if (news.length === 0) {
    return (
      <div className="bg-card rounded-lg p-8 text-center">
        <Newspaper className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No recent news articles found about {entityName}</p>
        <p className="text-sm text-muted-foreground mt-2">Check back later for updates</p>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div
        id="news-carousel"
        className="carousel-container flex gap-4 overflow-x-auto scroll-smooth pb-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-80 bg-card rounded-lg overflow-hidden hover:shadow-xl transition-shadow group/card"
          >
            <div className="w-full h-48 bg-secondary relative overflow-hidden">
              {article.urlToImage ? (
                <img
                  src={article.urlToImage}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Newspaper className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover/card:text-primary transition-colors">
                {article.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {article.description || 'No description available'}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="line-clamp-1">{article.source?.name || 'Unknown Source'}</span>
                <span>
                  {new Date(article.publishedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </a>
        ))}

        {hasMore && onLoadMore && (
          <div ref={loadMoreRef} className="flex-shrink-0 w-16 flex items-center justify-center self-stretch">
            {isLoadingMore && (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {news.length > 2 && (
        <>
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 z-10 cursor-pointer shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 bg-primary text-primary-foreground p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90 z-10 cursor-pointer shadow-lg"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}
    </div>
  )
}
