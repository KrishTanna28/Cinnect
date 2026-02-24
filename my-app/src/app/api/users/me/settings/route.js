import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// GET /api/users/me/settings - Get current user settings
export const GET = withAuth(async (request, { user }) => {
  try {
    return NextResponse.json({
      success: true,
      data: {
        isPrivate: user.isPrivate || false,
        notifications: user.preferences?.notifications || {
          email: true,
          push: true,
          watchPartyInvites: true,
          newReviews: true
        },
        theme: user.preferences?.theme || 'dark',
        language: user.preferences?.language || 'en'
      }
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get settings' },
      { status: 500 }
    )
  }
})

// PUT /api/users/me/settings - Update current user settings
export const PUT = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const { isPrivate, notifications, theme, language } = body

    // Update privacy
    if (typeof isPrivate === 'boolean') {
      user.isPrivate = isPrivate

      // If switching from private to public, approve all pending follow requests
      if (!isPrivate && user.followRequests && user.followRequests.length > 0) {
        const User = (await import('@/lib/models/User.js')).default
        
        for (const req of user.followRequests) {
          // Add requester to followers
          if (!user.followers.some(id => id.toString() === req.from.toString())) {
            user.followers.push(req.from)
          }
          // Add user to requester's following
          await User.findByIdAndUpdate(req.from, {
            $addToSet: { following: user._id }
          })
        }
        user.followRequests = []
      }
    }

    // Update notifications
    if (notifications) {
      if (!user.preferences) user.preferences = {}
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications
      }
    }

    // Update theme
    if (theme && ['dark', 'light'].includes(theme)) {
      if (!user.preferences) user.preferences = {}
      user.preferences.theme = theme
    }

    // Update language
    if (language) {
      if (!user.preferences) user.preferences = {}
      user.preferences.language = language
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        isPrivate: user.isPrivate,
        notifications: user.preferences?.notifications,
        theme: user.preferences?.theme,
        language: user.preferences?.language
      }
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update settings' },
      { status: 500 }
    )
  }
})
