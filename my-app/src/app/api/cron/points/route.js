import connectDB from '@/lib/config/database';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import {
  calculateReviewQuality,
  ensureProgressionState,
  evaluateBadgeUnlocks,
  getLevelFromXp
} from '@/lib/utils/gamification.js';
import { refreshAllRankingSnapshots } from '@/lib/utils/ranking.js';
import { success, handleError } from '@/lib/utils/apiResponse.js';
import { withCronAuth } from '@/lib/middleware/withAuth.js';

const REVIEW_BATCH_SIZE = 200;
const USER_BATCH_SIZE = 100;

async function syncReviewQuality() {
  let processed = 0;
  let updated = 0;
  let lastId = null;

  while (true) {
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const reviews = await Review.find(query)
      .sort({ _id: 1 })
      .limit(REVIEW_BATCH_SIZE)
      .select('_id title content rating flagCount isFlagged moderation gamification');

    if (!reviews.length) break;

    const updates = [];

    for (const review of reviews) {
      processed += 1;

      const quality = calculateReviewQuality(review);
      const currentScore = review?.gamification?.qualityScore ?? null;
      const currentDetails = review?.gamification?.qualityDetails || {};
      const currentMilestone = review?.gamification?.awardedLikeMilestone || 0;
      const detailsChanged = JSON.stringify(currentDetails) !== JSON.stringify(quality.details);

      if (currentScore !== quality.score || detailsChanged || review?.gamification?.awardedLikeMilestone === undefined) {
        updates.push({
          updateOne: {
            filter: { _id: review._id },
            update: {
              $set: {
                'gamification.qualityScore': quality.score,
                'gamification.qualityDetails': quality.details,
                'gamification.awardedLikeMilestone': currentMilestone
              }
            }
          }
        });
        updated += 1;
      }
    }

    if (updates.length > 0) {
      await Review.bulkWrite(updates);
    }

    lastId = reviews[reviews.length - 1]._id;
  }

  return { processed, updated };
}

async function syncUserGamificationState() {
  let processed = 0;
  let updated = 0;
  let lastId = null;

  while (true) {
    const query = lastId ? { _id: { $gt: lastId } } : {};
    const users = await User.find(query)
      .sort({ _id: 1 })
      .limit(USER_BATCH_SIZE)
      .select('_id points level progression badges achievements streaks averageReviewLength helpfulnessRatio reviewedFormats reviewedGenres');

    if (!users.length) break;

    const userIds = users.map(user => user._id);
    const reviewStats = await Review.aggregate([
      {
        $match: {
          user: { $in: userIds },
          isRemoved: { $ne: true }
        }
      },
      {
        $project: {
          user: 1,
          mediaType: 1,
          contentLength: { $strLenCP: { $ifNull: ['$content', ''] } },
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          dislikesCount: { $size: { $ifNull: ['$dislikes', []] } },
          repliesCount: { $size: { $ifNull: ['$replies', []] } }
        }
      },
      {
        $group: {
          _id: '$user',
          reviewsWritten: { $sum: 1 },
          ratingsGiven: { $sum: 1 },
          totalLikes: { $sum: '$likesCount' },
          totalDislikes: { $sum: '$dislikesCount' },
          totalReplies: { $sum: '$repliesCount' },
          averageReviewLength: { $avg: '$contentLength' },
          reviewedFormats: { $addToSet: '$mediaType' }
        }
      }
    ]);

    const statsByUserId = new Map(reviewStats.map(stats => [String(stats._id), stats]));

    for (const user of users) {
      processed += 1;

      const stats = statsByUserId.get(String(user._id));
      const reviewsWritten = stats?.reviewsWritten || 0;
      const ratingsGiven = stats?.ratingsGiven || 0;
      const totalLikes = stats?.totalLikes || 0;
      const totalDislikes = stats?.totalDislikes || 0;
      const totalReplies = stats?.totalReplies || 0;
      const averageReviewLength = Math.round(stats?.averageReviewLength || 0);
      const helpfulnessRatio = totalLikes + totalDislikes > 0
        ? Number((totalLikes / (totalLikes + totalDislikes)).toFixed(2))
        : 0;
      const reviewedFormats = [...(stats?.reviewedFormats || [])].sort();

      ensureProgressionState(user);

      const nextLevel = getLevelFromXp(user.points?.total || 0).level;
      const currentReviewedFormats = [...(user.reviewedFormats || [])].sort();
      const nextAchievements = {
        ...(user.achievements?.toObject?.() || user.achievements || {}),
        reviewsWritten,
        ratingsGiven,
        totalLikes,
        totalReplies
      };

      user.achievements = nextAchievements;
      user.averageReviewLength = averageReviewLength;
      user.helpfulnessRatio = helpfulnessRatio;
      user.reviewedFormats = reviewedFormats;
      user.level = nextLevel;

      const unlockedBadges = evaluateBadgeUnlocks(user, {});

      if (unlockedBadges.length > 0) {
        user.markModified('badges');
        user.markModified('progression');
      }

      const didChange =
        user.isModified('progression') ||
        user.isModified('level') ||
        user.isModified('achievements') ||
        user.isModified('averageReviewLength') ||
        user.isModified('helpfulnessRatio') ||
        user.isModified('reviewedFormats') ||
        currentReviewedFormats.join('|') !== reviewedFormats.join('|');

      if (didChange) {
        await user.save();
        updated += 1;
      }
    }

    lastId = users[users.length - 1]._id;
  }

  return { processed, updated };
}

// This route should be triggered by a daily cron job (e.g., Vercel Cron) at 12:00 AM
async function handler(request) {
  try {
    await connectDB();
    console.log('[Cron] Starting gamification maintenance sync...');

    const [reviews, users] = await Promise.all([
      syncReviewQuality(),
      syncUserGamificationState()
    ]);
    const ranking = await refreshAllRankingSnapshots();

    console.log(
      `[Cron] Completed maintenance sync: ${reviews.updated}/${reviews.processed} reviews updated, ` +
      `${users.updated}/${users.processed} users updated, ${ranking.processedUsers} rankings refreshed.`
    );

    return success(
      {
        reviews,
        users,
        ranking
      },
      'Gamification maintenance completed successfully'
    );
  } catch (err) {
    return handleError(err, 'Cron points');
  }
}

export const GET = withCronAuth(handler);
