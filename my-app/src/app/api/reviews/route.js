import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import { generateEmbedding } from '@/lib/services/embedding.service.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { notifyFriendsAboutReview } from '@/lib/services/notification.service.js'
import { checkAdultContentAccess, getAdultContentFilter } from '@/lib/middleware/ageGate.js'
import { applyXpEvent, calculateReviewQuality, getProgressionSnapshot } from '@/lib/utils/gamification.js'
import connectDB from '@/lib/config/database.js'

// GET /api/reviews - Get reviews with optional filters
export async function GET(request) {
  await connectDB()
  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')
    const mediaType = searchParams.get('mediaType')
    const userId = searchParams.get('userId')
    const sortByParam = searchParams.get('sortBy') || 'top'
    const limit = parseInt(searchParams.get('limit')) || 10
    const page = parseInt(searchParams.get('page')) || 1
    const skip = (page - 1) * limit
    const sortBy =
      sortByParam === 'popular' ? 'top' :
      sortByParam === 'recent' ? 'latest' :
      (sortByParam === 'highest_rated' || sortByParam === 'rating') ? 'rating' :
      sortByParam

    const query = {}
    if (mediaId) query.mediaId = mediaId
    if (mediaType) query.mediaType = mediaType
    if (userId) query.user = userId
    query.isRemoved = { $ne: true }

    // Filter adult content for underage users
    const { shouldFilterAdult } = await checkAdultContentAccess(request)
    const adultFilter = getAdultContentFilter(shouldFilterAdult)
    Object.assign(query, adultFilter)

    const total = await Review.countDocuments(query)
    let reviews = []

    if (sortBy === 'top') {
      // Trending-style score aligned with community posts, with review-specific moderation penalties.
      const pipeline = [
        { $match: query },
        // Lookup user data to get rank/level
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $addFields: {
            userData: { $arrayElemAt: ['$userData', 0] }
          }
        },
        {
          $addFields: {
            likesCount: { $size: { $ifNull: ['$likes', []] } },
            dislikesCount: { $size: { $ifNull: ['$dislikes', []] } },
            repliesCount: { $size: { $ifNull: ['$replies', []] } },
            topScore: {
              $let: {
                vars: {
                  ageHours: {
                    $max: [0.1, { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3600000] }]
                  },
                  engagement: {
                    $add: [
                      { $size: { $ifNull: ['$likes', []] } },
                      { $multiply: [{ $size: { $ifNull: ['$replies', []] } }, 2] },
                      { $multiply: [{ $size: { $ifNull: ['$dislikes', []] } }, -1] }
                    ]
                  },
                  quality: {
                    $min: [
                      10,
                      {
                        $divide: [
                          {
                            $add: [
                              { $strLenCP: { $ifNull: ['$title', ''] } },
                              { $strLenCP: { $ifNull: ['$content', ''] } }
                            ]
                          },
                          120
                        ]
                      }
                    ]
                  },
                  // User rank boost: Higher level users get a small boost
                  userRankBoost: {
                    $multiply: [
                      { $ifNull: ['$userData.level', 1] },
                      0.5  // Each level adds 0.5 to the score
                    ]
                  },
                  penalties: {
                    $add: [
                      { $cond: [{ $ifNull: ['$spoiler', false] }, 1.5, 0] },
                      { $cond: [{ $ifNull: ['$adult_content', false] }, 1, 0] },
                      { $cond: [{ $ifNull: ['$isFlagged', false] }, 6, 0] },
                      { $multiply: [{ $ifNull: ['$flagCount', 0] }, 2] },
                      {
                        $multiply: [
                          { $ifNull: ['$moderation.confidence', 0] },
                          5
                        ]
                      }
                    ]
                  }
                },
                in: {
                  $divide: [
                    {
                      $subtract: [
                        {
                          $add: [
                            '$$engagement',
                            '$$quality',
                            '$$userRankBoost',
                            { $divide: ['$$engagement', '$$ageHours'] }
                          ]
                        },
                        '$$penalties'
                      ]
                    },
                    { $pow: [{ $add: ['$$ageHours', 2] }, 1.5] }
                  ]
                }
              }
            },
          }
        },
        { $sort: { topScore: -1, likesCount: -1, repliesCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 1 } }
      ]

      const aggregatedIds = await Review.aggregate(pipeline)
      const ids = aggregatedIds.map(doc => doc._id)

      const unsortedReviews = await Review.find({ _id: { $in: ids } })
        .populate('user', 'username avatar fullName')
        .populate({
          path: 'replies.user',
          select: 'username avatar fullName'
        })
      
      // Re-sort the populated documents into the aggregation order
      reviews = ids.map(id => unsortedReviews.find(r => r._id.equals(id))).filter(Boolean)
    } else {
      const sortOption = sortBy === 'rating'
        ? { rating: -1, createdAt: -1 }
        : { createdAt: -1 }
      
      reviews = await Review.find(query)
        .populate('user', 'username avatar fullName')
        .populate({
          path: 'replies.user',
          select: 'username avatar fullName'
        })
        .sort(sortOption)
        .limit(limit)
        .skip(skip)
    }

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
  
    await connectDB()
try {
    const body = await request.json()
    const { mediaId, mediaType, mediaTitle, rating, title, content, spoiler } = body

    if (!mediaId || !mediaType || !mediaTitle || rating === undefined || rating === null || !title || !content) {
      console.log('Missing fields in review creation:', { mediaId, mediaType, mediaTitle, rating, title, content })
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

    // Server-side spoiler detection if not explicitly checked by user
    let finalSpoiler = spoiler || false;
    if (!finalSpoiler) {
      try {
        const detectRes = await fetch(new URL('/api/spoiler-detect', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${title}. ${content}` })
        });
        const detectData = await detectRes.json();
        if (detectData.success && detectData.data?.isSpoiler) {
          finalSpoiler = true;
          console.log(`[Backend Spoiler Detection] Review flagged as spoiler: ${(detectData.data.confidence * 100).toFixed(1)}%`);
        }
      } catch (err) {
        console.error('Backend spoiler detection failed:', err);
      }
    }

    const review = new Review({
      mediaId,
      mediaType,
      mediaTitle,
      user: user._id,
      rating,
      title,
      content,
      spoiler: finalSpoiler
    })

    const earlierReviews = await Review.countDocuments({
      mediaId,
      mediaType,
      isRemoved: { $ne: true }
    })
    const quality = calculateReviewQuality(review)
    review.gamification = {
      qualityScore: quality.score,
      qualityDetails: quality.details,
      awardedLikeMilestone: 0
    }

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

    const xpEvent = applyXpEvent(user, {
      action: 'review_post',
      target: review,
      metadata: {
        reviewRank: earlierReviews + 1,
        qualityScore: quality.score,
        moderationConfidence: review?.moderation?.confidence || 0,
        isFlagged: review.isFlagged
      }
    })

    review.pointsAwarded = Math.max(0, xpEvent.grantedXp)
    await user.save()
    await review.save()

    // Populate user data before returning
    await review.populate('user', 'username avatar fullName')

    // Notify friends about this new review (async, don't wait for it)
    notifyFriendsAboutReview({
      reviewerId: user._id,
      reviewerData: {
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar
      },
      mediaId,
      mediaType,
      mediaTitle,
      genres: body.genres || [], // Pass genres if available from the frontend
      reviewUrl: `/reviews/${review._id}`
    }).catch(err => console.error('Failed to notify friends about review:', err));

    return NextResponse.json({
      success: true,
      message: 'Review created successfully',
      data: review,
      gamification: {
        xpEvent,
        progression: getProgressionSnapshot(user)
      }
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
