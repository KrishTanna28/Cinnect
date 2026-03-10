import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import { generateEmbedding } from '@/lib/services/embedding.service.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { checkAdultContentAccess, getAdultContentFilter } from '@/lib/middleware/ageGate.js'

// GET /api/reviews - Get reviews with optional filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')
    const mediaType = searchParams.get('mediaType')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit')) || 10
    const page = parseInt(searchParams.get('page')) || 1
    const skip = (page - 1) * limit

    const query = {}
    if (mediaId) query.mediaId = mediaId
    if (mediaType) query.mediaType = mediaType
    if (userId) query.user = userId

    // Filter adult content for underage users
    const { shouldFilterAdult } = await checkAdultContentAccess(request)
    const adultFilter = getAdultContentFilter(shouldFilterAdult)
    Object.assign(query, adultFilter)

    const reviews = await Review.find(query)
      .populate('user', 'username avatar fullName')
      .populate({
        path: 'replies.user',
        select: 'username avatar fullName'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)

    const total = await Review.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    })
  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get reviews'
      },
      { status: 500 }
    )
  }
}

// POST /api/reviews - Create a new review
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const { mediaId, mediaType, mediaTitle, rating, title, content, spoiler } = body

    if (!mediaId || !mediaType || !mediaTitle || !rating || !title || !content) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this media
    const existingReview = await Review.findOne({
      user: user._id,
      mediaId,
      mediaType
    })

    if (existingReview) {
      return NextResponse.json(
        { success: false, message: 'You have already reviewed this media' },
        { status: 400 }
      )
    }

    const review = new Review({
      mediaId,
      mediaType,
      mediaTitle,
      user: user._id,
      rating,
      title,
      content,
      spoiler: spoiler || false
    })

    // Run adult content text moderation (non-blocking)
    try {
      const moderationText = `${title}. ${content}`
      const textResult = await moderateText(moderationText)
      review.adult_content = textResult.isAdult
      review.moderation = {
        text_score: textResult.score,
        moderation_type: textResult.isAdult ? 'text' : null,
        confidence: textResult.score
      }
    } catch (modErr) {
      console.error('Review moderation failed (saved without moderation):', modErr)
    }

    // Generate embedding for RAG (non-blocking — don't fail the request)
    try {
      const embeddingText = `${mediaTitle} — ${title}. ${content}`;
      review.embedding = await generateEmbedding(embeddingText);
    } catch (embErr) {
      console.error('Embedding generation failed (review will be saved without it):', embErr);
    }

    await review.save()

    // Update user's reviews array and achievements
    user.reviews.push(review._id)
    user.achievements.reviewsWritten += 1
    await user.save()

    // Populate user data before returning
    await review.populate('user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Review created successfully',
      data: review
    })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create review'
      },
      { status: 500 }
    )
  }
})
