import { rateLimited } from './apiResponse.js'

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

// Store request counts by IP/key
const requestCounts = new Map()

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetAt) {
      requestCounts.delete(key)
    }
  }
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // Auth endpoints - strict limits to prevent brute force
  AUTH: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute

  // AI endpoints - moderate limits due to cost
  AI: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute

  // Review/comment endpoints - moderate limits
  CONTENT: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute

  // General API endpoints - generous limits
  GENERAL: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute

  // Sensitive operations (follow, block, etc.)
  SENSITIVE: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 requests per minute
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request) {
  // Try to get real IP from various headers
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  // Use the first forwarded IP if available
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return cfIp || realIp || 'unknown'
}

/**
 * Check rate limit for a request
 * @param {Request} request - The incoming request
 * @param {string} endpoint - Endpoint identifier for grouping
 * @param {object} config - Rate limit config { maxRequests, windowMs }
 * @returns {object} { allowed: boolean, remaining: number, resetAt: number, response?: NextResponse }
 */
export function checkRateLimit(request, endpoint, config = RATE_LIMITS.GENERAL) {
  cleanup()

  const ip = getClientIdentifier(request)
  const key = `${endpoint}:${ip}`
  const now = Date.now()

  let data = requestCounts.get(key)

  // Initialize or reset if window has passed
  if (!data || now > data.resetAt) {
    data = {
      count: 0,
      resetAt: now + config.windowMs
    }
  }

  data.count++
  requestCounts.set(key, data)

  const remaining = Math.max(0, config.maxRequests - data.count)
  const allowed = data.count <= config.maxRequests

  if (!allowed) {
    const retryAfter = Math.ceil((data.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      resetAt: data.resetAt,
      response: rateLimited(retryAfter)
    }
  }

  return {
    allowed: true,
    remaining,
    resetAt: data.resetAt
  }
}

/**
 * Higher-order function to wrap API handler with rate limiting
 * @param {Function} handler - The API handler function
 * @param {string} endpoint - Endpoint identifier
 * @param {object} config - Rate limit config
 */
export function withRateLimit(handler, endpoint, config = RATE_LIMITS.GENERAL) {
  return async (request, context) => {
    const result = checkRateLimit(request, endpoint, config)

    if (!result.allowed) {
      return result.response
    }

    return handler(request, context)
  }
}

/**
 * Combine rate limiting with authentication
 * @param {Function} authWrapper - withAuth or withOptionalAuth
 * @param {Function} handler - The API handler function
 * @param {string} endpoint - Endpoint identifier
 * @param {object} config - Rate limit config
 */
export function withRateLimitAndAuth(authWrapper, handler, endpoint, config = RATE_LIMITS.GENERAL) {
  return withRateLimit(authWrapper(handler), endpoint, config)
}
