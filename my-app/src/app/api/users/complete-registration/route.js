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

    // Handle avatar upload if exists
    if (pendingReg.avatar) {
      const { uploadAvatarToCloudinary } = await import('@/lib/utils/cloudinaryHelper.js')
      const avatarUrl = await uploadAvatarToCloudinary(pendingReg.avatar, pendingReg.avatarName)
      userData.avatar = avatarUrl
    }

    const newUser = new User(userData)

    // Process referral if provided — must happen before save so points are included
    let referralResult = null
    const trimmedReferralCode = (pendingReg.referralCode || '').trim()
    if (trimmedReferralCode) {
      console.log(`[REFERRAL] Processing referral code: "${trimmedReferralCode}"`)
      referralResult = await newUser.processReferral(trimmedReferralCode)
      console.log(`[REFERRAL] processReferral result:`, JSON.stringify(referralResult))
    }

    // Save the new user (single save — processReferral no longer calls this.save() internally)
    await newUser.save()
    console.log(`[REFERRAL] New user saved. _id=${newUser._id}, username=${newUser.username}`)

    // Create referral notifications now that both users exist in the DB
    if (referralResult && referralResult.success) {
      const referralPoints = referralResult.pointsAwarded
      const referrerIdStr = String(referralResult.referrerId)
      const newUserIdStr = String(newUser._id)
      console.log(`[REFERRAL] Referral was successful. Creating notifications. referrerId=${referrerIdStr}, newUserId=${newUserIdStr}`)

      // Notification for the new user who joined via referral
      try {
        const newUserNotif = await Notification.create({
          recipient: newUser._id,
          type: 'referral',
          title: 'Referral Bonus Unlocked!',
          message: `You joined using ${referralResult.referrerName}'s referral code and earned ${referralPoints} bonus points. Welcome to Cinnect!`,
          image: referralResult.referrerAvatar || '',
          link: `/profile/${referrerIdStr}`,
          read: false
        })
        emitNotification(newUser._id, newUserNotif.toObject())
        console.log(`[REFERRAL] ✅ New user notification created: ${newUserNotif._id}`)
      } catch (notifErr) {
        console.error('[REFERRAL] ❌ Failed to create new user notification:', notifErr.message, notifErr.stack)
      }

      // Notification for the referrer who invited them
      try {
        const referrerNotif = await Notification.create({
          recipient: referralResult.referrerId,
          type: 'referral',
          title: 'Referral Reward Earned!',
          message: `${newUser.username} joined Cinnect using your referral code. You earned ${referralPoints} bonus points!`,
          image: newUser.avatar || '',
          link: `/profile/${newUserIdStr}`,
          read: false
        })
        emitNotification(referralResult.referrerId, referrerNotif.toObject())
        console.log(`[REFERRAL] ✅ Referrer notification created: ${referrerNotif._id}`)
      } catch (notifErr) {
        console.error('[REFERRAL] ❌ Failed to create referrer notification:', notifErr.message, notifErr.stack)
      }
    } else if (trimmedReferralCode) {
      console.log(`[REFERRAL] Referral processing was not successful or returned null. Result:`, referralResult)
    }

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
        user: userResponse,
        ...(referralResult?.success && { referralReward: referralResult }),
        _debug_referralCode: trimmedReferralCode || null,
        _debug_referralSuccess: referralResult?.success || false,
        _debug_referralMessage: referralResult?.message || null
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
