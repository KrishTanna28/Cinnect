import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import Notification from '@/lib/models/Notification.js'
import User from '@/lib/models/User.js'
import { withAuth } from '@/lib/middleware/withAuth.js'

// POST /api/reviews/[reviewId]/like - Like/unlike a review
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { reviewId } = await params

    const review = await Review.findById(reviewId)

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if it was already liked (if so, this is an unlike – no notification)
    const wasAlreadyLiked = review.likes.some(id => id?.toString() === user._id?.toString())

    // Use the model method to toggle like
    await review.likeReview(user._id)

    // Send notification if this is a new like (not an unlike) and not self-like
    if (!wasAlreadyLiked && review.user.toString() !== user._id.toString()) {
      try {
        // Check recipient's notification preferences
        const recipient = await User.findById(review.user).select('preferences').lean()
        const pushEnabled = recipient?.preferences?.notifications?.push !== false

        if (pushEnabled) {
          await Notification.create({
            recipient: review.user,
            type: 'review_like',
            fromUser: user._id,
            title: 'Review Liked',
            message: `${user.fullName || user.username} liked your review of "${review.mediaTitle}".`,
            image: user.avatar || '',
            link: `/reviews/${review.mediaType}/${review.mediaId}`
          })
        }
      } catch (notifErr) {
        console.error('Failed to create like notification:', notifErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Review like toggled',
      data: {
        likes: review.likes.length,
        dislikes: review.dislikes.length,
        userLiked: review.likes.some(id => id?.toString() === user._id?.toString()),
        userDisliked: review.dislikes.some(id => id?.toString() === user._id?.toString())
      }
    })
  } catch (error) {
    console.error('Like review error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to like review'
      },
      { status: 500 }
    )
  }
})
