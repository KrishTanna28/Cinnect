import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// GET /api/users/me/watchlist - Get user's watchlist
export const GET = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    return NextResponse.json({
      success: true,
      data: user.watchlist
    })
  } catch (error) {
    console.error('Get watchlist error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get watchlist'
      },
      { status: 500 }
    )
  }
})

// POST /api/users/me/watchlist - Add to watchlist
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

    await user.addToWatchlist(movieId)

    return NextResponse.json({
      success: true,
      message: 'Added to watchlist',
      data: user.watchlist
    })
  } catch (error) {
    console.error('Add to watchlist error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to add to watchlist'
      },
      { status: 500 }
    )
  }
})
