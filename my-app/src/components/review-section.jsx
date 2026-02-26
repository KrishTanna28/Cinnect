"use client"

import { useState } from "react"
import { Heart, MessageCircle, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReviewSection({ reviews, movieTitle }) {
  const [userReview, setUserReview] = useState("")
  const [userRating, setUserRating] = useState(5)
  const [likedReviews, setLikedReviews] = useState(new Set())

  const toggleLike = (reviewId) => {
    const newLiked = new Set(likedReviews)
    if (newLiked.has(reviewId)) {
      newLiked.delete(reviewId)
    } else {
      newLiked.add(reviewId)
    }
    setLikedReviews(newLiked)
  }

  const handleSubmitReview = () => {
    if (userReview.trim()) {
      setUserReview("")
      setUserRating(5)
    }
  }

  return (
    <section className="pb-12">
      <h2 className="text-3xl font-bold text-foreground mb-8">Reviews & Discussions</h2>

      {/* Write Review */}
      <div className="bg-secondary/30 rounded-lg p-6 mb-8 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Share Your Thoughts</h3>

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-muted-foreground mb-2">Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
              <button
                key={rating}
                onClick={() => setUserRating(rating)}
                className={`w-10 h-10 rounded-lg font-semibold transition-colors cursor-pointer ${
                  userRating >= rating
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>

        {/* Review Text */}
        <textarea
          value={userReview}
          onChange={(e) => setUserReview(e.target.value)}
          placeholder="Write your review here... (minimum 10 characters)"
          className="w-full p-4 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={4}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setUserReview("")}>
            Cancel
          </Button>
          <Button onClick={handleSubmitReview} disabled={userReview.trim().length < 10}>
            Post Review
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-secondary/20 rounded-lg p-6 border border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                  {review.userName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{review.userName}</p>
                  <p className="text-xs text-muted-foreground">{review.timestamp}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rating-badge">{review.rating}</span>
              </div>
            </div>

            <p className="text-foreground mb-4 leading-relaxed">{review.text}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleLike(review.id)}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${likedReviews.has(review.id) ? "fill-current text-primary" : ""}`} />
                <span className="text-sm">{review.likes}</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Reply</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-destructive transition-all active:scale-95 ml-auto cursor-pointer">
                <Flag className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
