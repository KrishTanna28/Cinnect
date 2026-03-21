import { NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// GET /api/users/[id]/followers - Get user's followers list
export const GET = withOptionalAuth(async (request, { params, user: currentUser }) => {
  try {
    await connectDB();
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
    const mutualsOnly = searchParams.get('mutualsOnly') === 'true'

    const targetUser = await User.findById(userId)
      .select('followers isPrivate')
      .lean()

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Privacy check
    if (targetUser.isPrivate) {
      const isOwnProfile = currentUser && currentUser._id.toString() === userId;
      const isFollowing = currentUser && targetUser.followers?.some(id => id.toString() === currentUser._id.toString());
      if (!isOwnProfile && !isFollowing && !mutualsOnly) {
        return NextResponse.json(
          { success: false, message: 'This account is private' },
          { status: 403 }
        )
      }
    }

    // Build query for followers
    let query = { _id: { $in: targetUser.followers } }
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ]
    }

    if (currentUser) {
      const currentUserDoc = await User.findById(currentUser._id).select('blockedUsers').lean();
      const myBlockedUsers = currentUserDoc?.blockedUsers || [];
      
      const extraFilters = [
        { _id: { $nin: myBlockedUsers } },
        { blockedUsers: { $ne: currentUser._id } }
      ]
      
      if (mutualsOnly) {
        extraFilters.push({ _id: { $in: currentUser.following } })
      }

      query.$and = extraFilters;
    }

    const total = await User.countDocuments(query)
    
    let followers = []
    if (currentUser) {
      const myObjIdFollowing = currentUser.following || []
      followers = await User.aggregate([
        { $match: query },
        { 
          $addFields: {
            isCurrentUser: { $eq: ["$_id", currentUser._id] },
            isMutual: { $in: ["$_id", myObjIdFollowing] }
          }
        },
        { $sort: { isCurrentUser: -1, isMutual: -1, _id: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { username: 1, fullName: 1, avatar: 1, level: 1 } }
      ])
    } else {
      followers = await User.find(query)
        .select('username fullName avatar level')
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    }

    // If current user is logged in, mark which ones they follow
    const followersWithStatus = followers.map((follower) => ({
      _id: follower._id,
      username: follower.username,
      fullName: follower.fullName,
      avatar: follower.avatar,
      level: follower.level,
      isFollowedByMe: currentUser
        ? currentUser.following.some((id) => id.toString() === follower._id.toString())
        : false
    }))

    return NextResponse.json({
      success: true,
      data: {
        users: followersWithStatus,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })
  } catch (error) {
    console.error('Get followers error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get followers' },
      { status: 500 }
    )
  }
})
