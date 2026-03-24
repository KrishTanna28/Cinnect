import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import connectDB from '../config/database.js'
import { unauthorized, handleError } from '../utils/apiResponse.js'

/**
 * Higher-order function to protect API routes with authentication
 * Usage: export const GET = withAuth(async (request, { user }) => { ... })
 */
export function withAuth(handler) {
  return async (request, context) => {
    try {
      // Ensure database connection
      await connectDB()

      const authHeader = request.headers.get('authorization')

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorized()
      }

      const token = authHeader.replace('Bearer ', '')

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Fetch user from database
        const user = await User.findById(decoded.userId).select('-password')

        if (!user) {
          console.error('User not found in database:', decoded.userId)
          return unauthorized('Account not found')
        }

        // Add user to context
        const enhancedContext = { ...context, user }

        return handler(request, enhancedContext)
      } catch (jwtError) {
        if (jwtError.name === 'TokenExpiredError') {
          return unauthorized('Your session has expired. Please log in again')
        }
        console.error('JWT verification error:', jwtError.message)
        return unauthorized('Invalid authentication. Please log in again')
      }
    } catch (error) {
      return handleError(error, 'Auth middleware')
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token
 * Usage: export const GET = withOptionalAuth(async (request, { user }) => { ... })
 */
export function withOptionalAuth(handler) {
  return async (request, context) => {
    try {
      // Ensure database connection
      await connectDB()

      const authHeader = request.headers.get('authorization')

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token, continue without user
        return handler(request, { ...context, user: null })
      }

      const token = authHeader.replace('Bearer ', '')

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select('-password')

        const enhancedContext = { ...context, user: user || null }
        return handler(request, enhancedContext)
      } catch (jwtError) {
        // Invalid token, continue without user (don't fail)
        return handler(request, { ...context, user: null })
      }
    } catch (error) {
      // Log but don't expose internal errors
      console.error('Optional auth middleware error:', error)
      return handler(request, { ...context, user: null })
    }
  }
}

/**
 * Cron job protection - verifies cron secret
 * Usage: export const GET = withCronAuth(async (request) => { ... })
 */
export function withCronAuth(handler) {
  return async (request, context) => {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Check for cron secret in Authorization header
    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    return handler(request, context)
  }
}
