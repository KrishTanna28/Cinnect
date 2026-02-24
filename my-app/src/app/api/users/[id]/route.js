import { NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import Review from '@/lib/models/Review.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

// GET /api/users/[id] - Get public user profile by ID
export const GET = withOptionalAuth(async (request, { params, user: currentUser }) => {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 })
    }

    // Find user and exclude sensitive information
    const user = await User.findById(id)
      .select('-password -email -googleId -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire')
      .lean()

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 })
    }

    // Calculate follow relationships
    const isOwnProfile = currentUser && currentUser._id.toString() === user._id.toString()
    const isFollowing = currentUser
      ? currentUser.following.some(fId => fId.toString() === user._id.toString())
      : false
    const isFollowedBy = currentUser
      ? user.following?.some(fId => fId.toString() === currentUser._id.toString())
      : false
    const hasRequestedFollow = currentUser && user.followRequests
      ? user.followRequests.some(req => req.from.toString() === currentUser._id.toString())
      : false

    // Determine follow status
    let followStatus = 'none' // none | following | requested
    if (isFollowing) followStatus = 'following'
    else if (hasRequestedFollow) followStatus = 'requested'

    // Social counts (always visible like Instagram)
    const followersCount = user.followers?.length || 0
    const followingCount = user.following?.length || 0

    // Calculate member duration
    const memberSince = user.createdAt
    const now = new Date()
    const diffTime = Math.abs(now - new Date(memberSince))
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Basic profile data (always visible)
    const publicProfile = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      memberSince: user.createdAt,
      memberDays: diffDays,
      isPrivate: user.isPrivate || false,
      followStatus,
      isOwnProfile,
      isFollowedBy,
      followersCount,
      followingCount,
      level: user.level || 1,
      points: user.points || 0,
    }

    // Check if this profile's detailed content should be visible
    const canViewFullProfile = isOwnProfile || !user.isPrivate || isFollowing

    if (!canViewFullProfile) {
      // Private profile - return limited info
      return NextResponse.json({
        success: true,
        data: {
          ...publicProfile,
          isProfileLocked: true,
          stats: {
            totalReviews: 0,
            averageRating: '0.0',
            totalLikes: 0
          },
          recentReviews: [],
          achievements: [],
          streak: { current: 0, longest: 0 },
          favoriteGenres: [],
          watchlistCount: 0,
          favoritesCount: 0
        }
      })
    }

    // Full profile - get all data
    const reviewStats = await Review.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          totalLikes: { $sum: { $size: { $ifNull: ['$likes', []] } } }
        }
      }
    ])

    const recentReviews = await Review.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('mediaId mediaType mediaTitle rating content createdAt mediaPoster')
      .lean()

    const formattedReviews = recentReviews.map(review => ({
      _id: review._id,
      movieId: review.mediaId,
      mediaType: review.mediaType,
      title: review.mediaTitle,
      rating: review.rating,
      review: review.content,
      createdAt: review.createdAt,
      poster: review.mediaPoster
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...publicProfile,
        isProfileLocked: false,
        achievements: user.achievements || [],
        streak: user.streaks || { current: 0, longest: 0 },
        stats: {
          totalReviews: reviewStats[0]?.totalReviews || 0,
          averageRating: reviewStats[0]?.averageRating?.toFixed(1) || '0.0',
          totalLikes: reviewStats[0]?.totalLikes || 0
        },
        recentReviews: formattedReviews,
        favoriteGenres: user.preferences?.favoriteGenres || [],
        watchlistCount: user.watchlist?.length || 0,
        favoritesCount: user.favorites?.length || 0
      }
    })
  } catch (error) {
    console.error('Get public profile error:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to get user profile'
    }, { status: 500 })
  }
})
