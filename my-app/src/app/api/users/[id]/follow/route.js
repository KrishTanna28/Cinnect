import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
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

    // Check if already sent a follow request
    const hasExistingRequest = targetUser.followRequests?.some(
      req => req.from.toString() === user._id.toString()
    )

    if (hasExistingRequest) {
      return NextResponse.json(
        { success: false, message: 'Follow request already sent' },
        { status: 400 }
      )
    }

    // If target user has a private account, send a follow request instead
    if (targetUser.isPrivate) {
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followRequests: { from: user._id, requestedAt: new Date() } }
      })

      return NextResponse.json({
        success: true,
        message: 'Follow request sent',
        data: {
          status: 'requested',
          followingCount: user.following.length,
          targetFollowersCount: targetUser.followers.length
        }
      })
    }

    // Public account - follow directly
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

    // Create "new follower" notification for the target user
    try {
      await Notification.create({
        recipient: targetUserId,
        type: 'new_follower',
        fromUser: user._id,
        title: 'New Follower',
        message: `${user.fullName || user.username} started following you.`,
        image: user.avatar || '',
        link: `/profile/${user._id}`
      })
    } catch (notifErr) {
      console.error('Failed to create follow notification:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully followed user',
      data: {
        status: 'following',
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

    // Check if there's a pending follow request to cancel
    const hasPendingRequest = targetUser.followRequests?.some(
      req => req.from.toString() === user._id.toString()
    )

    if (hasPendingRequest) {
      // Cancel the follow request
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followRequests: { from: user._id } }
      })

      return NextResponse.json({
        success: true,
        message: 'Follow request cancelled',
        data: {
          status: 'none',
          followingCount: user.following.length,
          targetFollowersCount: targetUser.followers.length
        }
      })
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

    // Create "lost follower" notification for the target user
    try {
      await Notification.create({
        recipient: targetUserId,
        type: 'lost_follower',
        fromUser: user._id,
        title: 'Lost a Follower',
        message: `${user.fullName || user.username} unfollowed you.`,
        image: user.avatar || '',
        link: `/profile/${user._id}`
      })
    } catch (notifErr) {
      console.error('Failed to create unfollow notification:', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user',
      data: {
        status: 'none',
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
