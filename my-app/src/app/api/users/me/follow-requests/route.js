import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// GET /api/users/me/follow-requests - Get pending follow requests
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20

    // Populate follow requests
    const userWithRequests = await User.findById(user._id)
      .populate({
        path: 'followRequests.from',
        select: 'username fullName avatar level'
      })
      .select('followRequests')
      .lean()

    const requests = userWithRequests?.followRequests || []
    
    // Sort by most recent first
    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))

    // Paginate
    const start = (page - 1) * limit
    const paginatedRequests = requests.slice(start, start + limit)

    return NextResponse.json({
      success: true,
      data: {
        requests: paginatedRequests.map(req => ({
          _id: req.from?._id,
          username: req.from?.username,
          fullName: req.from?.fullName,
          avatar: req.from?.avatar,
          level: req.from?.level,
          requestedAt: req.requestedAt
        })).filter(r => r._id), // Filter out any null refs
        total: requests.length,
        page,
        hasMore: start + limit < requests.length
      }
    })
  } catch (error) {
    console.error('Get follow requests error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get follow requests' },
      { status: 500 }
    )
  }
})

// POST /api/users/me/follow-requests - Accept a follow request
export const POST = withAuth(async (request, { user }) => {
  try {
    const { requesterId } = await request.json()

    if (!requesterId) {
      return NextResponse.json(
        { success: false, message: 'Requester ID is required' },
        { status: 400 }
      )
    }

    // Check if the request exists
    const hasRequest = user.followRequests?.some(
      req => req.from.toString() === requesterId
    )

    if (!hasRequest) {
      return NextResponse.json(
        { success: false, message: 'Follow request not found' },
        { status: 404 }
      )
    }

    // Remove from follow requests
    user.followRequests = user.followRequests.filter(
      req => req.from.toString() !== requesterId
    )

    // Add to followers
    if (!user.followers.some(id => id.toString() === requesterId)) {
      user.followers.push(requesterId)
    }

    await user.save()

    // Add to requester's following
    await User.findByIdAndUpdate(requesterId, {
      $addToSet: { following: user._id }
    })

    return NextResponse.json({
      success: true,
      message: 'Follow request accepted',
      data: {
        followersCount: user.followers.length,
        pendingRequestsCount: user.followRequests.length
      }
    })
  } catch (error) {
    console.error('Accept follow request error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to accept follow request' },
      { status: 500 }
    )
  }
})

// DELETE /api/users/me/follow-requests - Decline a follow request
export const DELETE = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const requesterId = searchParams.get('requesterId')

    if (!requesterId) {
      return NextResponse.json(
        { success: false, message: 'Requester ID is required' },
        { status: 400 }
      )
    }

    // Remove from follow requests
    user.followRequests = (user.followRequests || []).filter(
      req => req.from.toString() !== requesterId
    )

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Follow request declined',
      data: {
        pendingRequestsCount: user.followRequests.length
      }
    })
  } catch (error) {
    console.error('Decline follow request error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to decline follow request' },
      { status: 500 }
    )
  }
})
