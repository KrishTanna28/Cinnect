import { NextResponse } from 'next/server'
import connectDB from '@/lib/config/database.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
import jwt from 'jsonwebtoken'
import pendingRegistrations from '@/lib/pendingRegistrations.js'
import { emitNotification } from '@/lib/socketServer.js'

export async function POST(request) {
  try {
    await connectDB()

    const body = await request.json()
    const { registrationId, otp } = body

    if (!registrationId || !otp) {
      return NextResponse.json(
        { success: false, message: 'Registration ID and OTP are required' },
        { status: 400 }
      )
    }

    // Get pending registration
    const pendingReg = pendingRegistrations.get(registrationId)

    if (!pendingReg) {
      return NextResponse.json(
        { success: false, message: 'Registration session expired or invalid' },
        { status: 400 }
      )
    }

    // Check OTP expiration
    if (new Date() > pendingReg.otpExpiresAt) {
      pendingRegistrations.delete(registrationId)
      return NextResponse.json(
        { success: false, message: 'OTP has expired. Please register again.' },
        { status: 400 }
      )
    }

    // Check OTP attempts
    if (pendingReg.otpAttempts >= 3) {
      pendingRegistrations.delete(registrationId)
      return NextResponse.json(
        { success: false, message: 'Too many failed attempts. Please register again.' },
        { status: 400 }
      )
    }

    // Verify OTP
    if (otp !== pendingReg.otp) {
      pendingReg.otpAttempts += 1
      return NextResponse.json(
        {
          success: false,
          message: `Invalid OTP. ${3 - pendingReg.otpAttempts} attempts remaining.`
        },
        { status: 400 }
      )
    }

    // OTP is valid, create user
    const userData = {
      username: pendingReg.username,
      email: pendingReg.email,
      password: pendingReg.password,
      fullName: pendingReg.fullName,
      emailVerified: true,
      isVerified: true
    }

    // Store date of birth if provided
    if (pendingReg.dateOfBirth) {
      userData.dateOfBirth = new Date(pendingReg.dateOfBirth)
    }

    // Handle avatar upload if exists
    if (pendingReg.avatar) {
      const { uploadAvatarToCloudinary } = await import('@/lib/utils/cloudinaryHelper.js')
      const avatarUrl = await uploadAvatarToCloudinary(pendingReg.avatar, pendingReg.avatarName)
      userData.avatar = avatarUrl
    }

    const newUser = new User(userData)

    // Save the new user
    await newUser.save()

    // Clean up pending registration
    pendingRegistrations.delete(registrationId)

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Remove password from response
    const userResponse = newUser.toObject()
    delete userResponse.password

    return NextResponse.json({
      success: true,
      message: 'Registration completed successfully!',
      data: {
        token,
        user: userResponse
      }
    })
  } catch (error) {
    console.error('Complete registration error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to complete registration'
      },
      { status: 500 }
    )
  }
}
