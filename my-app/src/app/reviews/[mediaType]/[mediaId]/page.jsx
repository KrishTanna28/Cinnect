"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ThumbsUp, ThumbsDown, MessageCircle, AlertTriangle, ArrowLeft, Star, Send, Plus, Edit2, Trash2, Minus, Pencil, MoreVertical, EyeOff } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { useUser } from "@/contexts/UserContext"
import { getReviews, updateReview, createReview, likeReview, dislikeReview, addReply, likeReply, dislikeReply, deleteReview, } from "@/lib/reviews"
import { getMovieDetails, getTVDetails } from "@/lib/movies"
import { ReviewsPageSkeleton, InlineLoadingSkeleton } from "@/components/skeletons"
import { MentionText } from "@/components/mention-text"
import ReviewDetailModal from "@/components/review-detail-modal"

export default function ReviewsPage({ params }) {
  const REVIEW_PREVIEW_LENGTH = 320

  const unwrappedParams = use(params)
  const router = useRouter()
  const { user } = useUser()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [sortBy, setSortBy] = useState('top')

  // Write review state
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    content: '',
    spoiler: false
  })
  const [hoverRating, setHoverRating] = useState(0)
  const [editingReview, setEditingReview] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [replySpoiler, setReplySpoiler] = useState(false)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [showReplies, setShowReplies] = useState(new Set())
  const [collapsedReplies, setCollapsedReplies] = useState(new Set())
  const [mentionUser, setMentionUser] = useState(null)
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set())
  const [highlightId, setHighlightId] = useState(null)
  const [processedHash, setProcessedHash] = useState(null)

  // Media title
  const [mediaTitle, setMediaTitle] = useState('')
  const [isMediaReleased, setIsMediaReleased] = useState(true)
  const [releaseBlockMessage, setReleaseBlockMessage] = useState('')

  // Delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState(null) // { type: 'review' | 'reply', id: string, reviewId?: string }

  // Review detail modal state
  const [selectedReview, setSelectedReview] = useState(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

  // Open review modal
  const handleOpenReviewModal = (review) => {
    setSelectedReview(review)
    setIsReviewModalOpen(true)
  }

  // Close review modal
  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false)
    setSelectedReview(null)
  }

  // Fetch media title
  useEffect(() => {
    const fetchTitle = async () => {
      try {
        let details = null
        if (unwrappedParams.mediaType === 'tv') {
          const data = await getTVDetails(unwrappedParams.mediaId)
          details = data?.data || null
          setMediaTitle(details?.title || details?.name || '')
        } else {
          const data = await getMovieDetails(unwrappedParams.mediaId)
          details = data?.data || null
          setMediaTitle(details?.title || details?.name || '')
        }

        const releaseDateValue = unwrappedParams.mediaType === 'tv'
          ? (details?.firstAirDate || details?.releaseDate || null)
          : (details?.releaseDate || details?.firstAirDate || null)

        if (releaseDateValue) {
          const parsedReleaseDate = new Date(releaseDateValue)
          if (!Number.isNaN(parsedReleaseDate.getTime()) && parsedReleaseDate.getTime() > Date.now()) {
            const mediaLabel = unwrappedParams.mediaType === 'tv' ? 'show' : 'movie'
            setIsMediaReleased(false)
            setReleaseBlockMessage(`You cannot review this ${mediaLabel} as it has not been released yet.`)
            return
          }
        }

        setIsMediaReleased(true)
        setReleaseBlockMessage('')
      } catch {
        // Fail open on metadata errors to avoid blocking review flow unexpectedly.
        setIsMediaReleased(true)
        setReleaseBlockMessage('')
      }
    }
    fetchTitle()
  }, [unwrappedParams.mediaId, unwrappedParams.mediaType])

  useEffect(() => {
    const fetchExistingReview = async () => {
      if (!user?._id) {
        setHasReviewed(false)
        return
      }

      try {
        const response = await fetch(
          `/api/reviews?mediaType=${unwrappedParams.mediaType}&mediaId=${unwrappedParams.mediaId}&userId=${user._id}&page=1&limit=1&sortBy=latest`
        )
        const data = await response.json()
        // Updated to match new API response format
        setHasReviewed(!!(data?.data?.reviews?.length))
      } catch (existingReviewError) {
        console.error('Failed to check existing review:', existingReviewError)
      }
    }

    fetchExistingReview()
  }, [user?._id, unwrappedParams.mediaId, unwrappedParams.mediaType])

  const resolveMediaTitle = async () => {
    if (mediaTitle) return mediaTitle

    try {
      if (unwrappedParams.mediaType === 'tv') {
        const data = await getTVDetails(unwrappedParams.mediaId)
        const resolvedTitle = data?.data?.name || data?.data?.title || ''
        if (resolvedTitle) {
          setMediaTitle(resolvedTitle)
          return resolvedTitle
        }
      } else {
        const data = await getMovieDetails(unwrappedParams.mediaId)
        const resolvedTitle = data?.data?.title || data?.data?.name || ''
        if (resolvedTitle) {
          setMediaTitle(resolvedTitle)
          return resolvedTitle
        }
      }
    } catch (titleError) {
      console.error('Failed to resolve media title for review:', titleError)
    }

    return ''
  }

  // Fetch reviews
  const fetchReviews = async (pageNum = 1, sortBy) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const data = await getReviews(
        unwrappedParams.mediaType,
        unwrappedParams.mediaId,
        pageNum,
        10,
        sortBy
      )

      if (data.success && data.data) {
        // Updated to match new API response format
        const reviewsData = data.data.reviews || []
        const pagination = data.data.pagination || {}

        if (pageNum === 1) {
          setReviews(reviewsData)
        } else {
          setReviews(prev => [...prev, ...reviewsData])
        }
        setHasMore(pagination.page < pagination.pages)
      }
      console.log('Fetched reviews:', data.data?.reviews)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      setError('Failed to load reviews')
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchReviews(1, sortBy)
  }, [unwrappedParams.mediaId, sortBy])

  // Handle Hash Navigation - fetch specific review if not in current list
  const fetchAndScrollToTarget = async (targetId, currentReviews) => {
    // First check if it's already in our reviews list
    let targetReviewId = null
    let targetReview = null

    for (const r of currentReviews) {
      if (r._id === targetId) {
        targetReviewId = r._id
        targetReview = r
        break
      }
      if (r.replies && r.replies.some(rep => rep._id === targetId)) {
        targetReviewId = r._id
        targetReview = r
        break
      }
    }

    // If not found in current reviews, try to fetch the specific review
    if (!targetReviewId) {
      try {
        // First try to fetch as a review ID
        const reviewResponse = await fetch(`/api/reviews/${targetId}`)
        const reviewData = await reviewResponse.json()

        if (reviewData.success && reviewData.data) {
          // Found the review - add it to the top of the list if not already there
          targetReview = reviewData.data
          targetReviewId = reviewData.data._id
          setReviews(prev => {
            const existingIndex = prev.findIndex(r => r._id === reviewData.data._id)
            if (existingIndex === -1) {
              return [reviewData.data, ...prev]
            }
            return prev
          })
        } else {
          // Maybe it's a reply ID - we need to find which review contains it
          // Fetch more reviews and search
          const allReviewsResponse = await fetch(
            `/api/reviews?mediaType=${unwrappedParams.mediaType}&mediaId=${unwrappedParams.mediaId}&page=1&limit=100&sortBy=latest`
          )
          const allReviewsData = await allReviewsResponse.json()

          if (allReviewsData.success && allReviewsData.data?.reviews) {
            for (const r of allReviewsData.data.reviews) {
              if (r.replies && r.replies.some(rep => rep._id === targetId)) {
                targetReviewId = r._id
                targetReview = r
                // Add the review to our list if not already there
                setReviews(prev => {
                  const existingIdx = prev.findIndex(review => review._id === r._id)
                  if (existingIdx === -1) {
                    return [r, ...prev]
                  }
                  // Update the existing review with full reply data
                  return prev.map(review => review._id === r._id ? r : review)
                })
                break
              }
            }
          }
        }
      } catch (fetchError) {
        console.error('Failed to fetch target review:', fetchError)
      }
    }

    if (targetReviewId) {
      setProcessedHash(targetId)

      // Ensure the parent review thread is expanded (showReplies)
      setShowReplies(prev => {
        const next = new Set(prev)
        next.add(targetReviewId)
        return next
      })

      // Ensure that no parent reply is collapsed
      if (targetReview && targetReview.replies && targetId !== targetReviewId) {
        setCollapsedReplies(prev => {
          const next = new Set(prev)
          let currentReply = targetReview.replies.find(r => r._id === targetId)

          // Walk up the tree to make sure all parents are uncollapsed
          while (currentReply && currentReply.parentReplyId) {
            next.delete(currentReply.parentReplyId)
            currentReply = targetReview.replies.find(r => r._id === currentReply.parentReplyId)
          }
          return next
        })
      }

      setHighlightId(targetId)

      // Use a longer timeout to ensure DOM is updated after state changes
      setTimeout(() => {
        const el = document.getElementById(targetId)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          // Try scrolling to the review if reply element not found
          const reviewEl = document.getElementById(targetReviewId)
          if (reviewEl) {
            reviewEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 500)

      setTimeout(() => {
        setHighlightId(prev => (prev === targetId ? null : prev))
      }, 3000)
    }
  }

  // Hash change listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash) {
        const id = hash.replace('#', '')
        setProcessedHash(null) // Reset to allow re-processing
        fetchAndScrollToTarget(id, reviews)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [reviews, unwrappedParams.mediaType, unwrappedParams.mediaId])

  // Initial hash processing after reviews load
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || loading) return

    const id = hash.replace('#', '')
    if (processedHash === id) return

    fetchAndScrollToTarget(id, reviews)
  }, [reviews, loading, processedHash, unwrappedParams.mediaType, unwrappedParams.mediaId])

  // Load more reviews
  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchReviews(nextPage, sortBy)
    }
  }

  // Infinite scroll
  const loadMoreRef = useInfiniteScroll(loadMore, hasMore, isLoadingMore, 300)

  // Submit review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (isSubmittingReview) return

    setError(null)
    setSuccess(null)

    if (!user) {
      router.push('/login')
      return
    }

    if (!isMediaReleased) {
      setError(releaseBlockMessage || 'You cannot review this title before release.')
      return
    }

    if (!editingReview && hasReviewed) {
      setError('You have already reviewed this media')
      return
    }

    setIsSubmittingReview(true)
    try {
      // Auto-detect spoiler if checkbox is not checked
      let finalSpoiler = reviewForm.spoiler
      if (!finalSpoiler && reviewForm.content.trim().length > 0) {
        try {
          const detectRes = await fetch('/api/spoiler-detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: `${reviewForm.title}. ${reviewForm.content}` })
          })
          const detectData = await detectRes.json()
          if (detectData.success) {
            const pct = ((detectData.data?.scores?.spoiler ?? detectData.data?.confidence ?? 0) * 100).toFixed(1)
            console.log(`[Spoiler Detection] Review: ${pct}% spoiler probability (threshold: 60%)`)
          }
          if (detectData.success && detectData.data?.isSpoiler) {
            finalSpoiler = true
          }
        } catch (detectErr) {
          console.error('Spoiler detection failed, proceeding without:', detectErr)
        }
      }

      const formWithSpoiler = { ...reviewForm, spoiler: finalSpoiler }

      if (editingReview) {
        // Optimistic update for editing
        const optimisticReview = {
          ...editingReview,
          ...formWithSpoiler,
          updatedAt: new Date().toISOString()
        }
        setReviews(prev => prev.map(r => r._id === editingReview._id ? optimisticReview : r))
        setSuccess('Review updated successfully!')
        setShowWriteReview(false)
        setEditingReview(null)
        setReviewForm({ rating: 5, title: '', content: '', spoiler: false })

        // Update existing review
        const data = await updateReview(
          editingReview._id,
          formWithSpoiler
        )

        if (data.success) {
          setReviews(prev => prev.map(r => r._id === editingReview._id ? data.data : r))
        }
      } else {
        const resolvedMediaTitle = await resolveMediaTitle()
        if (!resolvedMediaTitle) {
          setError('Failed to identify this media. Please try again.')
          return
        }

        // Optimistic update for new review
        const tempReview = {
          _id: 'temp-' + Date.now(),
          user: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            fullName: user.fullName
          },
          ...formWithSpoiler,
          mediaId: unwrappedParams.mediaId,
          mediaType: unwrappedParams.mediaType,
          likes: [],
          dislikes: [],
          likeCount: 0,
          dislikeCount: 0,
          replies: [],
          replyCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setReviews(prev => [tempReview, ...prev])
          setSuccess('Review posted successfully!')
          setShowWriteReview(false)
          const formData = { ...formWithSpoiler }
          setReviewForm({ rating: 5, title: '', content: '', spoiler: false })
          setHasReviewed(true)

          // Create new review
          const data = await createReview(
            {
              ...formData,
              mediaId: unwrappedParams.mediaId,
              mediaType: unwrappedParams.mediaType,
              mediaTitle: resolvedMediaTitle
            }
          )

          if (data.success) {
            // Replace temp review with real one
            setReviews(prev => prev.map(r => r._id === tempReview._id ? data.data : r))
          } else {
            setHasReviewed(false)
          }
        }
      } catch (error) {
        console.error('Failed to submit review:', error)
        setError(error.message || 'Failed to submit review')
      // Revert optimistic update on error
      if (editingReview) {
        setReviews(prev => prev.map(r => r._id === editingReview._id ? editingReview : r))
      } else {
        setReviews(prev => prev.filter(r => !r._id.startsWith('temp-')))
        setHasReviewed(false)
      }
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // Like review
  const handleLikeReview = async (reviewId) => {
    if (!user) {
      router.push('/login')
      return
    }

    // Store previous state for rollback
    const previousReviews = reviews.find(r => r._id === reviewId)

    // Optimistic update - update UI immediately
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        const userLiked = r.likes?.some(id => id?.toString() === user._id?.toString())
        const userDisliked = r.dislikes?.some(id => id?.toString() === user._id?.toString())

        return {
          ...r,
          likeCount: userLiked ? (r.likeCount || 0) - 1 : (r.likeCount || 0) + 1,
          dislikeCount: userDisliked ? (r.dislikeCount || 0) - 1 : r.dislikeCount || 0,
          likes: userLiked
            ? (r.likes || []).filter(id => id?.toString() !== user._id?.toString())
            : [...(r.likes || []), user._id],
          dislikes: (r.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
        }
      }
      return r
    }))

    try {
      const data = await likeReview(reviewId)

      if (data.success) {
        // Update with actual server data
        setReviews(prev => prev.map(r => {
          if (r._id === reviewId) {
            return {
              ...r,
              likeCount: data.data.likes,
              dislikeCount: data.data.dislikes,
              likes: data.data.userLiked ? [...(r.likes || []).filter(id => id?.toString() !== user._id?.toString()), user._id] : (r.likes || []).filter(id => id?.toString() !== user._id?.toString()),
              dislikes: (r.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
            }
          }
          return r
        }))
      } else {
        // Revert optimistic update on error
        setReviews(prev => prev.map(r => r._id === reviewId ? previousReviews : r))
      }
    } catch (error) {
      console.error('Failed to like review:', error)
      setError('Failed to like review')
      // Revert optimistic update on error
      setReviews(prev => prev.map(r => r._id === reviewId ? previousReviews : r))
    }
  }

  // Dislike review
  const handleDislikeReview = async (reviewId) => {
    if (!user) {
      router.push('/login')
      return
    }

    // Store previous state for rollback
    const previousReviews = reviews.find(r => r._id === reviewId)

    // Optimistic update - update UI immediately
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        const userLiked = r.likes?.some(id => id?.toString() === user._id?.toString())
        const userDisliked = r.dislikes?.some(id => id?.toString() === user._id?.toString())

        return {
          ...r,
          likeCount: userLiked ? (r.likeCount || 0) - 1 : r.likeCount || 0,
          dislikeCount: userDisliked ? (r.dislikeCount || 0) - 1 : (r.dislikeCount || 0) + 1,
          likes: (r.likes || []).filter(id => id?.toString() !== user._id?.toString()),
          dislikes: userDisliked
            ? (r.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
            : [...(r.dislikes || []), user._id]
        }
      }
      return r
    }))

    try {
      const data = await dislikeReview(reviewId)

      if (data.success) {
        // Update with actual server data
        setReviews(prev => prev.map(r => {
          if (r._id === reviewId) {
            return {
              ...r,
              likeCount: data.data.likes,
              dislikeCount: data.data.dislikes,
              likes: (r.likes || []).filter(id => id?.toString() !== user._id?.toString()),
              dislikes: data.data.userDisliked ? [...(r.dislikes || []).filter(id => id?.toString() !== user._id?.toString()), user._id] : (r.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
            }
          }
          return r
        }))
      } else {
        // Revert optimistic update on error
        setReviews(prev => prev.map(r => r._id === reviewId ? previousReviews : r))
      }
    } catch (error) {
      console.error('Failed to dislike review:', error)
      setError('Failed to dislike review')
      // Revert optimistic update on error
      setReviews(prev => prev.map(r => r._id === reviewId ? previousReviews : r))
    }
  }

  // Submit reply
  const handleSubmitReply = async (reviewId, parentReplyId = null) => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!replyContent.trim() || isSubmittingReply) return

    setIsSubmittingReply(true)
    try {
      // Auto-detect spoiler if checkbox is not checked
      let finalSpoiler = replySpoiler
    if (!finalSpoiler && replyContent.trim().length > 0) {
      try {
        const detectRes = await fetch('/api/spoiler-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: replyContent })
        })
        const detectData = await detectRes.json()
        if (detectData.success) {
          const pct = ((detectData.data?.scores?.spoiler ?? detectData.data?.confidence ?? 0) * 100).toFixed(1)
          console.log(`[Spoiler Detection] Review reply: ${pct}% spoiler probability (threshold: 60%)`)
        }
        if (detectData.success && detectData.data?.isSpoiler) {
          finalSpoiler = true
        }
      } catch (detectErr) {
        console.error('Spoiler detection failed, proceeding without:', detectErr)
      }
    }

    const tempReply = {
      _id: 'temp-' + Date.now(),
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        fullName: user.fullName
      },
      content: replyContent,
      spoiler: finalSpoiler,
      parentReplyId: parentReplyId,
      depth: parentReplyId ? 1 : 0, // This is just for optimistic UI, server will set real depth
      likes: [],
      dislikes: [],
      createdAt: new Date().toISOString()
    }

    // Optimistic update - add reply immediately
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        // If it's a nested reply, find the parent to get correct depth
        if (parentReplyId) {
          const parentObj = r.replies?.find(rp => rp._id === parentReplyId);
          if (parentObj) {
             tempReply.depth = (parentObj.depth || 0) + 1;
          }
        }
        return {
          ...r,
          replies: [...(r.replies || []), tempReply],
          replyCount: (r.replyCount || 0) + 1
        }
      }
      return r
    }))

    // Clear form and show replies
    const contentToSend = replyContent
    const spoilerToSend = finalSpoiler
    setReplyingTo(null)
    setReplyContent('')
    setReplySpoiler(false)
    setMentionUser(null)
    const newShowReplies = new Set(showReplies)
    newShowReplies.add(reviewId)
    setShowReplies(newShowReplies)

    const data = await addReply(reviewId, contentToSend, spoilerToSend, parentReplyId)

    if (data.success) {
      // Clean out temp reply and append actual data from server
      setReviews(prev => prev.map(r => {
        if (r._id === reviewId) {
          const otherReplies = (r.replies || []).filter(rep => !String(rep._id).startsWith('temp-'));
          return {
            ...r,
            replies: [...otherReplies, data.data]
          }
        }
        return r;
      }))
      setShowReplies(newShowReplies)
    }
  } catch (error) {
    console.error('Failed to submit reply:', error)
    setError('Failed to submit reply')
  } finally {
    setIsSubmittingReply(false)
  }
}

