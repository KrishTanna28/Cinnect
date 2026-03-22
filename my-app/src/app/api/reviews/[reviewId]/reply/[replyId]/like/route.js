import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
import { emitNotification } from '@/lib/socketServer.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// POST /api/reviews/[reviewId]/reply/[replyId]/like - Like/unlike a reply
export const POST = withAuth(async (request, { user, params }) => {
  
    await connectDB()
try {
    const { reviewId, replyId } = await params

    const review = await Review.findById(reviewId)

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    const reply = review.replies.id(replyId)
    if (!reply) {
      return NextResponse.json(
        { success: false, message: 'Reply not found' },
        { status: 404 }
      )
    }

    // Check if it was already liked
    const wasAlreadyLiked = reply.likes.some(id => id?.toString() === user._id?.toString())

    // Use the model method to toggle like on reply
    await review.likeReply(replyId, user._id)

    // Send notification if a new like and not self-like
    if (!wasAlreadyLiked && reply.user.toString() !== user._id.toString()) {
      try {
        const recipient = await User.findById(reply.user).select('preferences').lean()
        if (recipient?.preferences?.notifications?.push !== false) {
          const notif = await Notification.create({
            recipient: reply.user,
            type: 'review_reply_like',
            fromUser: user._id,
            title: 'Reply Liked',
            message: `${user.fullName || user.username} liked your reply.`,
            image: user.avatar || '',
            link: `/reviews/${review.mediaType}/${review.mediaId}`
          })
          await emitNotification(reply.user.toString(), notif.toObject())
        }
      } catch (notifErr) {
        console.error('Failed to create reply like notification:', notifErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reply like toggled',
      data: {
        likes: reply.likes.length,
        dislikes: reply.dislikes.length,
        userLiked: reply.likes.some(id => id?.toString() === user._id?.toString()),
        userDisliked: reply.dislikes.some(id => id?.toString() === user._id?.toString())
      }
    })
  } catch (error) {
    console.error('Like reply error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to like reply'
      },
      { status: 500 }
    )
  }
})
