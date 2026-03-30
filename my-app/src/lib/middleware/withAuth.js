import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import connectDB from '../config/database.js'
import { unauthorized, handleError } from '../utils/apiResponse.js'

/**
 * Extract possible tokens from request.
 * Header token is checked first, but middleware can gracefully fall back to cookie
 * if header token is stale/invalid.
 */
function getTokensFromRequest(request) {
  const tokens = []

  // Authorization header token
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.replace('Bearer ', '').trim()
    if (headerToken) tokens.push({ token: headerToken, source: 'header' })
  }

  // Cookie token
  const authCookie = request.cookies.get('auth_token')
  if (authCookie?.value) {
    const cookieToken = authCookie.value.trim()
    // Avoid duplicate verification if header and cookie tokens match
    if (cookieToken && !tokens.some(t => t.token === cookieToken)) {
      tokens.push({ token: cookieToken, source: 'cookie' })
    }
  }

  return tokens
}

/**
 * Higher-order function to protect API routes with authentication
 * Usage: export const GET = withAuth(async (request, { user }) => { ... })
 */
export function withAuth(handler) {
  return async (request, context) => {
    try {
      // Ensure database connection
      await connectDB()

      const tokens = getTokensFromRequest(request)

      if (!tokens.length) {
        return unauthorized()
      }

      let lastJwtError = null

      for (const { token, source } of tokens) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)

          // Fetch user from database
          const user = await User.findById(decoded.userId).select('-password')

          if (!user) {
            console.error(`User not found in database for ${source} token:`, decoded.userId)
            continue
          }

          // Add user to context
          const enhancedContext = { ...context, user }
          return handler(request, enhancedContext)
        } catch (jwtError) {
          lastJwtError = jwtError
          console.error(`JWT verification error (${source} token):`, jwtError.message)
          continue
        }
      }

      if (lastJwtError?.name === 'TokenExpiredError') {
        return unauthorized('Your session has expired. Please log in again')
      }
      return unauthorized('Invalid authentication. Please log in again')
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

      const tokens = getTokensFromRequest(request)

      if (!tokens.length) {
        // No token, continue without user
        return handler(request, { ...context, user: null })
      }

      for (const { token } of tokens) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          const user = await User.findById(decoded.userId).select('-password')

          if (user) {
            const enhancedContext = { ...context, user }
            return handler(request, enhancedContext)
          }
        } catch (jwtError) {
          // Try next token source (if any)
          continue
        }
      }

      // No valid token found
      return handler(request, { ...context, user: null })
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
