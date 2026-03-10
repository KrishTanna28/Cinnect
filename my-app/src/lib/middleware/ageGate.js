import jwt from 'jsonwebtoken'
import User from '@/lib/models/User.js'
import { isUserAdult } from '@/lib/services/moderation.service.js'

/**
 * Extract user from request Authorization header (non-blocking, returns null if no auth).
 * Useful for public endpoints that need optional age-gating.
 * @param {Request} request
 * @returns {Promise<object|null>} user document or null
 */
export async function getUserFromRequest(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')
    return user || null
  } catch {
    return null
  }
}

/**
 * Check if the requesting user should see adult content.
 * Returns true if user is 18+ or not logged in (guest — adult content will be blurred in UI).
 * Returns false if user is logged in and under 18.
 * @param {Request} request
 * @returns {Promise<{shouldFilterAdult: boolean, user: object|null}>}
 */
export async function checkAdultContentAccess(request) {
  const user = await getUserFromRequest(request)
  
  if (!user) {
    // Guest user — show content but it will be blurred in UI
    return { shouldFilterAdult: false, user: null }
  }

  if (!user.dateOfBirth) {
    // No DOB set — show content but blurred in UI
    return { shouldFilterAdult: false, user }
  }

  // If user is under 18, filter out adult content entirely
  const isAdult = isUserAdult(user.dateOfBirth)
  return { shouldFilterAdult: !isAdult, user }
}

/**
 * Build a MongoDB query filter that excludes adult content for underage users.
 * @param {boolean} shouldFilterAdult - Whether to filter adult content
 * @returns {object} MongoDB query condition to merge with existing queries
 */
export function getAdultContentFilter(shouldFilterAdult) {
  if (shouldFilterAdult) {
    return { adult_content: { $ne: true } }
  }
  return {}
}
