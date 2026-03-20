import { NextResponse } from 'next/server'
import connectDB from '@/lib/config/database.js'
import User from '@/lib/models/User.js'
import { sendOTPEmail } from '@/lib/utils/emailService.js'
import pendingRegistrations from '@/lib/pendingRegistrations.js'

export async function POST(request) {
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

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      let message = 'User already exists'
      if (existingUser.email === email) message = 'Email already registered'
      else if (existingUser.username === username) message = 'Username already taken'
      
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      )
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
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to send OTP email. Please check your email address.'
          },
          { status: 500 }
        )
      }
    } catch (emailError) {
      pendingRegistrations.delete(registrationId)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send OTP. Please try again.'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox and verify to complete registration.',
      data: {
        registrationId,
        email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        otpExpiresIn: '10 minutes'
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Registration failed'
      },
      { status: 500 }
    )
  }
}
