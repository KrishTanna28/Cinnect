import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
import { withAuth } from '@/lib/middleware/withAuth.js'

// POST /api/reviews/[reviewId]/reply - Add a reply to a review
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { reviewId } = await params
    const body = await request.json()
    const { content, spoiler } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reply content is required' },
        { status: 400 }
      )
    }

    const review = await Review.findById(reviewId)

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Add reply using model method
    await review.addReply(user._id, content, spoiler || false)

    // Update user achievements
    user.achievements.commentsPosted += 1
    user.markModified('achievements.commentsPosted')
    await user.save()

    // Send notification to review author (if not self-reply)
    if (review.user.toString() !== user._id.toString()) {
      try {
        const recipient = await User.findById(review.user).select('preferences').lean()
        const pushEnabled = recipient?.preferences?.notifications?.push !== false

        if (pushEnabled) {
          await Notification.create({
            recipient: review.user,
            type: 'review_reply',
            fromUser: user._id,
            title: 'New Reply',
            message: `${user.fullName || user.username} replied to your review of "${review.mediaTitle}".`,
            image: user.avatar || '',
            link: `/reviews/${review.mediaType}/${review.mediaId}`
          })
        }
      } catch (notifErr) {
        console.error('Failed to create reply notification:', notifErr)
      }
    }

    // Populate the review with user data
    await review.populate('replies.user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Reply added successfully',
      data: review
    })
  } catch (error) {
    console.error('Add reply error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to add reply'
      },
      { status: 500 }
    )
  }
})
