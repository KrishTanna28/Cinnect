import { NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/middleware/withAuth.js'
import User from '@/lib/models/User.js'
import Review from '@/lib/models/Review.js'
import Post from '@/lib/models/Post.js'
import connectDB from '@/lib/config/database.js'
import { getProgressionSnapshot, getTopPercentLabel } from '@/lib/utils/gamification.js'
import { calculateInfluenceFromRanking, getUserRankingSnapshot } from '@/lib/utils/ranking.js'

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

    // Check if the user blocked the current user
    if (currentUser && user.blockedUsers?.some(bId => bId.toString() === currentUser._id.toString())) {
      return NextResponse.json({
        success: false,
        message: 'Account not available'
      }, { status: 403 })
    }

    // Check if current user blocked this user
    if (currentUser && currentUser.blockedUsers?.some(bId => bId.toString() === user._id.toString())) {
      return NextResponse.json({
        success: false,
        message: 'Account not available'
      }, { status: 403 })
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

    // Check if this profile's detailed content should be visible
    const canViewFullProfile = isOwnProfile || !user.isPrivate || isFollowing

    // Mutual followers computation
    let mutualFollowersPreview = []
    let totalMutuals = 0

    if (currentUser && !isOwnProfile) {
      const myFollowingStr = currentUser.following?.map(id => id.toString()) || []
      const theirFollowersStr = user.followers?.map(id => id.toString()) || []
      
      const mutualIds = theirFollowersStr.filter(id => myFollowingStr.includes(id))
      totalMutuals = mutualIds.length
      
      if (totalMutuals > 0) {
        mutualFollowersPreview = await User.find({ _id: { $in: mutualIds.slice(0, 3) } })
          .select('_id username avatar')
          .lean()
      }
    }

    // Basic profile data (always visible)
    const progression = getProgressionSnapshot(user)

    const ranking = await getUserRankingSnapshot(user._id)

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
      mutuals: {
        preview: mutualFollowersPreview,
        total: totalMutuals,
      },
      level: user.level || 1,
      xpLevel: user.level || 1,
      points: user.points || 0,
      badges: user.badges || [],
      progression,
      ranking,
      tier: ranking.tier,
      globalRank: ranking.globalRank,
      topPercentLabel: getTopPercentLabel(ranking.percentile),
      xp: {
        current: progression.totalXp,
        nextLevel: progression.nextLevelXp,
        progress: progression.progressPercent,
        toNextLevel: progression.xpForNextLevel
      }
    }

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
    const [reviewStats, trendingPostsCount] = await Promise.all([
      Review.aggregate([
        { $match: { user: user._id } },
        {
          $project: {
            rating: 1,
            qualityScore: { $ifNull: ['$gamification.qualityScore', 0] },
            likesCount: { $size: { $ifNull: ['$likes', []] } },
            repliesCount: { $size: { $ifNull: ['$replies', []] } }
          }
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$rating' },
            totalLikes: { $sum: '$likesCount' },
            averageQuality: { $avg: '$qualityScore' },
            highQualityReviewsCount: {
              $sum: {
                $cond: [{ $gte: ['$qualityScore', 0.8] }, 1, 0]
              }
            },
            averageEngagementPerReview: {
              $avg: { $add: ['$likesCount', '$repliesCount'] }
            }
          }
        }
      ]),
      Post.countDocuments({
        user: user._id,
        'gamification.trendingMilestonesAwarded.0': { $exists: true }
      })
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

    const averageQuality = reviewStats[0]?.averageQuality || 0
    const averageEngagementPerReview = reviewStats[0]?.averageEngagementPerReview || 0

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
        qualityScore: Number(averageQuality.toFixed(2)),
        influenceScore: calculateInfluenceFromRanking(ranking),
        averageReviewQuality: Number(averageQuality.toFixed(2)),
        highQualityReviewsCount: reviewStats[0]?.highQualityReviewsCount || 0,
        trendingPostsCount,
        averageEngagementPerReview: Number(averageEngagementPerReview.toFixed(1)),
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
