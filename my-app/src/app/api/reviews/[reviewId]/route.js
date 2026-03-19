import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import { withAuth } from '@/lib/middleware/withAuth.js'

// GET /api/reviews/[reviewId] - Get single review by ID
export async function GET(request, { params }) {
  try {
    const { reviewId } = await params

    const review = await Review.findById(reviewId)
      .populate('user', 'username avatar fullName')

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: review
    })
  } catch (error) {
    console.error('Get review error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get review'
      },
      { status: 500 }
    )
  }
}

// PUT /api/reviews/[reviewId] - Update review
export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const { reviewId } = await params
    const body = await request.json()
    const { rating, title, content, spoiler } = body

    const review = await Review.findById(reviewId)

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user owns this review
    if (review.user.toString() !== user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to update this review' },
        { status: 403 }
      )
    }

    // Update fields
    if (rating !== undefined) review.rating = rating
    if (title) review.title = title
    if (content) review.content = content
    if (spoiler !== undefined) review.spoiler = spoiler

    // Server-side spoiler detection if not explicitly checked during update
    if (review.spoiler === false && (title || content)) {
      try {
        const detectRes = await fetch(new URL('/api/spoiler-detect', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${review.title}. ${review.content}` })
        });
        const detectData = await detectRes.json();
        if (detectData.success && detectData.data?.isSpoiler) {
          review.spoiler = true;
          console.log(`[Backend Spoiler Detection] Updated review flagged as spoiler: ${(detectData.data.confidence * 100).toFixed(1)}%`);
        }
      } catch (err) {
        console.error('Backend spoiler detection failed for review update:', err);
      }
    }

    await review.save()
    await review.populate('user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      data: review
    })
  } catch (error) {
    console.error('Update review error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update review'
      },
      { status: 500 }
    )
  }
})

// DELETE /api/reviews/[reviewId] - Delete review
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { reviewId } = await params

    const review = await Review.findById(reviewId)

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Check if user owns this review
    if (review.user.toString() !== user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to delete this review' },
        { status: 403 }
      )
    }

    await review.deleteOne()

    // Remove from user's reviews array
    user.reviews = user.reviews.filter(id => id?.toString() !== reviewId)
    user.achievements.reviewsWritten = Math.max(0, user.achievements.reviewsWritten - 1)
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })
  } catch (error) {
    console.error('Delete review error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete review'
      },
      { status: 500 }
    )
  }
})
