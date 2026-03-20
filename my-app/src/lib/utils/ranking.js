import mongoose from 'mongoose'
import User from '@/lib/models/User.js'
import { calculateRankingScore, getTierFromRank } from '@/lib/utils/gamification.js'

function buildScoredUsersPipeline() {
  return [
    {
      $match: {
        isActive: { $ne: false }
      }
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'user',
        as: 'reviews',
        pipeline: [
          {
            $project: {
              qualityScore: { $ifNull: ['$gamification.qualityScore', 0] },
              likesCount: { $size: { $ifNull: ['$likes', []] } },
              repliesCount: { $size: { $ifNull: ['$replies', []] } }
            }
          }
        ]
      }
    },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'user',
        as: 'posts',
        pipeline: [
          {
            $project: {
              trendingMilestonesAwarded: {
                $size: { $ifNull: ['$gamification.trendingMilestonesAwarded', []] }
              }
            }
          }
        ]
      }
    },
    {
      $addFields: {
        averageQuality: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            { $avg: '$reviews.qualityScore' },
            0
          ]
        },
        averageReviewEngagement: {
          $cond: [
            { $gt: [{ $size: '$reviews' }, 0] },
            {
              $avg: {
                $map: {
                  input: '$reviews',
                  as: 'review',
                  in: {
                    $add: [
                      { $multiply: ['$$review.likesCount', 1.2] },
                      { $multiply: ['$$review.repliesCount', 1.8] }
                    ]
                  }
                }
              }
            },
            0
          ]
        },
        trendingPostsCount: {
          $size: {
            $filter: {
              input: '$posts',
              as: 'post',
              cond: { $gt: ['$$post.trendingMilestonesAwarded', 0] }
            }
          }
        }
      }
    },
    {
      $addFields: {
        qualityScore: {
          $min: [100, { $multiply: ['$averageQuality', 100] }]
        },
        engagementScore: {
          $min: [
            100,
            {
              $add: [
                { $multiply: ['$averageReviewEngagement', 8] },
                { $multiply: ['$trendingPostsCount', 12] }
              ]
            }
          ]
        },
        consistencyScore: {
          $min: [
            100,
            {
              $add: [
                { $multiply: [{ $ifNull: ['$streaks.current', 0] }, 6] },
                { $multiply: [{ $ifNull: ['$achievements.reviewsWritten', 0] }, 1.4] }
              ]
            }
          ]
        },
        pointsTotal: { $ifNull: ['$points.total', 0] }
      }
    },
    {
      $addFields: {
        rankingScore: {
          $add: [
            { $multiply: ['$qualityScore', 0.5] },
            { $multiply: ['$engagementScore', 0.3] },
            { $multiply: ['$consistencyScore', 0.2] }
          ]
        }
      }
    }
  ]
}

function buildSortStage() {
  return {
    $sort: {
      rankingScore: -1,
      pointsTotal: -1,
      _id: 1
    }
  }
}

function buildProjectedPagePipeline({ skip = 0, limit = 20 } = {}) {
  return [
    ...buildScoredUsersPipeline(),
    buildSortStage(),
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        points: 1,
        pointsTotal: 1,
        level: 1,
        badges: 1,
        achievements: 1,
        streaks: 1,
        rankingScore: 1,
        qualityScore: 1,
        engagementScore: 1,
        consistencyScore: 1,
        trendingPostsCount: 1
      }
    }
  ]
}

function formatRankingDoc(doc, rank, totalUsers) {
  const percentile = totalUsers > 0 ? round((rank / totalUsers) * 100, 2) : null

  return {
    _id: doc._id,
    username: doc.username,
    fullName: doc.fullName,
    avatar: doc.avatar,
    points: doc.points,
    badges: doc.badges || [],
    xpLevel: doc.level || 1,
    ranking: {
      score: round(doc.rankingScore || 0, 2),
      globalRank: rank,
      percentile,
      tier: getTierFromRank(rank),
      qualityScore: round(doc.qualityScore || 0, 1),
      engagementScore: round(doc.engagementScore || 0, 1),
      consistencyScore: round(doc.consistencyScore || 0, 1)
    },
    stats: {
      reviews: doc.achievements?.reviewsWritten || 0,
      likes: doc.achievements?.totalLikes || 0,
      streak: doc.streaks?.current || 0,
      trendingPostsCount: doc.trendingPostsCount || 0
    }
  }
}

