import { NextResponse } from 'next/server'
import { getAuthTokenFromCookies } from '@/lib/utils/cookies'

/**
 * GET /api/auth/socket-token
 * Returns the auth token from httpOnly cookies for Socket.IO authentication
 * This is necessary because httpOnly cookies can't be read by client-side JavaScript
 */
export async function GET(request) {
  try {
    const token = getAuthTokenFromCookies(request)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ token })
  } catch (error) {
    console.error('[Socket Token] Error fetching token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
