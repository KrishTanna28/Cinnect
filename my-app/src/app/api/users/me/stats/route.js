import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import Review from '@/lib/models/Review.js'
import Post from '@/lib/models/Post.js'
import { getLevelCatalog, getProgressionSnapshot, getTopPercentLabel, getXpConfig } from '@/lib/utils/gamification.js'
import { calculateInfluenceFromRanking, getUserRankingSnapshot } from '@/lib/utils/ranking.js'

// GET /api/users/me/stats - Get user statistics
export const GET = withAuth(async (request, { user }) => {
  try {
    const [reviewMetrics, trendingPostsCount] = await Promise.all([
      Review.aggregate([
        { $match: { user: user._id } },
        {
          $project: {
            qualityScore: { $ifNull: ['$gamification.qualityScore', 0] },
            likesCount: { $size: { $ifNull: ['$likes', []] } },
            repliesCount: { $size: { $ifNull: ['$replies', []] } }
          }
        },
        {
          $group: {
            _id: null,
            averageQuality: { $avg: '$qualityScore' },
            highQualityReviewsCount: {
              $sum: {
                $cond: [{ $gte: ['$qualityScore', 0.8] }, 1, 0]
              }
            },
            totalLikesReceived: { $sum: '$likesCount' },
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

    const progression = getProgressionSnapshot(user)
    const averageQuality = reviewMetrics[0]?.averageQuality || 0
    const averageEngagementPerReview = reviewMetrics[0]?.averageEngagementPerReview || 0
    const ranking = await getUserRankingSnapshot(user._id)

    const stats = {
      points: user.points,
      level: user.level,
      xpLevel: user.level,
      progression,
      xp: {
        current: progression.totalXp,
        nextLevel: progression.nextLevelXp,
        progress: progression.progressPercent,
        toNextLevel: progression.xpForNextLevel
      },
      ranking,
      tier: ranking.tier,
      globalRank: ranking.globalRank,
      topPercentLabel: getTopPercentLabel(ranking.percentile),
      qualityScore: Number(averageQuality.toFixed(2)),
      influenceScore: calculateInfluenceFromRanking(ranking),
      averageReviewQuality: Number(averageQuality.toFixed(2)),
      highQualityReviewsCount: reviewMetrics[0]?.highQualityReviewsCount || 0,
      totalLikesReceived: reviewMetrics[0]?.totalLikesReceived || 0,
      trendingPostsCount,
      averageEngagementPerReview: Number(averageEngagementPerReview.toFixed(1)),
      levelCatalog: getLevelCatalog(),
      xpConfig: getXpConfig(),
      achievements: user.achievements,
      streaks: user.streaks,
      watchlistCount: user.watchlist.length,
      favoritesCount: user.favorites.length,
      reviewsCount: user.reviews.length,
      ratingsCount: user.ratings.length,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      badges: user.badges
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
