import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

/**
 * GET /api/content/[type]/[id]/friends-liked
 *
 * Returns the people the current user follows who have this content ID
 * in their favorites.
 *
 * Query params:
 *  - search : optional filter on username / fullName
 *  - page   : page number (default 1)
 *  - limit  : results per page (default 20)
 */
export const GET = withAuth(async (request, { params, user }) => {
  try {
    const { id: contentId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const followingIds = user.following || []

    if (followingIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { users: [], total: 0, hasMore: false },
      })
    }

    const filter = {
      _id: { $in: followingIds },
      'favorites.movieId': contentId,
    }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await User.countDocuments(filter)

    const friends = await User.find(filter)
      .select('username fullName avatar')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    const users = friends.map((f) => ({
      _id: f._id,
      username: f.username,
      fullName: f.fullName,
      avatar: f.avatar,
      isFollowedByMe: true,
    }))

    return NextResponse.json({
      success: true,
      data: { users, total, hasMore: page * limit < total },
    })
  } catch (error) {
    console.error('Friends-liked error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch friends who liked' },
      { status: 500 }
    )
  }
})
