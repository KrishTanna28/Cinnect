import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// POST /api/communities/[slug]/requests - Approve or reject join request
export const POST = withAuth(async (request, { user, params }) => {
  try {
    await connectDB();
    const { slug } = await params
    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be "approve" or "reject"' },
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

    // Check if user is the creator
    if (community.creator.toString() !== user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Only the creator can manage join requests' },
        { status: 403 }
      )
    }

    // Check if join request exists
    if (!community.hasJoinRequest(userId)) {
      return NextResponse.json(
        { success: false, message: 'Join request not found' },
        { status: 404 }
      )
    }

    if (action === 'approve') {
      await community.approveJoinRequest(userId)
      return NextResponse.json({
        success: true,
        message: 'Join request approved',
        data: { memberCount: community.memberCount }
      })
    } else {
      await community.removeJoinRequest(userId)
      return NextResponse.json({
        success: true,
        message: 'Join request rejected'
      })
    }
  } catch (error) {
    console.error('Manage join request error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to manage join request'
      },
      { status: 500 }
    )
  }
})

// DELETE /api/communities/[slug]/requests - Cancel own join request
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

    if (!community.hasJoinRequest(user._id)) {
      return NextResponse.json(
        { success: false, message: 'No pending join request found' },
        { status: 404 }
      )
    }

    await community.removeJoinRequest(user._id)

    return NextResponse.json({
      success: true,
      message: 'Join request cancelled'
    })
  } catch (error) {
    console.error('Cancel join request error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to cancel join request'
      },
      { status: 500 }
    )
  }
})
