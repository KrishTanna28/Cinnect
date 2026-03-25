"use client"

import { useState, useEffect } from "react"
import { X, Star, ThumbsUp, ThumbsDown, MessageCircle, AlertTriangle, EyeOff, Calendar, Clock, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"

export default function ReviewDetailModal({
  isOpen,
  onClose,
  review,
  onLike,
  onDislike,
  mediaType,
  mediaId
}) {
  const { user } = useUser()
  const [revealSpoiler, setRevealSpoiler] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setRevealSpoiler(false)
    }
  }, [isOpen])

  if (!isOpen || !review) return null

  const isTMDB = review.isTMDB === true
  const isOwnReview = user && review.user?._id === user._id
  const shouldBlur = review.spoiler && !revealSpoiler && !isOwnReview
  const userLiked = review.likes?.some(id => id?.toString() === user?._id?.toString())
  const userDisliked = review.dislikes?.some(id => id?.toString() === user?._id?.toString())

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-background border border-border rounded-2xl shadow-xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            {/* User Avatar */}
            {isTMDB ? (
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                <AvatarImage src={review.user?.avatar} alt={review.user?.username} />
                <AvatarFallback className="bg-blue-500/20 text-blue-500 text-lg font-bold">
                  {review.user?.username?.charAt(0).toUpperCase() || "T"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Link href={`/profile/${review.user?._id}`} onClick={onClose}>
                <Avatar className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={review.user?.avatar} alt={review.user?.username} />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                    {review.user?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}

            <div className="flex-1 min-w-0">
              {/* Username with link */}
              {isTMDB ? (
                <span className="font-semibold text-foreground text-base sm:text-lg">
                  {review.user?.username}
                </span>
              ) : (
                <Link
                  href={`/profile/${review.user?._id}`}
                  onClick={onClose}
                  className="font-semibold text-foreground hover:text-primary transition-colors text-base sm:text-lg"
                >
                  {review.user?.username}
                </Link>
              )}

              {/* Meta info row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  {formatDate(review.createdAt)}
                </span>
                {review.updatedAt && review.updatedAt !== review.createdAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Edited
                  </span>
                )}
                {isTMDB && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded text-xs font-semibold flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    TMDB
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:text-primary transition-all active:scale-90 cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating */}
        <div className="px-4 sm:px-6 py-3 bg-secondary/20 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {[...Array(10)].map((_, i) => {
                  const fillPercentage = Math.min(Math.max(review.rating - i, 0), 1) * 100
                  return (
                    <div key={i} className="relative">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${fillPercentage}%` }}
                      >
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-primary text-primary" />
                      </div>
                    </div>
                  )
                })}
              </div>
              <span className="text-lg sm:text-xl font-bold text-primary">{review.rating}/10</span>
            </div>

            {/* Spoiler/Adult badges */}
            <div className="flex items-center gap-2">
              {review.spoiler && (
                isOwnReview ? (
                  <span className="px-2 py-1 bg-destructive/20 text-destructive rounded text-xs font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    SPOILER
                  </span>
                ) : (
                  <button
                    onClick={() => setRevealSpoiler(!revealSpoiler)}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      revealSpoiler
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                    }`}
                  >
                    {revealSpoiler ? <EyeOff className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    SPOILER {revealSpoiler && <span className="opacity-70">(Revealed)</span>}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="relative">
            {/* Title */}
            <h3 className={`text-xl sm:text-2xl font-bold text-foreground mb-4 transition-all ${
              shouldBlur ? 'blur-md select-none' : ''
            }`}>
              {review.title}
            </h3>

            {/* Review content */}
            <p className={`text-foreground whitespace-pre-wrap leading-relaxed transition-all ${
              shouldBlur ? 'blur-md select-none' : ''
            }`}>
              {review.content}
            </p>

            {/* Spoiler reveal overlay */}
            {shouldBlur && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                <button
                  onClick={() => setRevealSpoiler(true)}
                  className="px-6 py-3 bg-destructive/90 hover:bg-destructive text-white rounded-lg font-semibold transition-colors shadow-lg flex items-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Click to Reveal Spoiler
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-border bg-secondary/10">
          <div className="flex items-center gap-4">
            {isTMDB ? (
              // TMDB reviews - read-only actions
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ThumbsUp className="w-5 h-5" />
                  <span>-</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ThumbsDown className="w-5 h-5" />
                  <span>-</span>
                </div>
              </>
            ) : (
              // User reviews - interactive actions
              <>
                {/* Like */}
                <button
                  onClick={() => onLike?.(review._id)}
                  className={`flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer ${
                    userLiked
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <ThumbsUp
                    className={`w-5 h-5 transition-all ${
                      userLiked ? "fill-current text-primary" : "fill-none"
                    }`}
                  />
                  <span>{review.likeCount || 0}</span>
                </button>

                {/* Dislike */}
                <button
                  onClick={() => onDislike?.(review._id)}
                  className={`flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer ${
                    userDisliked
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-destructive"
                  }`}
                >
                  <ThumbsDown
                    className={`w-5 h-5 transition-all ${
                      userDisliked ? "fill-current text-destructive" : "fill-none"
                    }`}
                  />
                  <span>{review.dislikeCount || 0}</span>
                </button>

                {/* Replies count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageCircle className="w-5 h-5" />
                  <span>{review.replyCount || 0}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
