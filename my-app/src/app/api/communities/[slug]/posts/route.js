import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import Community from '@/lib/models/Community.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { uploadPostImagesToCloudinary, uploadPostVideosToCloudinary } from '@/lib/utils/cloudinaryHelper.js'
import { generateEmbedding } from '@/lib/services/embedding.service.js'

await connectDB()

// GET /api/communities/[slug]/posts - Get posts in community
export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const sortBy = searchParams.get('sort') || 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const community = await Community.findOne({ slug })
    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    const postQuery = { community: community._id, isApproved: true }
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
          // Hot score: engagement weighted by recency
          hotScore: {
            $add: [
              {
                $multiply: [
                  {
                    $add: [
                      { $size: { $ifNull: ['$likes', []] } },
                      { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 2] },
                      { $divide: [{ $ifNull: ['$views', 0] }, 10] }
                    ]
                  },
                  {
                    $max: [
                      0.1,
                      {
                        $subtract: [
                          1,
                          {
                            $divide: [
                              { $subtract: [new Date(), '$createdAt'] },
                              172800000 // 48 hours
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                $cond: [
                  { $lt: [{ $subtract: [new Date(), '$createdAt'] }, 21600000] },
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
        pipeline.push({ $sort: { score: -1, likesCount: -1, commentsCount: -1, createdAt: -1 } })
        break
      case 'hot':
        pipeline.push({ $sort: { hotScore: -1, createdAt: -1 } })
        break
      case 'recent':
      default:
        pipeline.push({ $sort: { createdAt: -1 } })
        break
    }

    // Pagination
    pipeline.push({ $skip: skip })
    pipeline.push({ $limit: limit })

    // Lookup user
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
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    )

    const [posts, total] = await Promise.all([
      Post.aggregate(pipeline),
      Post.countDocuments(postQuery)
    ])

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch posts'
      },
      { status: 500 }
    )
  }
}

// POST /api/communities/[slug]/posts - Create post in community
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { slug } = await params
    const body = await request.json()
    const { title, content, images, videos, spoiler } = body

    if (!title) {
      return NextResponse.json(
        { success: false, message: 'Title is required' },
        { status: 400 }
      )
    }

    const community = await Community.findOne({ slug })
    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is a member
    if (!community.isMember(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Must be a member to post' },
        { status: 403 }
      )
    }

    // Create post
    const post = await Post.create({
      community: community._id,
      title,
      content,
      spoiler: spoiler || false,
      images: [],
      videos: [],
      user: user._id
    })

    // Generate embedding for RAG (non-blocking — don't fail the request)
    try {
      const embeddingText = `${title}. ${content || ''}`;
      post.embedding = await generateEmbedding(embeddingText);
      await post.save();
    } catch (embErr) {
      console.error('Embedding generation failed (post saved without it):', embErr);
    }

    // Upload images to Cloudinary if provided
    if (images && images.length > 0) {
      try {
        const imageUrls = await uploadPostImagesToCloudinary(images, post._id?.toString())
        post.images = imageUrls
        await post.save()
      } catch (imageError) {
        console.error('Image upload error:', imageError)
        // Continue without images - post is already created
      }
    }

    // Upload videos to Cloudinary if provided
    if (videos && videos.length > 0) {
      try {
        const videoUrls = await uploadPostVideosToCloudinary(videos, post._id?.toString())
        post.videos = videoUrls
        await post.save()
      } catch (videoError) {
        console.error('Video upload error:', videoError)
        // Continue without videos - post is already created
      }
    }

    // Update community post count
    community.postCount += 1
    await community.save()

    await post.populate('user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Post created successfully',
      data: post
    }, { status: 201 })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create post'
      },
      { status: 500 }
    )
  }
})
