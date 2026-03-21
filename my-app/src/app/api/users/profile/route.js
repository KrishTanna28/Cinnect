import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

// GET /api/users/profile - Get current user profile (alias for /api/users/me)
export const GET = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    return NextResponse.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get profile'
      },
      { status: 500 }
    )
  }
})
