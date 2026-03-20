import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import AIPointsCalculator from '@/lib/utils/aiPointsCalculator';

// This route should be triggered by a daily cron job (e.g., Vercel Cron) at 12:00 AM
export async function GET(request) {
  // Add authentication/authorization for the cron job (e.g. via CRON_SECRET)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    console.log('Starting daily points recalculation cron job...');

    // 1. Recalculate user credibility
    const activeUsers = await User.find({ lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    for (const user of activeUsers) {
      const credibility = AIPointsCalculator.calculateCredibility(user);
      user.credibilityScore = credibility.score;
      await user.save();
    }

    // 2. Recompute engagement-based points and apply time decay for recent reviews
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Batch processing
    const BATCH_SIZE = 100;
    let skip = 0;
    let reviews = await Review.find({ createdAt: { $gte: thirtyDaysAgo } }).populate('user').skip(skip).limit(BATCH_SIZE);

    while (reviews.length > 0) {
      for (const review of reviews) {
        if (!review.user) continue;

        const context = {
          replies: review.replies || [],
          globalAvgLikes: 10 // Replace with actual global aggregate if available
        };

        const reevaluated = await AIPointsCalculator.reevaluateReview(review, review.user, context);
        
        // Update review points
        review.points = reevaluated.total;
        review.pointBreakdown = reevaluated.breakdown;
        await review.save();
      }
      
      skip += BATCH_SIZE;
      reviews = await Review.find({ createdAt: { $gte: thirtyDaysAgo } }).populate('user').skip(skip).limit(BATCH_SIZE);
    }

    console.log('Daily points recalculation completed successfully.');
    return NextResponse.json({ success: true, message: 'Cron job completed successfully' });
  } catch (error) {
    console.error('Error running daily cron job:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
