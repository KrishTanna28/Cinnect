import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/utils/cookies.js'

/**
 * Logout API endpoint
 * Clears authentication cookies and logs out the user
 */
export async function POST(request) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear authentication cookies
    clearAuthCookies(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)

    const response = NextResponse.json({
      success: false,
      error: 'Internal server error during logout'
    }, { status: 500 })

    // Even if there's an error, try to clear cookies
    clearAuthCookies(response)

    return response
  }
}

// Only allow POST method for logout
export async function GET() {
  return NextResponse.json({
    error: 'Method not allowed'
  }, { status: 405 })
}

// Only allow POST method for logout
export async function PUT() {
  return NextResponse.json({
    error: 'Method not allowed'
  }, { status: 405 })
}

// Only allow POST method for logout
export async function DELETE() {
  return NextResponse.json({
    error: 'Method not allowed'
  }, { status: 405 })
}