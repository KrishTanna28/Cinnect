/**
 * Advanced Points Calculation System
 * Calculates points based on multiple factors for gamification
 */

// Points Calculator - Functional Module
  
  /**
   * Calculate points for a new review
   */
export function calculateReviewPoints(review, user, context = {}) {
    let points = 0;
    const breakdown = {};

    // 1. Review Quality Points
    const qualityPoints = calculateQualityPoints(review);
    points += qualityPoints.total;
    breakdown.quality = qualityPoints;

    // 2. Community Engagement Points
    const engagementPoints = calculateEngagementPoints(review);
    points += engagementPoints.total;
    breakdown.engagement = engagementPoints;

    // 3. Timing & Freshness Points
    const timingPoints = calculateTimingPoints(review, context);
    points += timingPoints.total;
    breakdown.timing = timingPoints;

    // 4. Content Diversity Points
    const diversityPoints = calculateDiversityPoints(user, review);
    points += diversityPoints.total;
    breakdown.diversity = diversityPoints;

    // 5. Penalties
    const penalties = calculatePenalties(review, user);
    points += penalties.total; // Will be negative
    breakdown.penalties = penalties;

    return {
      total: Math.max(0, points), // Never negative
      breakdown,
      multiplier: calculateMultiplier(user)
    };
  }

  /**
   * Calculate quality-based points
   */
export function calculateQualityPoints(review) {
    let points = 0;
    const details = {};

    // Length & Depth
    const contentLength = review.content.length;
    if (contentLength < 100) {
      points += 5;
      details.length = { points: 5, tier: 'short' };
    } else if (contentLength < 300) {
      points += 15;
      details.length = { points: 15, tier: 'medium' };
    } else if (contentLength < 500) {
      points += 30;
      details.length = { points: 30, tier: 'detailed' };
    } else {
      points += 50;
      details.length = { points: 50, tier: 'in-depth' };
    }

    // Title quality (has meaningful title)
    if (review.title && review.title.length > 10) {
      points += 5;
      details.title = 5;
    }

    // Note: Spoiler tag is not rewarded (it's expected behavior)
    // Only penalized if spoilers exist without tag (handled by moderation bot)

    // Rating authenticity (not always 10/10 or 1/10)
    if (review.rating > 2 && review.rating < 10) {
      points += 8;
      details.authenticRating = 8;
    }

    return { total: points, details };
  }

  /**
   * Calculate engagement-based points
   */
export function calculateEngagementPoints(review) {
    let points = 0;
    const details = {};

    // Helpfulness score
    const likes = review.likeCount || 0;
    const dislikes = review.dislikeCount || 0;
    const helpfulnessScore = Math.min(100, (likes - dislikes) * 2);
    points += Math.max(0, helpfulnessScore);
    details.helpfulness = helpfulnessScore;

    // Discussion starter
    const replyCount = review.replyCount || 0;
    if (replyCount >= 11) {
      points += 30;
      details.discussionStarter = 30;
    } else if (replyCount >= 6) {
      points += 20;
      details.discussionStarter = 20;
    } else if (replyCount >= 1) {
      points += 10;
      details.discussionStarter = 10;
    }

    return { total: points, details };
  }

  /**
   * Calculate timing-based points
   */
export function calculateTimingPoints(review, context) {
    let points = 0;
    const details = {};

    // Early reviewer bonus
    if (context.reviewRank) {
      if (context.reviewRank <= 10) {
        points += 25;
        details.earlyReviewer = { rank: context.reviewRank, points: 25 };
      } else if (context.reviewRank <= 50) {
        points += 15;
        details.earlyReviewer = { rank: context.reviewRank, points: 15 };
      } else if (context.reviewRank <= 100) {
        points += 10;
        details.earlyReviewer = { rank: context.reviewRank, points: 10 };
      }
    }

    // Review age bonus (for older reviews that stayed relevant)
    const reviewAge = Date.now() - new Date(review.createdAt).getTime();
    const daysOld = reviewAge / (1000 * 60 * 60 * 24);
    const likes = review.likeCount || 0;

    if (daysOld >= 90 && likes >= 20) {
      points += 50;
      details.ageBonus = { days: Math.floor(daysOld), points: 50 };
    } else if (daysOld >= 30 && likes >= 10) {
      points += 20;
      details.ageBonus = { days: Math.floor(daysOld), points: 20 };
    }

    return { total: points, details };
  }

  /**
   * Calculate diversity-based points
   */
export function calculateDiversityPoints(user, review) {
    let points = 0;
    const details = {};

    // Genre diversity (requires user's review history)
    const uniqueGenres = user.reviewedGenres?.length || 0;
    if (uniqueGenres >= 20) {
      points += 150;
      details.genreExplorer = { genres: uniqueGenres, points: 150 };
    } else if (uniqueGenres >= 10) {
      points += 75;
      details.genreExplorer = { genres: uniqueGenres, points: 75 };
    } else if (uniqueGenres >= 5) {
      points += 30;
      details.genreExplorer = { genres: uniqueGenres, points: 30 };
    }

    // Format variety (movies + TV shows)
    const hasMovies = user.reviewedFormats?.includes('movie');
    const hasTVShows = user.reviewedFormats?.includes('tv');
    if (hasMovies && hasTVShows) {
      points += 25;
      details.formatVariety = 25;
    }

    return { total: points, details };
  }

  /**
   * Calculate reply points
   */
