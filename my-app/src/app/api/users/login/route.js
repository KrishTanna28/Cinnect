import { NextResponse } from 'next/server'
import User from '@/lib/models/User.js'
import bcrypt from 'bcryptjs'
import { generateToken } from '@/lib/utils/jwt.js'
import { applyXpEvent, getProgressionSnapshot } from '@/lib/utils/gamification.js'
import connectDB from '@/lib/config/database.js'

export async function POST(request) {
  await connectDB()
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email and password are required'
        },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      )
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email or password'
        },
        { status: 401 }
      )
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

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userResponse
      },
      gamification: {
        xpEvent,
        progression: getProgressionSnapshot(user)
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Login failed'
      },
      { status: 500 }
    )
  }
}
