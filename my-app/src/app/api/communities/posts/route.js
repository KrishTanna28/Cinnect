import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import Community from '@/lib/models/Community.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'
import { buildFuzzyMongoQuery } from '@/lib/utils/fuzzySearch.js'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'

await connectDB()

// GET /api/communities/posts - Get all posts across all communities
export const GET = withOptionalAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sort') || 'recent'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // First, find communities matching the category filter
    let communityQuery = { isActive: true }
    if (category && category !== 'all') {
      communityQuery.category = category
    }

    if (user) {
      // User can see public communities or private ones they are members of
      communityQuery.$or = [
        { isPrivate: { $ne: true } },
        { members: user._id }
      ]
    } else {
      // Unauthenticated users can only see public communities
      communityQuery.isPrivate = { $ne: true }
    }

    const communityIds = await Community.find(communityQuery).distinct('_id')

    // Build post query
    let postQuery = { 
      community: { $in: communityIds },
      isApproved: true 
    }

    // If search is provided, use fuzzy matching to tolerate typos
    if (search) {
      const fuzzyQuery = buildFuzzyMongoQuery(search, ['title', 'content'])
      if (fuzzyQuery.$or) {
        postQuery.$or = fuzzyQuery.$or
      }
    }

    const skip = (page - 1) * limit

    // Use aggregation for proper sorting with computed fields
    const pipeline = [
      { $match: postQuery },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          dislikesCount: { $size: { $ifNull: ['$dislikes', []] } },
          commentsCount: { $size: { $ifNull: ['$comments', []] } },
          // Score = likes - dislikes (for popular sorting)
          score: {
            $subtract: [
              { $size: { $ifNull: ['$likes', []] } },
              { $size: { $ifNull: ['$dislikes', []] } }
            ]
          },
          // Hot score: engagement weighted by recency (Wilson score approximation)
          // Higher engagement + more recent = higher hot score
          hotScore: {
            $add: [
              // Base engagement score
              {
                $multiply: [
                  {
                    $add: [
                      { $size: { $ifNull: ['$likes', []] } },
                      { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] },
                      { $divide: [{ $ifNull: ['$views', 0] }, 10] }
                    ]
                  },
                  // Decay factor based on age (posts older than 48h get penalized)
                  {
                    $max: [
                      0.1,
                      {
                        $subtract: [
                          1,
                          {
                            $divide: [
                              { $subtract: [new Date(), '$createdAt'] },
                              172800000 // 48 hours in milliseconds
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              // Bonus for very recent posts (last 6 hours)
              {
                $cond: [
                  { $lt: [{ $subtract: [new Date(), '$createdAt'] }, 21600000] }, // 6 hours
                  5,
                  0
                ]
              }
            ]
          }
        }
      }
    ]

    // Add sorting based on sortBy parameter
    switch (sortBy) {
      case 'popular':
        // Most popular: highest score (likes - dislikes), then by total engagement
        pipeline.push({
          $sort: { score: -1, likesCount: -1, commentsCount: -1, createdAt: -1 }
        })
        break
      case 'hot':
        // Trending: hot score (recent + engaging posts)
        pipeline.push({
          $sort: { hotScore: -1, createdAt: -1 }
        })
        break
      case 'recent':
      default:
        // Most recent: by creation time
        pipeline.push({
          $sort: { createdAt: -1 }
        })
        break
    }

    // Pagination
    pipeline.push({ $skip: skip })
    pipeline.push({ $limit: limit })

    // Lookup user and community
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { username: 1, avatar: 1, fullName: 1 } }]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'communities',
          localField: 'community',
          foreignField: '_id',
          as: 'community',
          pipeline: [{ $project: { name: 1, slug: 1, icon: 1, category: 1 } }]
        }
      },
      { $unwind: { path: '$community', preserveNullAndEmptyArrays: true } }
    )

    const [posts, totalCount] = await Promise.all([
      Post.aggregate(pipeline),
      Post.countDocuments(postQuery)
    ])

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Get all posts error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch posts'
      },
      { status: 500 }
    )
  }
})
