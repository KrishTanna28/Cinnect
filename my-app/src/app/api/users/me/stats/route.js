import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'

// GET /api/users/me/stats - Get user statistics
export const GET = withAuth(async (request, { user }) => {
  try {
    // Auto-generate referral code for existing users who never got one
    if (!user.referralCode) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code, isUnique = false
      while (!isUnique) {
        code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const existing = await user.constructor.findOne({ referralCode: code })
        if (!existing) isUnique = true
      }
      user.referralCode = code
      await user.save()
    }

    const stats = {
      points: user.points,
      level: user.level,
      achievements: user.achievements,
      streaks: user.streaks,
      watchlistCount: user.watchlist.length,
      favoritesCount: user.favorites.length,
      reviewsCount: user.reviews.length,
      ratingsCount: user.ratings.length,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      badges: user.badges,
      referralCode: user.referralCode
    }

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get stats'
      },
      { status: 500 }
    )
  }
})
