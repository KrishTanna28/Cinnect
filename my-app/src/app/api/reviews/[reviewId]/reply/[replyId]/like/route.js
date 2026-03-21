import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
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

    // Use the model method to toggle like on reply
    await review.likeReply(replyId, user._id)

    const reply = review.replies.id(replyId)

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
