import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// DELETE /api/users/me/favorites/[id] - Remove from favorites
export const DELETE = withAuth(async (request, { user, params }) => {
  
    await connectDB()
try {
    const { id: movieId } = await params

    if (!movieId) {
      return NextResponse.json(
        { success: false, message: 'Movie ID is required' },
        { status: 400 }
      )
    }

    await user.removeFromFavorites(movieId)

    return NextResponse.json({
      success: true,
      message: 'Removed from favorites',
      data: user.favorites
    })
  } catch (error) {
    console.error('Remove from favorites error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to remove from favorites'
      },
      { status: 500 }
    )
  }
})
