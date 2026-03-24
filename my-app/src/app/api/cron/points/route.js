import connectDB from '@/lib/config/database';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import AIPointsCalculator from '@/lib/utils/aiPointsCalculator';
import { success, error, handleError } from '@/lib/utils/apiResponse.js';
import { withCronAuth } from '@/lib/middleware/withAuth.js';

// This route should be triggered by a daily cron job (e.g., Vercel Cron) at 12:00 AM
async function handler(request) {
  try {
    await connectDB();
    console.log('[Cron] Starting daily points recalculation...');

    // 1. Recalculate user credibility
    const activeUsers = await User.find({ lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    let usersProcessed = 0;

    for (const user of activeUsers) {
      try {
        const credibility = AIPointsCalculator.calculateCredibility(user);
        user.credibilityScore = credibility.score;
        await user.save();
        usersProcessed++;
      } catch (userError) {
        console.error(`[Cron] Error processing user ${user._id}:`, userError);
      }
    }

    // 2. Recompute engagement-based points and apply time decay for recent reviews
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Batch processing
    const BATCH_SIZE = 100;
    let skip = 0;
    let reviewsProcessed = 0;
    let reviews = await Review.find({ createdAt: { $gte: thirtyDaysAgo } }).populate('user').skip(skip).limit(BATCH_SIZE);

    while (reviews.length > 0) {
      for (const review of reviews) {
        if (!review.user) continue;

        try {
          const context = {
            replies: review.replies || [],
            globalAvgLikes: 10 // Replace with actual global aggregate if available
          };

          const reevaluated = await AIPointsCalculator.reevaluateReview(review, review.user, context);

          // Update review points
          review.points = reevaluated.total;
          review.pointBreakdown = reevaluated.breakdown;
          await review.save();
          reviewsProcessed++;
        } catch (reviewError) {
          console.error(`[Cron] Error processing review ${review._id}:`, reviewError);
        }
      }

      skip += BATCH_SIZE;
      reviews = await Review.find({ createdAt: { $gte: thirtyDaysAgo } }).populate('user').skip(skip).limit(BATCH_SIZE);
    }

    console.log(`[Cron] Completed: ${usersProcessed} users, ${reviewsProcessed} reviews processed.`);
    return success({ usersProcessed, reviewsProcessed }, 'Cron job completed successfully');
  } catch (err) {
    return handleError(err, 'Cron points');
  }
}

export const GET = withCronAuth(handler);
