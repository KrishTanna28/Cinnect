import { NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// GET /api/users/[id]/following - Get user's following list
export const GET = withOptionalAuth(async (request, { params, user: currentUser }) => {
  try {
    const { id: userId } = await params

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''

    const targetUser = await User.findById(userId)
      .select('following')
      .lean()

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Build query for following
    let query = { _id: { $in: targetUser.following } }
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ]
    }

    const total = await User.countDocuments(query)
    const following = await User.find(query)
      .select('username fullName avatar level')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // If current user is logged in, mark which ones they follow
    const followingWithStatus = following.map((followedUser) => ({
      _id: followedUser._id,
      username: followedUser.username,
      fullName: followedUser.fullName,
      avatar: followedUser.avatar,
      level: followedUser.level,
      isFollowedByMe: currentUser
        ? currentUser.following.some((id) => id.toString() === followedUser._id.toString())
        : false
    }))

    return NextResponse.json({
      success: true,
      data: {
        users: followingWithStatus,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })
  } catch (error) {
    console.error('Get following error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get following' },
      { status: 500 }
    )
  }
})
