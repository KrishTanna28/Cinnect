import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// GET /api/users/me/watched - Get user's watched history
export const GET = withAuth(async (request, { user }) => {
  await connectDB()
  try {
    return NextResponse.json({
      success: true,
      data: user.watchHistory
    })
  } catch (error) {
    console.error('Get watched history error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get watched history'
      },
      { status: 500 }
    )
  }
})

// POST /api/users/me/watched - Mark as watched
export const POST = withAuth(async (request, { user }) => {
  await connectDB()
  try {
    const body = await request.json()
    const { movieId, mediaType = 'movie' } = body

    if (!movieId) {
      return NextResponse.json(
        { success: false, message: 'Movie/Show ID is required' },
        { status: 400 }
      )
    }

    await user.markAsWatched(movieId, mediaType)

    return NextResponse.json({
      success: true,
      message: 'Marked as watched',
      data: user.watchHistory
    })
  } catch (error) {
    console.error('Mark as watched error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to mark as watched'
      },
      { status: 500 }
    )
  }
})
