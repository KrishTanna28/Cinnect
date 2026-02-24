import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// POST /api/users/[id]/follow - Follow a user
export const POST = withAuth(async (request, { params, user }) => {
  try {
    const { id: targetUserId } = await params

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Can't follow yourself
    if (user._id.toString() === targetUserId) {
      return NextResponse.json(
        { success: false, message: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already following
    const isAlreadyFollowing = user.following.some(
      (id) => id.toString() === targetUserId
    )

    if (isAlreadyFollowing) {
      return NextResponse.json(
        { success: false, message: 'You are already following this user' },
        { status: 400 }
      )
    }

    // Add to current user's following list
    await User.findByIdAndUpdate(user._id, {
      $addToSet: { following: targetUserId }
    })

    // Add to target user's followers list
    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: user._id }
    })

    // Get updated counts
    const updatedUser = await User.findById(user._id).select('following')
    const updatedTarget = await User.findById(targetUserId).select('followers')

    return NextResponse.json({
      success: true,
      message: 'Successfully followed user',
      data: {
        followingCount: updatedUser.following.length,
        targetFollowersCount: updatedTarget.followers.length
      }
    })
  } catch (error) {
    console.error('Follow user error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to follow user' },
      { status: 500 }
    )
  }
})

// DELETE /api/users/[id]/follow - Unfollow a user
export const DELETE = withAuth(async (request, { params, user }) => {
  try {
    const { id: targetUserId } = await params

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Can't unfollow yourself
    if (user._id.toString() === targetUserId) {
      return NextResponse.json(
        { success: false, message: 'You cannot unfollow yourself' },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    // Remove from current user's following list
    await User.findByIdAndUpdate(user._id, {
      $pull: { following: targetUserId }
    })

    // Remove from target user's followers list
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: user._id }
    })

    // Get updated counts
    const updatedUser = await User.findById(user._id).select('following')
    const updatedTarget = await User.findById(targetUserId).select('followers')

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user',
      data: {
        followingCount: updatedUser.following.length,
        targetFollowersCount: updatedTarget.followers.length
      }
    })
  } catch (error) {
    console.error('Unfollow user error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to unfollow user' },
      { status: 500 }
    )
  }
})
