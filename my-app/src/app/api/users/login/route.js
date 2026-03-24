import User from '@/lib/models/User.js'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/utils/jwt.js'
import { applyXpEvent, getProgressionSnapshot } from '@/lib/utils/gamification.js'
import connectDB from '@/lib/config/database.js'
import { success, error, handleError } from '@/lib/utils/apiResponse.js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit.js'
import { validate, loginSchema } from '@/lib/utils/validation.js'

export async function POST(request) {
  // Apply rate limiting for login attempts (brute force protection)
  const rateLimitResult = checkRateLimit(request, 'login', RATE_LIMITS.AUTH)
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response
  }

  try {
    await connectDB()
    const body = await request.json()

    // Validate input
    const validation = validate(loginSchema, body)
    if (!validation.success) {
      return validation.response
    }

    const { email, password } = validation.data

    // Find user by email
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      // Use generic message to prevent email enumeration
      return error('Invalid email or password', 401)
    }

    // Check if user has a password (might be Google-only account)
    if (!user.password) {
      return error('Please sign in with Google', 400)
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return error('Invalid email or password', 401)
    }

    // Generate token
    const token = generateToken(user._id)

    const xpEvent = applyXpEvent(user, {
      action: 'daily_login',
      target: {}
    })

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    return success({
      token,
      user: userResponse,
      gamification: {
        xpEvent,
        progression: getProgressionSnapshot(user)
      }
    }, 'Login successful')
  } catch (err) {
    return handleError(err, 'Login')
  }
}
