"use client"

import { useState, useEffect } from "react"
import { Star, ThumbsUp, MessageCircle, ArrowRight, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"
import { ReviewListSkeleton } from "@/components/skeletons"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export default function ReviewPreview({ mediaId, mediaType, mediaTitle }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, averageRating: 0 })
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set())
  const { user } = useUser()

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/reviews?mediaType=${mediaType}&mediaId=${mediaId}&page=1&limit=3&sortBy=popular`
        )
        const data = await response.json()

        if (data.success) {
          setReviews(data.data)
          setStats({
            total: data.pagination.total,
            averageRating: calculateAverageRating(data.data)
          })
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [mediaId, mediaType])

  const calculateAverageRating = (reviews) => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  if (loading) {
    return <ReviewListSkeleton count={2} />
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-card rounded-lg p-8 text-center">
        <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">No reviews yet. Be the first to review!</p>
        <Link href={`/reviews/${mediaType}/${mediaId}`}>
          <Button>Write a Review</Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-4 bg-secondary/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{stats.averageRating}</div>
            {/* <div className="text-xs text-muted-foreground">out of 10</div> */}
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
            {[...Array(10)].map((_, i) => {
  const full = i + 1 <= stats.averageRating
  const partial = !full && i < stats.averageRating

  return (
    <div key={i} className="relative w-4 h-4 inline-block">
      <Star
        className="w-4 h-4 text-muted-foreground absolute top-0 left-0"
        stroke="currentColor"
        fill="none"
      />
      {full && (
        <Star
          className="w-4 h-4 text-primary absolute top-0 left-0"
          stroke="currentColor"
          fill="currentColor"
        />
      )}
      {partial && (
        <div
          className="absolute top-0 left-0 overflow-hidden"
          style={{ width: `${(stats.averageRating - i) * 100}%` }}
        >
          <Star
            className="w-4 h-4 text-primary"
            stroke="currentColor"
            fill="currentColor"
          />
        </div>
      )}
    </div>
  )
})}
            </div>
            <p className="text-sm text-muted-foreground">{stats.total == 1 ? "1 review" : `${stats.total} reviews`}</p>
          </div>
        </div>
        <Link href={`/reviews/${mediaType}/${mediaId}`}>
          <Button variant="outline" size="sm">
            View All Reviews
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Review Cards */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const isSpoilerRevealed = revealedSpoilers.has(review._id)
          const isOwnReview = user && review.user?._id === user._id
          const shouldBlur = review.spoiler && !isSpoilerRevealed && !isOwnReview

          return (
            <div key={review._id} className="bg-card rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  {review.user?.avatar ? (
                    <img src={review.user.avatar} alt={review.user.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-foreground">
                      {review.user?.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{review.user?.username}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(10)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {review.rating}/10
                    </span>
                    {review.spoiler && (
                      <span className="px-2 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        SPOILER
                      </span>
                    )}
                  </div>

                  {/* Review Content with Spoiler Blur */}
                  <div className="relative">
                    <h4 className={`font-semibold text-foreground mb-2 line-clamp-1 transition-all ${
                      shouldBlur ? 'blur-md select-none' : ''
                    }`}>
                      {review.title}
                    </h4>
                    <p className={`text-sm text-muted-foreground line-clamp-2 transition-all ${
                      shouldBlur ? 'blur-md select-none' : ''
                    }`}>
                      {review.content}
                    </p>

                    {/* Spoiler Reveal Button */}
                    {shouldBlur && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          onClick={() => {
                            const newRevealed = new Set(revealedSpoilers)
                            newRevealed.add(review._id)
                            setRevealedSpoilers(newRevealed)
                          }}
                          className="px-3 py-1.5 bg-destructive/90 hover:bg-destructive text-white rounded-lg text-xs font-semibold transition-colors shadow-lg"
                        >
                          Click to Reveal Spoiler
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {review.likeCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {review.replyCount || 0}
                    </span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
