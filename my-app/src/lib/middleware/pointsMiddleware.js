import PointsCalculator from '../utils/pointsCalculator.js';
import User from '../models/User.js';
import Review from '../models/Review.js';

/**
 * Middleware to calculate and award points for reviews
 */
export const awardReviewPoints = async (req, res, next) => {
  try {
    const review = res.locals.review; // Review should be set by controller
    const user = await User.findById(req.user._id);

    if (!review || !user) {
      return next();
    }

    // Get context for points calculation
    const context = await getReviewContext(review);

    // Calculate points
    const pointsData = await PointsCalculator.calculateReviewPoints(review, user, context);
    
    // Mark for cron processing (heavy operations)
    review.needsProcessing = true;
    await review.save();

    // Apply multiplier
    const finalPoints = Math.round(pointsData.total * pointsData.multiplier);

    // Award points to user
    user.points.total += finalPoints;
    user.points.available += finalPoints;

    // Update user stats
    await updateUserStats(user, review);

    // Check for level up
    const newLevel = PointsCalculator.getLevelFromPoints(user.points.total);
    if (newLevel.level > user.level) {
      user.level = newLevel.level;
      // Could trigger level-up notification here
    }

    // Check for new badges
    const newBadges = PointsCalculator.calculateBadges(user);
    // Add only new badges
    for (const badge of newBadges) {
      if (!user.badges.find(b => b.name === badge.name)) {
        user.badges.push({
          name: badge.name,
          icon: badge.icon,
          earnedAt: new Date()
        });
      }
    }

    await user.save();

    // Attach points info to response
    res.locals.pointsAwarded = {
      points: finalPoints,
      breakdown: pointsData.breakdown,
      multiplier: pointsData.multiplier,
      newLevel: newLevel,
      totalPoints: user.points.total
    };

    next();
  } catch (error) {
    console.error('Points middleware error:', error);
    // Don't fail the request if points calculation fails
    next();
  }
};

/**
 * Middleware to award points for replies
 */
export const awardReplyPoints = async (req, res, next) => {
  try {
    const reply = res.locals.reply;
    const review = res.locals.review;
    const user = await User.findById(req.user._id);

    if (!reply || !review || !user) {
      return next();
    }

    // Calculate reply points
    const pointsData = PointsCalculator.calculateReplyPoints(reply, review);
    
    // Award points
    user.points.total += pointsData.total;
    user.points.available += pointsData.total;
    user.achievements.commentsPosted += 1;

    await user.save();

    res.locals.pointsAwarded = {
      points: pointsData.total,
      breakdown: pointsData.details
    };

    next();
  } catch (error) {
    console.error('Reply points middleware error:', error);
    next();
  }
};

/**
 * Get context for review (ranking, etc.)
 */
async function getReviewContext(review) {
  const context = {};

  // Get review rank (how early was this review)
  const earlierReviews = await Review.countDocuments({
    mediaId: review.mediaId,
    mediaType: review.mediaType,
    createdAt: { $lt: review.createdAt }
  });
  
  context.reviewRank = earlierReviews + 1;

  return context;
}

/**
 * Update user statistics
 */
async function updateUserStats(user, review) {
  // Update reviewed genres
  if (review.genres && review.genres.length > 0) {
    for (const genre of review.genres) {
      if (!user.reviewedGenres.includes(genre)) {
        user.reviewedGenres.push(genre);
      }
    }
  }

  // Update reviewed formats
  if (!user.reviewedFormats.includes(review.mediaType)) {
    user.reviewedFormats.push(review.mediaType);
  }

  // Update average review length
  const totalReviews = user.achievements.reviewsWritten + 1;
  const currentAvg = user.averageReviewLength || 0;
  user.averageReviewLength = Math.round(
    (currentAvg * (totalReviews - 1) + review.content.length) / totalReviews
  );

  // Update helpfulness ratio
  const userReviews = await Review.find({ user: user._id });
  let totalLikes = 0;
  let totalVotes = 0;
  
  for (const r of userReviews) {
    totalLikes += r.likeCount || 0;
    totalVotes += (r.likeCount || 0) + (r.dislikeCount || 0);
  }
  
  user.helpfulnessRatio = totalVotes > 0 ? totalLikes / totalVotes : 0;
  user.achievements.totalLikes = totalLikes;

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivity = user.streaks.lastActivityDate;
  if (lastActivity) {
    const lastDate = new Date(lastActivity);
    lastDate.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      user.streaks.current += 1;
      if (user.streaks.current > user.streaks.longest) {
        user.streaks.longest = user.streaks.current;
      }
    } else if (daysDiff > 1) {
      // Streak broken
      user.streaks.current = 1;
    }
    // If daysDiff === 0, same day, don't increment
  } else {
    // First activity
    user.streaks.current = 1;
    user.streaks.longest = 1;
  }
  
  user.streaks.lastActivityDate = new Date();
}

// Named exports `awardReviewPoints` and `awardReplyPoints` are provided above