async function persistRankingSnapshots(entries) {
  if (!entries.length) return

  await User.bulkWrite(
    entries.map(entry => ({
      updateOne: {
        filter: { _id: entry._id },
        update: {
          $set: {
            ranking: {
              ...entry.ranking,
              updatedAt: new Date()
            }
          }
        }
      }
    }))
  )
}

function getDefaultRanking() {
  return {
    score: 0,
    globalRank: null,
    percentile: null,
    tier: getTierFromRank(null),
    qualityScore: 0,
    engagementScore: 0,
    consistencyScore: 0
  }
}

export async function getLeaderboardPage({ page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 50))
  const skip = (safePage - 1) * safeLimit

  const [docs, total] = await Promise.all([
    User.aggregate(buildProjectedPagePipeline({ skip, limit: safeLimit })),
    User.countDocuments({ isActive: { $ne: false } })
  ])

  const entries = docs.map((doc, index) => formatRankingDoc(doc, skip + index + 1, total))
  await persistRankingSnapshots(entries)

  return {
    users: entries,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit)
    }
  }
}

export async function getUserRankingSnapshot(userId) {
  try {
    const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId

    const docs = await User.aggregate([
      ...buildScoredUsersPipeline(),
      { $match: { _id: objectId } },
      {
        $project: {
          rankingScore: 1,
          qualityScore: 1,
          engagementScore: 1,
          consistencyScore: 1,
          pointsTotal: 1
        }
      }
    ])

    const doc = docs[0]
    if (!doc) {
      return getDefaultRanking()
    }

    const [higherRanked, totalUsers] = await Promise.all([
      User.aggregate([
        ...buildScoredUsersPipeline(),
        {
          $match: {
            $or: [
              { rankingScore: { $gt: doc.rankingScore } },
              {
                rankingScore: doc.rankingScore,
                pointsTotal: { $gt: doc.pointsTotal || 0 }
              },
              {
                rankingScore: doc.rankingScore,
                pointsTotal: doc.pointsTotal || 0,
                _id: { $lt: objectId }
              }
            ]
          }
        },
        { $count: 'count' }
      ]),
      User.countDocuments({ isActive: { $ne: false } })
    ])

    const globalRank = (higherRanked[0]?.count || 0) + 1
    const ranking = {
      score: round(doc.rankingScore || 0, 2),
      globalRank,
      percentile: totalUsers > 0 ? round((globalRank / totalUsers) * 100, 2) : null,
      tier: getTierFromRank(globalRank),
      qualityScore: round(doc.qualityScore || 0, 1),
      engagementScore: round(doc.engagementScore || 0, 1),
      consistencyScore: round(doc.consistencyScore || 0, 1)
    }

    await User.updateOne(
      { _id: objectId },
      {
        $set: {
          ranking: {
            ...ranking,
            updatedAt: new Date()
          }
        }
      }
    )

    return ranking
  } catch (error) {
    console.error('Ranking snapshot error:', error)

    const fallbackUser = await User.findById(userId).select('ranking').lean()
    return fallbackUser?.ranking || getDefaultRanking()
  }
}

export function calculateInfluenceFromRanking(ranking = {}) {
  const computed = calculateRankingScore({
    qualityScore: ranking.qualityScore || 0,
    engagementScore: ranking.engagementScore || 0,
    consistencyScore: ranking.consistencyScore || 0
  })

  return Math.round(computed.finalScore)
}

function round(value, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
