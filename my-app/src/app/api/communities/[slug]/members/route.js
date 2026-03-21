import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'
import Community from '@/lib/models/Community.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

export const GET = withOptionalAuth(async (request, { params, user: currentUser }) => {
  try {
    await connectDB();
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Community slug is required' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const search = searchParams.get('search') || ''
    const mutualsOnly = searchParams.get('mutualsOnly') === 'true'

    const community = await Community.findOne({ slug })
      .select('members isPrivate creator')
      .lean()

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    // Privacy check
    if (community.isPrivate) {
      const isCreator = currentUser && community.creator.toString() === currentUser._id.toString();
      const isMember = currentUser && community.members?.some(id => id.toString() === currentUser._id.toString());
      if (!isCreator && !isMember) {
        return NextResponse.json(
          { success: false, message: 'This community is private' },
          { status: 403 }
        )
      }
    }

    // Build query for members
    let query = { _id: { $in: community.members } }
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
    } else if (mutualsOnly) {
      // If not logged in, no mutuals
      return NextResponse.json({ success: true, data: { users: [], total: 0, page, totalPages: 0, hasMore: false } })
    }

    const total = await User.countDocuments(query)
    
    let members = []
    if (currentUser) {
      const myObjIdFollowing = currentUser.following || []
      members = await User.aggregate([
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
      members = await User.find(query)
        .select('username fullName avatar level')
        .sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    }

    // Mark follow status
    const membersWithStatus = members.map((member) => ({
      _id: member._id,
      username: member.username,
      fullName: member.fullName,
      avatar: member.avatar,
      level: member.level,
      isFollowedByMe: currentUser
        ? currentUser.following.some((id) => id.toString() === member._id.toString())
        : false
    }))

    return NextResponse.json({
      success: true,
      data: {
        users: membersWithStatus,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    })
  } catch (error) {
    console.error('Get community members error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get members' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request, { params, user: currentUser }) => {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!slug || !userId) {
      return NextResponse.json(
        { success: false, message: 'Community slug and userId are required' },
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

    if (community.creator.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'Only the creator can remove members' },
        { status: 403 }
      )
    }

    if (community.creator.toString() === userId) {
      return NextResponse.json(
        { success: false, message: 'The creator cannot be removed from the community' },
        { status: 400 }
      )
    }

    if (!community.isMember(userId)) {
      return NextResponse.json(
        { success: false, message: 'Member not found in this community' },
        { status: 404 }
      )
    }

    await community.removeMember(userId)

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
      data: {
        memberCount: community.memberCount
      }
    })
  } catch (error) {
    console.error('Remove community member error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to remove member' },
      { status: 500 }
    )
  }
})
