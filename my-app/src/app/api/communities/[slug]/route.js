import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import User from '@/lib/models/User.js'
import { withAuth, withOptionalAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { uploadCommunityBannerToCloudinary, uploadCommunityIconToCloudinary, deleteImageFromCloudinary } from '@/lib/utils/cloudinaryHelper.js'

await connectDB()

// GET /api/communities/[slug] - Get community by slug
export const GET = withOptionalAuth(async (request, { params, user }) => {
  try {
    await connectDB();
    const { slug } = await params

    const community = await Community.findOne({ slug })
      .populate('creator', 'username avatar fullName')
      .populate('moderators', 'username avatar fullName')
      .lean()

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is a member, creator, or has pending request
    const isMember = user ? community.members.some(id => id?.toString() === user._id?.toString()) : false
    const isCreator = user ? community.creator._id?.toString() === user._id?.toString() : false
    const hasPendingRequest = user ? community.pendingRequests?.some(req => req.user.toString() === user._id?.toString()) : false

    // Find mutuals in community
    let mutuals = []
    if (user && user.following && user.following.length > 0) {
      const followingIds = user.following.map(id => id.toString())
      const memberIds = community.members?.map(id => id.toString()) || []
      const mutualIds = followingIds.filter(fid => memberIds.includes(fid))
      if (mutualIds.length > 0) {
        mutuals = await User.find({ _id: { $in: mutualIds } }).select('username avatar fullName').lean()
      }
    }
    community.members = undefined // Hide members array

    // Populate pending requests if user is creator
    let populatedCommunity = { ...community, mutuals }
    if (isCreator) {
      const fullCommunity = await Community.findOne({ slug })
        .populate('creator', 'username avatar fullName')
        .populate('moderators', 'username avatar fullName')
        .populate('pendingRequests.user', 'username avatar fullName')
        .lean()
      fullCommunity.members = undefined
      populatedCommunity = { ...fullCommunity, mutuals }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...populatedCommunity,
        isMember,
        isCreator,
        hasPendingRequest
      }
    })
  } catch (error) {
    console.error('Get community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch community'
      },
      { status: 500 }
    )
  }
})

// POST /api/communities/[slug] - Join community or request to join (if private)
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { slug } = await params

    const community = await Community.findOne({ slug })

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    if (community.isMember(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Already a member' },
        { status: 400 }
      )
    }

    // If private, create join request instead of directly joining
    if (community.isPrivate) {
      if (community.hasJoinRequest(user._id)) {
        return NextResponse.json(
          { success: false, message: 'Join request already pending' },
          { status: 400 }
        )
      }

      await community.addJoinRequest(user._id)

      return NextResponse.json({
        success: true,
        message: 'Join request sent. Waiting for approval.',
        data: { hasPendingRequest: true }
      })
    }

    // If public, join directly
    await community.addMember(user._id)

    return NextResponse.json({
      success: true,
      message: 'Joined community successfully',
      data: { memberCount: community.memberCount }
    })
  } catch (error) {
    console.error('Join community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to join community'
      },
      { status: 500 }
    )
  }
})

// DELETE /api/communities/[slug]/leave - Leave community  
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { slug } = await params

    const community = await Community.findOne({ slug })

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    if (community.creator.toString() === user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Creator cannot leave the community' },
        { status: 400 }
      )
    }

    if (!community.isMember(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Not a member' },
        { status: 400 }
      )
    }

    await community.removeMember(user._id)

    return NextResponse.json({
      success: true,
      message: 'Left community successfully',
      data: { memberCount: community.memberCount }
    })
  } catch (error) {
    console.error('Leave community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to leave community'
      },
      { status: 500 }
    )
  }
})

// PATCH /api/communities/[slug] - Update community (moderators only)
export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const { slug } = await params
    const body = await request.json()
    const { description, banner, icon, rules } = body

    const community = await Community.findOne({ slug })

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is moderator
    if (!community.isModerator(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Only moderators can update the community' },
        { status: 403 }
      )
    }

    // Update description if provided
    if (description !== undefined) {
      community.description = description
    }

    // Update rules if provided
    if (rules !== undefined) {
      community.rules = rules
    }

    // Update banner if provided
    if (banner) {
      try {
        // Delete old banner if exists
        if (community.banner) {
          await deleteImageFromCloudinary(community.banner).catch(err => 
            console.error('Failed to delete old banner:', err)
          )
        }
        const bannerUrl = await uploadCommunityBannerToCloudinary(banner, community._id?.toString())
        community.banner = bannerUrl
      } catch (imageError) {
        console.error('Banner upload error:', imageError)
        return NextResponse.json(
          { success: false, message: 'Failed to upload banner image' },
          { status: 500 }
        )
      }
    }

    // Update icon if provided
    if (icon) {
      try {
        // Delete old icon if exists
        if (community.icon) {
          await deleteImageFromCloudinary(community.icon).catch(err => 
            console.error('Failed to delete old icon:', err)
          )
        }
        const iconUrl = await uploadCommunityIconToCloudinary(icon, community._id?.toString())
        community.icon = iconUrl
      } catch (imageError) {
        console.error('Icon upload error:', imageError)
        return NextResponse.json(
          { success: false, message: 'Failed to upload icon image' },
          { status: 500 }
        )
      }
    }

    await community.save()

    return NextResponse.json({
      success: true,
      message: 'Community updated successfully',
      data: community
    })
  } catch (error) {
    console.error('Update community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update community'
      },
      { status: 500 }
    )
  }
})

