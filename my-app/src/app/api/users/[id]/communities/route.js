import { NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import User from '@/lib/models/User.js'
import Community from '@/lib/models/Community.js'

await connectDB()

// GET /api/users/[id]/communities - Get communities a user created or joined
export const GET = withOptionalAuth(async (request, { params, user: currentUser }) => {
  try {
    await connectDB()

    const { id: userId } = await params

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    const targetUser = await User.findById(userId)
      .select('followers isPrivate blockedUsers')
      .lean()

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    const isOwnProfile = currentUser && currentUser._id?.toString() === userId
    const isFollowing = currentUser
      ? targetUser.followers?.some((id) => id.toString() === currentUser._id.toString())
      : false

    // Respect account privacy settings for community visibility
    if (targetUser.isPrivate && !isOwnProfile && !isFollowing) {
      return NextResponse.json(
        { success: false, message: 'This account is private' },
        { status: 403 }
      )
    }

    // Block relationship checks for authenticated viewers
    if (currentUser) {
      const currentUserDoc = await User.findById(currentUser._id)
        .select('blockedUsers')
        .lean()

      const blockedByTarget = targetUser.blockedUsers?.some(
        (blockedId) => blockedId.toString() === currentUser._id.toString()
      )
      const blockedByCurrentUser = currentUserDoc?.blockedUsers?.some(
        (blockedId) => blockedId.toString() === userId
      )

      if (blockedByTarget || blockedByCurrentUser) {
        return NextResponse.json(
          { success: false, message: 'Account not available' },
          { status: 403 }
        )
      }
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const skip = (page - 1) * limit

    const query = {
      isActive: true,
      $or: [
        { creator: userId },
        { members: userId }
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

    const normalized = communities.map((community) => ({
      ...community,
      isCreator: community.creator?._id?.toString() === userId
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
    console.error('Get user communities error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch communities'
      },
      { status: 500 }
    )
  }
})