// Like a reply
  const handleLikeReply = async (reviewId, replyId) => {
    if (!user) {
      router.push('/login')
      return
    }

    // Store previous state for rollback
    const previousReview = reviews.find(r => r._id === reviewId)

    // Optimistic update - update UI immediately
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        return {
          ...r,
          replies: r.replies.map(reply => {
            if (reply._id === replyId) {
              const userLiked = reply.likes?.some(id => id?.toString() === user._id?.toString())
              const userDisliked = reply.dislikes?.some(id => id?.toString() === user._id?.toString())

              return {
                ...reply,
                likes: userLiked
                  ? (reply.likes || []).filter(id => id?.toString() !== user._id?.toString())
                  : [...(reply.likes || []), user._id],
                dislikes: (reply.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
              }
            }
            return reply
          })
        }
      }
      return r
    }))

    try {
      const data = await likeReply(reviewId, replyId)

      if (data.success) {
        // Update with actual server data
        setReviews(prev => prev.map(r => {
          if (r._id === reviewId) {
            return {
              ...r,
              replies: r.replies.map(reply => {
                if (reply._id === replyId) {
                  return {
                    ...reply,
                    likes: data.data.userLiked ? [...(reply.likes || []).filter(id => id?.toString() !== user._id?.toString()), user._id] : (reply.likes || []).filter(id => id?.toString() !== user._id?.toString()),
                    dislikes: (reply.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
                  }
                }
                return reply
              })
            }
          }
          return r
        }))
      } else {
        // Revert optimistic update on error
        setReviews(prev => prev.map(r => r._id === reviewId ? previousReview : r))
      }
    } catch (error) {
      console.error('Failed to like reply:', error)
      setError('Failed to like reply')
      // Revert optimistic update on error
      setReviews(prev => prev.map(r => r._id === reviewId ? previousReview : r))
    }
  }

  // Dislike a reply
  const handleDislikeReply = async (reviewId, replyId) => {
    if (!user) {
      router.push('/login')
      return
    }

    // Store previous state for rollback
    const previousReview = reviews.find(r => r._id === reviewId)

    // Optimistic update - update UI immediately
    setReviews(prev => prev.map(r => {
      if (r._id === reviewId) {
        return {
          ...r,
          replies: r.replies.map(reply => {
            if (reply._id === replyId) {
              const userLiked = reply.likes?.some(id => id?.toString() === user._id?.toString())
              const userDisliked = reply.dislikes?.some(id => id?.toString() === user._id?.toString())

              return {
                ...reply,
                likes: (reply.likes || []).filter(id => id?.toString() !== user._id?.toString()),
                dislikes: userDisliked
                  ? (reply.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
                  : [...(reply.dislikes || []), user._id]
              }
            }
            return reply
          })
        }
      }
      return r
    }))

    try {
      const data = await dislikeReply(reviewId, replyId)

      if (data.success) {
        // Update with actual server data
        setReviews(prev => prev.map(r => {
          if (r._id === reviewId) {
            return {
              ...r,
              replies: r.replies.map(reply => {
                if (reply._id === replyId) {
                  return {
                    ...reply,
                    likes: (reply.likes || []).filter(id => id?.toString() !== user._id?.toString()),
                    dislikes: data.data.userDisliked ? [...(reply.dislikes || []).filter(id => id?.toString() !== user._id?.toString()), user._id] : (reply.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
                  }
                }
                return reply
              })
            }
          }
          return r
        }))
      } else {
        // Revert optimistic update on error
        setReviews(prev => prev.map(r => r._id === reviewId ? previousReview : r))
      }
    } catch (error) {
      console.error('Failed to dislike reply:', error)
      setError('Failed to dislike reply')
      // Revert optimistic update on error
      setReviews(prev => prev.map(r => r._id === reviewId ? previousReview : r))
    }
  }

  // Edit review
  const handleEditReview = (review) => {
    setEditingReview(review)
    setReviewForm({
      rating: review.rating,
      title: review.title,
      content: review.content,
      spoiler: review.spoiler
    })
    setShowWriteReview(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Delete review
  const handleDeleteReview = async (reviewId) => {
    if (!user) {
      router.push('/login')
      return
    }

    setDeleteConfirmation({ type: 'review', id: reviewId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirmation) return

        const deletedItem = deleteConfirmation
        let backupData = null

    try {
        if (deleteConfirmation.type === 'review') {
          // Backup and optimistically remove review
          backupData = reviews.find(r => r._id === deletedItem.id)
          setReviews(prev => prev.filter(r => r._id !== deletedItem.id))
          if (backupData?.user?._id === user?._id) {
            setHasReviewed(false)
          }
          setSuccess('Review deleted successfully!')
        setTimeout(() => setSuccess(null), 3000)
        setDeleteConfirmation(null)

        const data = await deleteReview(deletedItem.id)

        if (!data.success) {
          throw new Error('Delete failed')
        }
      } else if (deleteConfirmation.type === 'reply') {
        // Backup and optimistically remove reply
        const review = reviews.find(r => r._id === deletedItem.reviewId)
        if (review) {
          backupData = { review, reply: review.replies.find(rep => rep._id === deletedItem.id) }
          setReviews(prev => prev.map(r => {
            if (r._id === deletedItem.reviewId) {
              return {
                ...r,
                replies: r.replies.filter(rep => rep._id !== deletedItem.id),
                replyCount: Math.max(0, (r.replyCount || 0) - 1)
              }
            }
            return r
          }))
          setSuccess('Reply deleted successfully!')
          setTimeout(() => setSuccess(null), 3000)
          setDeleteConfirmation(null)

          // TODO: Call delete reply API when available
          // const data = await deleteReply(deletedItem.reviewId, deletedItem.id)
          console.log('Delete reply:', deletedItem.id)
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error)
      setError('Failed to delete')
      setTimeout(() => setError(null), 3000)

      // Revert optimistic update on error
      if (deletedItem.type === 'review' && backupData) {
        setReviews(prev => [backupData, ...prev])
        if (backupData?.user?._id === user?._id) {
          setHasReviewed(true)
        }
      } else if (deletedItem.type === 'reply' && backupData) {
        setReviews(prev => prev.map(r => {
          if (r._id === deletedItem.reviewId) {
            return {
              ...r,
              replies: [...r.replies, backupData.reply],
              replyCount: (r.replyCount || 0) + 1
            }
          }
          return r
        }))
      }
    }
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingReview(null)
    setReviewForm({ rating: 5, title: '', content: '', spoiler: false })
    setShowWriteReview(false)
  }

  const toggleCollapse = (replyId) => {
    setCollapsedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };

  const buildReplyTree = (replies) => {
    if (!replies) return [];
    const map = new Map();
    const roots = [];
    
    replies.forEach(r => {
      map.set(r._id, { ...r, children: [] });
    });

    replies.forEach(r => {
      if (r.parentReplyId && map.has(r.parentReplyId)) {
        map.get(r.parentReplyId).children.push(map.get(r._id));
      } else {
        roots.push(map.get(r._id));
      }
    });
    
    return roots;
  };

  const renderReplyNode = (replyNode, reviewId) => {
    const isOwnReply = user && replyNode.user?._id === user?._id;
    const replySpoilerRevealed = revealedSpoilers.has(replyNode._id);
    const shouldBlurReply = replyNode.spoiler && !replySpoilerRevealed && !isOwnReply;
    const isCollapsed = collapsedReplies.has(replyNode._id);
    const depth = replyNode.depth || 0;
    const isHighlighted = highlightId === replyNode._id;

    return (
      <div 
        key={replyNode._id} 
        id={replyNode._id}
        className={`mt-3 flex gap-2 sm:gap-3 ${depth > 0 ? "pl-4 border-l-2 border-border/50" : ""} ${isHighlighted ? "bg-primary/20 transition-all duration-500 rounded p-1" : "transition-all duration-1000 p-1"}`}
      >
        <div 
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => toggleCollapse(replyNode._id)}
        >
          {replyNode.user?.avatar ? (
            <img src={replyNode.user.avatar} alt={replyNode.user.username} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-foreground">
              {replyNode.user?.username?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="flex-1 w-full overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span 
              className="font-semibold text-sm text-foreground cursor-pointer"
              onClick={() => toggleCollapse(replyNode._id)}
            >
              {replyNode.user?.username || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(replyNode.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
            
            {isCollapsed && replyNode.children?.length > 0 && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full cursor-pointer" onClick={() => toggleCollapse(replyNode._id)}>
                +{replyNode.children.length} replies
              </span>
            )}

            {replyNode.spoiler && (
              isOwnReply ? (
                <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  SPOILER
                </span>
              ) : (
                <button
                  onClick={() => {
                     const newRevealed = new Set(revealedSpoilers);
                     if (newRevealed.has(replyNode._id)) {
                       newRevealed.delete(replyNode._id);
                     } else {
                       newRevealed.add(replyNode._id);
                     }
                     setRevealedSpoilers(newRevealed);
                  }}
                  className={`max-w-full px-1.5 py-0.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-normal break-words text-left leading-tight ${
                    replySpoilerRevealed
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                  }`}
                  title={replySpoilerRevealed ? "Hide spoiler" : "Contains spoilers"}
                >
                  {replySpoilerRevealed ? <EyeOff className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                  SPOILER {replySpoilerRevealed && <span className="opacity-70"></span>}
                </button>
              )
            )}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <p className={`text-sm text-foreground mb-1 transition-all break-words ${shouldBlurReply ? 'blur-md select-none' : ''}`}>
                  <MentionText text={replyNode.content} />
                </p>
                {shouldBlurReply && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => {
                        const newRevealed = new Set(revealedSpoilers);
                        newRevealed.add(replyNode._id);
                        setRevealedSpoilers(newRevealed);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/90 hover:bg-destructive text-white rounded-lg text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                    >
                      Reveal Spoiler
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => handleLikeReply(reviewId, replyNode._id)}
                  className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${replyNode.likes?.some(id => id?.toString() === user?._id)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  <ThumbsUp
                    className={`w-3 h-3 transition-all ${replyNode.likes?.some(id => id?.toString() === user?._id)
                      ? 'fill-current text-primary'
                      : 'fill-none'
                      }`}
                  />
                  {replyNode.likes?.length || 0}
                </button>

                <button
                  onClick={() => handleDislikeReply(reviewId, replyNode._id)}
                  className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${replyNode.dislikes?.some(id => id?.toString() === user?._id)
                    ? 'text-destructive'
                    : 'text-muted-foreground hover:text-destructive'
                    }`}
                >
                  <ThumbsDown
                    className={`w-3 h-3 transition-all ${replyNode.dislikes?.some(id => id?.toString() === user?._id)
                      ? 'fill-current text-destructive'
                      : 'fill-none'
                      }`}
                  />
                  {replyNode.dislikes?.length || 0}
                </button>

                {user && depth < 5 && (
                  <button
                    onClick={() => {
                      if (replyingTo === replyNode._id) {
                         setReplyingTo(null);
                         setMentionUser(null);
                         setReplyContent('');
                      } else {
                         setReplyingTo(replyNode._id);
                         setMentionUser(replyNode.user?.username);
                         setReplyContent(`@${replyNode.user?.username} `);
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                  >
                    Reply
                  </button>
                )}
              </div>

              {replyingTo === replyNode._id && (
                <div className="mt-2 pl-2 border-l-2 border-primary/20">
                  {mentionUser && (
                    <div className="mb-2 text-xs text-muted-foreground flex items-center">
                      Replying to <span className="text-primary font-semibold ml-1">@{mentionUser}</span>
                      <button
                        onClick={() => {
                          setReplyContent(prev => prev.replace(`@${mentionUser} `, '').replace(`@${mentionUser}`, ''))
                          setMentionUser(null)
                        }}
                        className="ml-2 text-destructive hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      autoFocus
                      onFocus={(e) => {
                        const val = e.currentTarget.value;
                        e.currentTarget.value = '';
                        e.currentTarget.value = val;
                      }}
                      placeholder={mentionUser ? `Reply to @${mentionUser}...` : "Write a reply..."}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="flex-1 text-sm min-h-[60px]"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        onClick={() => handleSubmitReply(reviewId, replyNode._id)}
                        size="sm"
                        disabled={!replyContent.trim() || isSubmittingReply}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <button 
                         className="text-xs text-destructive hover:underline"
                         onClick={() => {
                           setReplyingTo(null);
                           setMentionUser(null);
                           setReplyContent('');
                         }}
                      >Cancel</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id={`reply-spoiler-${replyNode._id}`}
                      checked={replySpoiler}
                      onChange={(e) => setReplySpoiler(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    <label htmlFor={`reply-spoiler-${replyNode._id}`} className="text-xs text-muted-foreground cursor-pointer">
                      Contains Spoilers
                    </label>
                  </div>
                </div>
              )}

              {replyNode.children && replyNode.children.length > 0 && (
                <div className="mt-2">
                  {replyNode.children.map(child => renderReplyNode(child, reviewId))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit/Delete Buttons for replies (only for own replies) */}
        {isOwnReply && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer p-1 transition-all active:scale-90 hover:text-primary mb-auto">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  // TODO: Implement edit reply
                  console.log('Edit reply:', replyNode._id)
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Reply
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteConfirmation({ type: 'reply', id: replyNode._id, reviewId: reviewId })}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Reply
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  if (loading) {
    return <ReviewsPageSkeleton />
  }

  return (
    <main className="min-h-screen bg-background py-6 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer mb-5"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
          <div className="flex gap-3 sm:flex sm:items-center sm:gap-6 justify-between">
            <h1 className="text-3xl font-bold text-foreground">User Reviews</h1>
            {!showWriteReview && !hasReviewed && isMediaReleased && (
              <button
                onClick={() => setShowWriteReview(!showWriteReview)}
                className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Review
              </button>
            )}
            {!showWriteReview && !hasReviewed && !isMediaReleased && (
              <p className="text-sm text-destructive">{releaseBlockMessage}</p>
            )}
            {!showWriteReview && hasReviewed && (
              <p className="text-sm text-muted-foreground">You have already reviewed this.</p>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {/* {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-500 rounded-lg p-4 mb-6">
            {success}
          </div>
        )} */}
        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {!isMediaReleased && (
          <div className="bg-destructive/10 border border-destructive/40 text-destructive rounded-lg p-4 mb-6">
            {releaseBlockMessage}
          </div>
        )}

        {/* Write Review Form */}
        {showWriteReview && isMediaReleased && (
          <div className="bg-card rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingReview ? 'Edit Your Review' : 'Write Your Review'}
            </h2>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Rating
                  </label>

                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={reviewForm.rating}
                      onChange={(e) => {
                        const raw = e.target.value

                        if (raw === '') {
                          setHoverRating(0)
                          setReviewForm(prev => ({ ...prev, rating: '' }))
                          return
                        }

                        const value = parseFloat(raw)

                        if (!isNaN(value) && value >= 0 && value <= 10) {
                          setHoverRating(0)
                          setReviewForm(prev => ({
                            ...prev,
                            rating: Math.round(value * 10) / 10
                          }))
                        }
                      }}
                      className="w-20 text-center font-semibold"
                    />
                    <span className="text-sm text-muted-foreground">/ 10</span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[...Array(10)].map((_, i) => {
                    const starValue = i + 1
                    const currentRating =
                      hoverRating > 0 ? hoverRating : reviewForm.rating
                    const fillPercentage =
                      Math.min(Math.max(currentRating - i, 0), 1) * 100

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setHoverRating(0)
                          setReviewForm(prev => ({ ...prev, rating: starValue }))
                        }}
                        onMouseEnter={() => setHoverRating(starValue)}
                        className="transition-all hover:scale-110 focus:outline-none relative"
                      >
                        <Star className="w-7 h-7 text-muted-foreground" />
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ width: `${fillPercentage}%` }}
                        >
                          <Star className="w-7 h-7 fill-primary text-primary" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <Input
                  style={{
                    borderColor: 'var(--border)',
                  }}
                  placeholder="Review Title"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <Textarea
                  style={{
                    borderColor: 'var(--border)',
                  }}
                  placeholder="Write your review here..."
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                  required
                  rows={6}
                  minLength={10}
                  maxLength={5000}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="spoiler"
                  checked={reviewForm.spoiler}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, spoiler: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="spoiler" className="text-sm text-foreground cursor-pointer">
                  Contains Spoilers
                </label>
                <span className="text-xs text-muted-foreground">
                  (If unchecked, AI will auto-detect spoilers)
                </span>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Submitting...' : (editingReview ? 'Update Review' : 'Submit Review')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmittingReview}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Sort Options */}
          {reviews?.length > 0 && <div className="flex flex-wrap gap-2 mb-6">
            <Button
            variant={sortBy === 'top' ? 'default' : 'outline'}
            onClick={() => { setSortBy('top'); setPage(1); }}
             size="sm"
            >
             Top
            </Button>
            <Button
            variant={sortBy === 'latest' ? 'default' : 'outline'}
            onClick={() => { setSortBy('latest'); setPage(1); }}
             size="sm"
            >
             Latest
            </Button>
          </div>}

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews?.map((review) => {
            const isSpoilerRevealed = revealedSpoilers.has(review._id)
            const isOwnReview = user && review.user?._id === user._id
            const isHighlighted = highlightId === review._id
            const rawReviewContent = String(review.content || '')
            const isLongReview = rawReviewContent.length > REVIEW_PREVIEW_LENGTH
            const previewContent = isLongReview
              ? `${rawReviewContent.slice(0, REVIEW_PREVIEW_LENGTH).trimEnd()}...`
              : rawReviewContent

            return (
              <div 
                key={review._id} 
                id={review._id}
                className={`bg-card rounded-lg p-4 sm:p-6 ${isHighlighted ? "ring-2 ring-primary bg-primary/5 transition-all duration-500" : "transition-all duration-1000"}`}
              >
                {/* Review Header */}
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {review.user?.avatar ? (
                      <img src={review.user.avatar} alt={review.user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-base sm:text-lg font-bold text-foreground">
                        {review.user?.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-start sm:items-center gap-2 mb-1">
                      <Link href={`/users/${review.user?.username}`} className="font-semibold text-foreground hover:text-primary transition-all">
                        {review.user?.username}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                      {review.spoiler && (
                          isOwnReview ? (
                            <span className="px-2 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              SPOILER
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                const newRevealed = new Set(revealedSpoilers);
                                if (newRevealed.has(review._id)) {
                                  newRevealed.delete(review._id);
                                } else {
                                  newRevealed.add(review._id);
                                }
                                setRevealedSpoilers(newRevealed);
                              }}
                              className={`max-w-full px-2 py-0.5 rounded text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-normal break-words text-left leading-tight ${
                                isSpoilerRevealed
                                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                  : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                              }`}
                              title={isSpoilerRevealed ? "Hide spoiler" : "Contains spoilers"}
                            >
                              {isSpoilerRevealed ? <EyeOff className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              SPOILER {isSpoilerRevealed && <span className="opacity-70"></span>}
                            </button>
                          )
                        )}
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(10)].map((_, i) => {
                        const fillPercentage = Math.min(Math.max(review.rating - i, 0), 1) * 100
                        return (
                          <div key={i} className="relative">
                            <Star className="w-4 h-4 text-muted-foreground" />
                            <div
                              className="absolute inset-0 overflow-hidden"
                              style={{ width: `${fillPercentage}%` }}
                            >
                              <Star className="w-4 h-4 fill-primary text-primary" />
                            </div>
                          </div>
                        )
                      })}
                      <span className="ml-2 text-sm font-semibold text-foreground">
                        {review.rating}/10
                      </span>
                    </div>

                    {/* Review Content with Spoiler Blur */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenReviewModal(review)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleOpenReviewModal(review)
                        }
                      }}
                      className="relative cursor-pointer rounded-md p-1 -m-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                      title="Open full review"
                    >
                      <h3 className={`text-lg font-bold text-foreground mb-2 transition-all ${review.spoiler && !isSpoilerRevealed && review.user?._id !== user._id ? 'blur-md select-none' : ''
                        }`}>{review.title}</h3>
                      <p className={`text-foreground whitespace-pre-wrap transition-all ${review.spoiler && !isSpoilerRevealed && review.user?._id !== user._id ? 'blur-md select-none' : ''
                        }`}><MentionText text={previewContent} /></p>

                      {/* Spoiler Reveal Button */}
                      {review.spoiler && !isSpoilerRevealed && review.user?._id !== user?._id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const newRevealed = new Set(revealedSpoilers)
                              newRevealed.add(review._id)
                              setRevealedSpoilers(newRevealed)
                            }}
                            className="px-4 py-2 bg-destructive/90 hover:bg-destructive text-white rounded-lg font-semibold transition-colors shadow-lg"
                          >
                            Click to Reveal Spoiler
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit/Delete Buttons (only for own reviews) */}
                  {isOwnReview && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer p-1 transition-all active:scale-90 hover:text-primary">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditReview(review)}>
                          <Pencil className="w-4 h-4" />
                          Edit Review
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteReview(review._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Review
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Review Actions */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-4 border-t border-border">
                  <button
                    onClick={() => handleLikeReview(review._id)}
                    className={`flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer ${review.likes?.some(id => id && user?._id && id?.toString() === user._id?.toString())
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-primary"
                      }`}
                  >
                    <ThumbsUp
                      className={`w-4 h-4 transition-all ${review.likes?.some(id => id && user?._id && id?.toString() === user._id?.toString())
                        ? "fill-current text-primary"
                        : "fill-none"
                        }`}
                    />
                    <span>{review.likeCount || 0}</span>
                  </button>
                  <button
                    onClick={() => handleDislikeReview(review._id)}
                    className={`flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer ${review.dislikes?.some(id => id && user?._id && id?.toString() === user._id?.toString())
                      ? "text-destructive"
                      : "text-muted-foreground hover:text-destructive"
                      }`}
                  >
                    <ThumbsDown
                      className={`w-4 h-4 transition-all ${review.dislikes?.some(id => id && user?._id && id?.toString() === user._id?.toString())
                        ? "fill-current text-destructive"
                        : "fill-none"
                        }`}
                    />
                    <span>{review.dislikeCount || 0}</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        const newShowReplies = new Set(showReplies)
                        if (newShowReplies.has(review._id)) {
                          newShowReplies.delete(review._id)
                        } else {
                          newShowReplies.add(review._id)
                        }
                        setShowReplies(newShowReplies)
                      }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{review.replyCount == 1 ? review.replyCount + ' Reply' : review.replyCount + ' Replies'}</span>
                    </button>

                    {user && (
                      <button
                        onClick={() => {
                          if (replyingTo === review._id) {
                            setReplyingTo(null);
                            setMentionUser(null);
                            setReplyContent('');
                          } else {
                            setReplyingTo(review._id);
                            setMentionUser(review.user?.username);
                            setReplyContent(`@${review.user?.username} `);
                          }
                        }}
                        className="w-5 h-5 rounded-full border border-muted-foreground flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-all active:scale-90 cursor-pointer"
                        title={replyingTo === review._id ? 'Cancel Reply' : 'Write Reply'}
                      >
                        {replyingTo === review._id ? (
                          <Minus className="w-3 h-3" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reply Form */}
                {replyingTo === review._id && (
                  <div className="mt-4 pl-0 sm:pl-16">
                    {mentionUser && (
                      <div className="mb-2 text-xs text-muted-foreground">
                        Replying to <span className="text-primary font-semibold">@{mentionUser}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Textarea
                        autoFocus
                        onFocus={(e) => {
                          const val = e.currentTarget.value;
                          e.currentTarget.value = '';
                          e.currentTarget.value = val;
                        }}
                        placeholder={mentionUser ? `Reply to @${mentionUser}...` : "Write a reply..."}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={3}
                        className="flex-1"
                        style={{
                          borderColor: 'var(--border)',
                        }}
                      />
                      <Button
                        onClick={() => handleSubmitReply(review._id)}
                        size="sm"
                        disabled={!replyContent.trim() || isSubmittingReply}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id={`reply-spoiler-${review._id}`}
                        checked={replySpoiler}
                        onChange={(e) => setReplySpoiler(e.target.checked)}
                        className="w-3.5 h-3.5"
                      />
                      <label htmlFor={`reply-spoiler-${review._id}`} className="text-xs text-muted-foreground cursor-pointer">
                        Contains Spoilers
                      </label>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {review.replies && review.replies.length > 0 && showReplies.has(review._id) && (
                  <div className="mt-4 pl-0 sm:pl-16 space-y-0">
                    {buildReplyTree(review.replies).map(rootReply => renderReplyNode(rootReply, review._id))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoadingMore && (
              <InlineLoadingSkeleton count={2} />
            )}
          </div>
        )}

        {!hasMore && reviews?.length > 0 && (
          <p className="text-center text-muted-foreground py-8">No more reviews to load</p>
        )}

        {isMediaReleased && reviews?.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No reviews yet. Be the first to review!</p>
            <Button onClick={() => setShowWriteReview(true)}>
              Write a Review
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmation(null)}>
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Delete {deleteConfirmation.type === 'review' ? 'Review' : 'Reply'}?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this {deleteConfirmation.type}? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Detail Modal */}
      <ReviewDetailModal
        isOpen={isReviewModalOpen}
        onClose={handleCloseReviewModal}
        review={selectedReview}
        onLike={(reviewId) => {
          handleLikeReview(reviewId)
          // Update the selected review in modal
          setSelectedReview(prev => {
            if (!prev || prev._id !== reviewId) return prev
            const wasLiked = prev.likes?.some(id => id?.toString() === user?._id?.toString())
            const wasDisliked = prev.dislikes?.some(id => id?.toString() === user?._id?.toString())
            return {
              ...prev,
              likeCount: wasLiked ? (prev.likeCount || 0) - 1 : (prev.likeCount || 0) + 1,
              dislikeCount: wasDisliked ? (prev.dislikeCount || 0) - 1 : prev.dislikeCount || 0,
              likes: wasLiked
                ? (prev.likes || []).filter(id => id?.toString() !== user._id?.toString())
                : [...(prev.likes || []), user._id],
              dislikes: (prev.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
            }
          })
        }}
        onDislike={(reviewId) => {
          handleDislikeReview(reviewId)
          // Update the selected review in modal
          setSelectedReview(prev => {
            if (!prev || prev._id !== reviewId) return prev
            const wasLiked = prev.likes?.some(id => id?.toString() === user?._id?.toString())
            const wasDisliked = prev.dislikes?.some(id => id?.toString() === user?._id?.toString())
            return {
              ...prev,
              likeCount: wasLiked ? (prev.likeCount || 0) - 1 : prev.likeCount || 0,
              dislikeCount: wasDisliked ? (prev.dislikeCount || 0) - 1 : (prev.dislikeCount || 0) + 1,
              likes: (prev.likes || []).filter(id => id?.toString() !== user._id?.toString()),
              dislikes: wasDisliked
                ? (prev.dislikes || []).filter(id => id?.toString() !== user._id?.toString())
                : [...(prev.dislikes || []), user._id]
            }
          })
        }}
        mediaType={unwrappedParams.mediaType}
        mediaId={unwrappedParams.mediaId}
      />
    </main>
  )
}
