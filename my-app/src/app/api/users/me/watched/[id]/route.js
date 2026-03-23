import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// DELETE /api/users/me/watched/[id] - Remove from watched
export const DELETE = withAuth(async (request, context) => {
  await connectDB()
  try {
    const { user } = context
    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Movie/Show ID is required' },
        { status: 400 }
      )
    }

    await user.removeFromWatched(id)

    return NextResponse.json({
      success: true,
      message: 'Removed from watched history',
      data: user.watchHistory
    })
  } catch (error) {
    console.error('Remove from watched error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to remove from watched history'
      },
      { status: 500 }
    )
  }
})
