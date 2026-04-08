import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import Community from '@/lib/models/Community.js'

await connectDB()

// GET /api/users/me/communities - Get communities user created or joined
export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const query = {
      isActive: true,
      $or: [
        { creator: user._id },
        { members: user._id }
      ]
    }

    const [communities, total] = await Promise.all([
      Community.find(query)
        .select('name slug description category icon memberCount postCount isPrivate creator createdAt')
        .populate('creator', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Community.countDocuments(query)
    ])

    const currentUserId = user._id?.toString()
    const normalized = communities.map((community) => ({
      ...community,
      isCreator: community.creator?._id?.toString() === currentUserId
    }))

    return NextResponse.json({
      success: true,
      data: normalized,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get my communities error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch communities'
      },
      { status: 500 }
    )
  }
})
