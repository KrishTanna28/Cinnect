import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// GET /api/users/me/favorites - Get user's favorites
export const GET = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    return NextResponse.json({
      success: true,
      data: user.favorites
    })
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get favorites'
      },
      { status: 500 }
    )
  }
})

// POST /api/users/me/favorites - Add to favorites
export const POST = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    const body = await request.json()
    const { movieId } = body

    if (!movieId) {
      return NextResponse.json(
        { success: false, message: 'Movie ID is required' },
        { status: 400 }
      )
    }

    await user.addToFavorites(movieId)

    return NextResponse.json({
      success: true,
      message: 'Added to favorites',
      data: user.favorites
    })
  } catch (error) {
    console.error('Add to favorites error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to add to favorites'
      },
      { status: 500 }
    )
  }
})