export function calculateReplyPoints(reply, review) {
    let points = 0;
    const details = {};

    // Reply length
    const replyLength = reply.content.length;
    if (replyLength > 50) {
      points += 8;
      details.thoughtfulReply = 8;
    } else {
      points += 3;
      details.quickReply = 3;
    }

    // @mention engagement
    if (reply.content.includes('@')) {
      points += 2;
      details.mentionBonus = 2;
    }

    // Reply helpfulness
    const likes = reply.likes?.length || 0;
    points += likes * 1; // 1 point per like
    details.replyLikes = likes;

    return { total: points, details };
  }

  /**
   * Calculate penalties
   */
export function calculatePenalties(review, user) {
    let points = 0;
    const details = {};

    // Spam detection (very short and repetitive)
    if (review.content.length < 20) {
      points -= 20;
      details.spam = -20;
    }

    // Negative engagement
    const likes = review.likeCount || 0;
    const dislikes = review.dislikeCount || 0;
    if (dislikes > 0 && (likes / (likes + dislikes)) < 0.5) {
      points -= 10;
      details.negativeEngagement = -10;
    }

    // Duplicate content detection (requires checking against user's other reviews)
    if (user.hasDuplicateContent) {
      points -= 30;
      details.duplicateContent = -30;
    }

    return { total: points, details };
  }

  /**
   * Calculate streak bonus multiplier
   */
export function calculateMultiplier(user) {
    const streak = user.reviewStreak || 0;
    
    if (streak >= 30) {
      return 1.5; // 50% bonus
    } else if (streak >= 7) {
      return 1.25; // 25% bonus
    } else if (streak >= 3) {
      return 1.1; // 10% bonus
    }
    
    return 1.0; // No multiplier
  }

  /**
   * Calculate streak points
   */
export function calculateStreakPoints(streak) {
    if (streak >= 30) {
      return 200;
    } else if (streak >= 7) {
      return 50;
    } else if (streak >= 3) {
      return 20;
    }
    return 0;
  }

  /**
   * Get level from total points
   */
export function getLevelFromPoints(totalPoints) {
    const levels = [
      { level: 1, name: 'Newbie Critic', minPoints: 0, maxPoints: 99 },
      { level: 2, name: 'Amateur Reviewer', minPoints: 100, maxPoints: 299 },
      { level: 3, name: 'Movie Buff', minPoints: 300, maxPoints: 599 },
      { level: 4, name: 'Cinema Enthusiast', minPoints: 600, maxPoints: 999 },
      { level: 5, name: 'Film Connoisseur', minPoints: 1000, maxPoints: 1999 },
      { level: 6, name: 'Master Critic', minPoints: 2000, maxPoints: 3999 },
      { level: 7, name: 'Elite Reviewer', minPoints: 4000, maxPoints: 7999 },
      { level: 8, name: 'Legendary Critic', minPoints: 8000, maxPoints: 15999 },
      { level: 9, name: 'Cinema Oracle', minPoints: 16000, maxPoints: 31999 },
      { level: 10, name: 'Review Grandmaster', minPoints: 32000, maxPoints: Infinity }
    ];

    return levels.find(l => totalPoints >= l.minPoints && totalPoints <= l.maxPoints) || levels[0];
  }

  /**
   * Get badges based on achievements
   */
export function calculateBadges(user) {
    const badges = [];

    // Review count badges
    if (user.totalReviews >= 100) badges.push({ name: 'Century Club', icon: 'hash' });
    if (user.totalReviews >= 500) badges.push({ name: 'Review Master', icon: 'crown' });

    // Engagement badges
    if (user.totalLikes >= 1000) badges.push({ name: 'Community Favorite', icon: 'star' });
    if (user.totalReplies >= 500) badges.push({ name: 'Discussion Leader', icon: 'message-circle' });

    // Streak badges
    if (user.reviewStreak >= 30) badges.push({ name: 'Dedicated Critic', icon: 'flame' });
    if (user.reviewStreak >= 90) badges.push({ name: 'Unstoppable', icon: 'zap' });

    // Diversity badges
    if (user.reviewedGenres?.length >= 15) badges.push({ name: 'Genre Explorer', icon: 'drama' });
    if (user.reviewedFormats?.length >= 2) badges.push({ name: 'Format Master', icon: 'tv' });

    // Quality badges
    if (user.averageReviewLength >= 500) badges.push({ name: 'Detailed Analyst', icon: 'file-text' });
    if (user.helpfulnessRatio >= 0.8) badges.push({ name: 'Helpful Reviewer', icon: 'sparkles' });

    return badges;
  }

export default PointsCalculator;

