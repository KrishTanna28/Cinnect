import { NextResponse } from 'next/server'
import { verifyToken, generateToken } from '@/lib/utils/jwt.js'
import User from '@/lib/models/User.js'
import connectDB from '@/lib/config/database.js'

// POST /api/auth/refresh - Refresh JWT token
export async function POST(request) {
  await connectDB()
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    try {
      // Verify the old token (even if expired, we can still decode it)
      const decoded = verifyToken(token)
      
      // Check if user still exists
      const user = await User.findById(decoded.userId).select('-password')
      
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 401 }
        )
      }

      // Generate new token
      const newToken = generateToken(user._id?.toString())

      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
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
    } catch (jwtError) {
      // If token is expired, we can still try to refresh if it's not too old
      if (jwtError.name === 'TokenExpiredError') {
        try {
          // Decode without verification to get userId
          const decoded = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString()
          )
          
          // Check if user still exists
          const user = await User.findById(decoded.userId).select('-password')
          
          if (!user) {
            return NextResponse.json(
              { success: false, message: 'User not found' },
              { status: 401 }
            )
          }

          // Check if token expired more than 7 days ago
          const expiredAt = decoded.exp * 1000
          const now = Date.now()
          const daysSinceExpiry = (now - expiredAt) / (1000 * 60 * 60 * 24)
          
          if (daysSinceExpiry > 7) {
            return NextResponse.json(
              { success: false, message: 'Token expired too long ago, please login again' },
              { status: 401 }
            )
          }

          // Generate new token
          const newToken = generateToken(user._id?.toString())

          return NextResponse.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
              token: newToken,
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
        } catch (error) {
          console.error('Failed to refresh expired token:', error)
          return NextResponse.json(
            { success: false, message: 'Invalid token' },
            { status: 401 }
          )
        }
      }

      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
