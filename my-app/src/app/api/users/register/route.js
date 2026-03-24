import connectDB from '@/lib/config/database.js'
import User from '@/lib/models/User.js'
import { sendOTPEmail } from '@/lib/utils/emailService.js'
import pendingRegistrations from '@/lib/pendingRegistrations.js'
import { success, error, handleError } from '@/lib/utils/apiResponse.js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/utils/rateLimit.js'

export async function POST(request) {
  // Apply rate limiting for registration (prevent abuse)
  const rateLimitResult = checkRateLimit(request, 'register', RATE_LIMITS.AUTH)
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response
  }

  try {
    await connectDB()

    const contentType = request.headers.get('content-type') || ''
    let username, email, password, fullName, avatarFile, dateOfBirth

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      username = formData.get('username')
      email = formData.get('email')
      password = formData.get('password')
      fullName = formData.get('fullName')
      avatarFile = formData.get('avatar')
      dateOfBirth = formData.get('dateOfBirth')
    } else {
      // JSON body (standard signup form)
      const body = await request.json()
      username = body.username
      email = body.email
      password = body.password
      fullName = body.fullName
      avatarFile = null
      dateOfBirth = body.dateOfBirth
    }

    // Validate required fields
    if (!email || !password || !fullName || !username) {
      return error('Please fill in all required fields', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return error('Please enter a valid email address', 400)
    }

    // Validate password strength
    if (password.length < 8) {
      return error('Password must be at least 8 characters', 400)
    }

    // Validate username
    if (username.length < 3 || username.length > 30) {
      return error('Username must be between 3 and 30 characters', 400)
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return error('An account with this email already exists', 400)
      }
      if (existingUser.username === username) {
        return error('This username is already taken', 400)
      }
    }

    // Generate OTP (6-digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store registration data temporarily
    const registrationId = `${email}_${Date.now()}`

    // Convert file to buffer if exists
    let avatarBuffer = null
    let avatarName = null
    if (avatarFile) {
      avatarBuffer = Buffer.from(await avatarFile.arrayBuffer())
      avatarName = avatarFile.name
    }

    pendingRegistrations.set(registrationId, {
      username,
      email,
      password,
      fullName,
      dateOfBirth,
      avatar: avatarBuffer,
      avatarName,
      otp,
      otpExpiresAt,
      otpAttempts: 0,
      createdAt: new Date()
    })

    // Auto-delete after 15 minutes
    setTimeout(() => {
      pendingRegistrations.delete(registrationId)
    }, 15 * 60 * 1000)

    // Send OTP via Email
    try {
      const emailSent = await sendOTPEmail(email, otp, fullName)
      if (!emailSent) {
        pendingRegistrations.delete(registrationId)
        return error('Failed to send verification email. Please try again.', 500)
      }
    } catch (emailError) {
      console.error('Email send error:', emailError)
      pendingRegistrations.delete(registrationId)
      return error('Failed to send verification email. Please try again.', 500)
    }

    return success({
      registrationId,
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
      otpExpiresIn: '10 minutes'
    }, 'Verification code sent to your email. Please check your inbox.')
  } catch (err) {
    return handleError(err, 'Register')
  }
}
