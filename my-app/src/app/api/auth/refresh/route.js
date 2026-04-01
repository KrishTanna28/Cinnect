import { NextResponse } from 'next/server'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/utils/jwt.js'
import { getRefreshTokenFromCookies, setAuthCookies } from '@/lib/utils/cookies.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'
import { v4 as uuidv4 } from 'uuid'

// POST /api/auth/refresh - Refresh JWT tokens using refresh token from cookies
export async function POST(request) {
  await connectDB()

  try {
    // Get refresh token from httpOnly cookies
    const refreshToken = getRefreshTokenFromCookies(request)

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token provided' },
        { status: 401 }
      )
    }

    try {
      // Verify the refresh token
      const decoded = verifyRefreshToken(refreshToken)

      // Check if user still exists
      const user = await User.findById(decoded.userId).select('-password')

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 401 }
        )
      }

      // Generate new tokens with refresh token rotation
      // Preserve the rememberMe setting from the original token
      const rememberMe = decoded.rememberMe || false
      const newAccessToken = generateAccessToken(user._id?.toString())
      const newRefreshToken = generateRefreshToken(user._id?.toString(), uuidv4(), rememberMe)

      // Create response
      const response = NextResponse.json({
        success: true,
        message: 'Tokens refreshed successfully',
        accessToken: newAccessToken, // Include access token for Socket.IO
        data: {
          user: {
            id: user._id?.toString(),
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            avatar: user.avatar,
            role: user.role
          }
        }
      })

      // Use the same rememberMe setting for cookie persistence
      setAuthCookies(response, newAccessToken, newRefreshToken, rememberMe)

      return response

    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return NextResponse.json(
          { success: false, message: 'Refresh token expired. Please log in again.' },
          { status: 401 }
        )
      } else if (jwtError.name === 'JsonWebTokenError') {
        return NextResponse.json(
          { success: false, message: 'Invalid refresh token' },
          { status: 401 }
        )
      } else {
        // Other JWT errors
        console.error('JWT verification error:', jwtError)
        return NextResponse.json(
          { success: false, message: 'Token verification failed' },
          { status: 401 }
        )
      }
    }

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}

// Only allow POST method for token refresh
export async function GET() {
  return NextResponse.json({
    error: 'Method not allowed. Use POST to refresh tokens.'
  }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({
    error: 'Method not allowed. Use POST to refresh tokens.'
  }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({
    error: 'Method not allowed. Use POST to refresh tokens.'
  }, { status: 405 })
}