const MAX_LEVEL = 10
const LEVEL_BASE_XP = 150
const LEVEL_EXPONENT = 1.5
const MAX_SAFE_XP = Number.MAX_SAFE_INTEGER

const LEVEL_TITLES = {
  1: 'Smallfolk',
  2: 'Squire',
  3: 'Knight',
  4: 'Bannerman',
  5: 'Lord',
  6: 'Warden',
  7: 'Hand of the King',
  8: 'Master of Whisperers',
  9: "King's Council",
  10: 'Iron Throne'
}

const LEVEL_CAPABILITIES = {
  1: [
    'Write reviews, comments, and likes',
    'Strict daily action caps for anti-spam',
    'Basic profile progression and XP feedback'
  ],
  2: [
    'Higher daily activity allowance',
    'Reviews receive base discovery eligibility'
  ],
  3: [
    'Full reply participation',
    'Unlock Knights of the Realm reputation flair'
  ],
  4: [
    'Create discussions inside communities',
    'Save review drafts and revise before publishing'
  ],
  5: [
    'Create and manage communities',
    'Pin one discussion in owned communities'
  ],
  6: [
    'Expanded moderation signals',
    'Higher feed weighting for strong reviews'
  ],
  7: [
    'Platform ranking multiplier increases',
    'Trusted flagging and influence scoring tools'
  ],
  8: [
    'Curated lists eligible for broader distribution',
    'Community leadership tools and stronger discovery'
  ],
  9: [
    'Reviews prioritized in premium feed slots',
    'Early access to new social features'
  ],
  10: [
    'Highest visibility tier for top-quality work',
    'Platform-wide prestige placement and beta access'
  ]
}

const LEVEL_VISIBILITY = {
  1: { weight: 1.0, reviewBoost: 0, feedPriority: 'normal', dailyCapMultiplier: 0.75 },
  2: { weight: 1.03, reviewBoost: 0.01, feedPriority: 'normal', dailyCapMultiplier: 0.85 },
  3: { weight: 1.06, reviewBoost: 0.02, feedPriority: 'normal', dailyCapMultiplier: 0.95 },
  4: { weight: 1.09, reviewBoost: 0.03, feedPriority: 'elevated', dailyCapMultiplier: 1.0 },
  5: { weight: 1.12, reviewBoost: 0.04, feedPriority: 'elevated', dailyCapMultiplier: 1.08 },
  6: { weight: 1.16, reviewBoost: 0.06, feedPriority: 'elevated', dailyCapMultiplier: 1.15 },
  7: { weight: 1.2, reviewBoost: 0.08, feedPriority: 'priority', dailyCapMultiplier: 1.22 },
  8: { weight: 1.24, reviewBoost: 0.1, feedPriority: 'priority', dailyCapMultiplier: 1.3 },
  9: { weight: 1.28, reviewBoost: 0.12, feedPriority: 'featured', dailyCapMultiplier: 1.38 },
  10: { weight: 1.32, reviewBoost: 0.15, feedPriority: 'featured', dailyCapMultiplier: 1.5 }
}

export const BADGE_DEFINITIONS = {
  hand_of_the_king: {
    name: 'Hand of the King',
    category: 'quality',
    description: 'Exceptional, trusted reviews with elite helpfulness.',
    icon: 'crown',
    criteria: 'Helpfulness ratio >= 0.8 and average review length >= 400.',
    boosts: { review_post: 0.1, review_like_received: 0.08 },
    rankingBoost: 0.08
  },
  maesters_insight: {
    name: "Maester's Insight",
    category: 'quality',
    description: 'Deep analytical reviews with structure and depth.',
    icon: 'scroll-text',
    criteria: 'Average review length >= 500.',
    boosts: { review_post: 0.08 }
  },
  three_eyed_raven: {
    name: 'Three-Eyed Raven',
    category: 'quality',
    description: 'Original perspective across a broad range of titles and genres.',
    icon: 'eye',
    criteria: 'Reviewed genres >= 10 and average review length >= 300.',
    boosts: { review_post: 0.06 },
    rankingBoost: 0.05
  },
  master_of_coin: {
    name: 'Master of Coin',
    category: 'engagement',
    description: 'Sustained engagement and strong audience response.',
    icon: 'coins',
    criteria: 'Total likes >= 100.',
    boosts: { review_like_received: 0.1 }
  },
  kings_landing_whisperer: {
    name: "King's Landing Whisperer",
    category: 'engagement',
    description: 'Consistently active in thoughtful discussions.',
    icon: 'message-circle',
    criteria: 'Comments posted >= 50.',
    boosts: { comment_post: 0.08, reply_post: 0.08 }
  },
  the_spider: {
    name: 'The Spider',
    category: 'engagement',
    description: 'Meaningful activity across multiple communities and formats.',
    icon: 'network',
    criteria: 'Reviewed genres >= 12 and both movies and TV covered.',
    boosts: { comment_post: 0.05, reply_post: 0.05, trending_post: 0.05 }
  },
  the_north_remembers: {
    name: 'The North Remembers',
    category: 'consistency',
    description: 'Long-term consistency in quality and presence.',
    icon: 'snowflake',
    criteria: 'Reviews written >= 40 and longest streak >= 14.',
    boosts: { review_post: 0.07 }
  },
  nights_watch: {
    name: "Night's Watch",
    category: 'consistency',
    description: 'Reliable daily contribution streak.',
    icon: 'moon-star',
    criteria: 'Current streak >= 7.',
    boosts: { daily_login: 0.25 }
  },
  lord_of_winterfell: {
    name: 'Lord of Winterfell',
    category: 'community',
    description: 'Built a successful community with lasting activity.',
    icon: 'shield',
    criteria: 'Community reaches 100 members or strong sustained discussion.',
    boosts: { community_create: 0.1 },
    rankingBoost: 0.04
  },
  warden_of_the_west: {
    name: 'Warden of the West',
    category: 'community',
    description: 'Leads a large and active community.',
    icon: 'castle',
    criteria: 'Community reaches 500 members.',
    boosts: { community_create: 0.12, trending_post: 0.06 }
  },
  breaker_of_chains: {
    name: 'Breaker of Chains',
    category: 'community',
    description: 'Revives dormant threads and restarts discussion.',
    icon: 'flame',
    criteria: 'Revives inactive discussions multiple times.',
    boosts: { comment_post: 0.06, reply_post: 0.06 }
  },
  iron_throne: {
    name: 'Iron Throne',
    category: 'viral',
    description: 'Top trending content with platform-wide impact.',
    icon: 'swords',
    criteria: 'Gold-tier trending milestone.',
    boosts: { trending_post: 0.12 },
    rankingBoost: 0.1,
    temporaryBoostHours: 48
  },
  wildfire: {
    name: 'Wildfire',
    category: 'viral',
    description: 'Sudden viral growth in engagement.',
    icon: 'star',
    criteria: 'Trend factor >= 1.2 within short time window.',
    boosts: { trending_post: 0.08 }
  },
  battle_of_the_bastards: {
    name: 'Battle of the Bastards',
    category: 'viral',
    description: 'High-intensity, high-engagement discussions.',
    icon: 'swords',
    criteria: 'Engagement factor >= 0.9 on discussion content.',
    boosts: { comment_post: 0.05, reply_post: 0.05, trending_post: 0.05 }
  }
}

const ACTION_CONFIG = {
  review_post: {
    bucket: 'reviews',
    baseXp: 20,
    dailyCap: 120,
    repeatPenaltyStart: 3,
    repeatPenaltyFloor: 0.35,
    qualityWeight: 1,
    engagementWeight: 0.2,
    minQualityForFullReward: 0.35
  },
  review_like_received: {
    bucket: 'reviewLikes',
    baseXp: 2,
    dailyCap: 40,
    repeatPenaltyStart: 12,
    repeatPenaltyFloor: 0.45,
    qualityWeight: 0.45,
    engagementWeight: 0.4
  },
  comment_post: {
    bucket: 'comments',
    baseXp: 5,
    dailyCap: 30,
    repeatPenaltyStart: 5,
    repeatPenaltyFloor: 0.35,
    qualityWeight: 0.35,
    engagementWeight: 0.15,
    minQualityForFullReward: 0.3
  },
  reply_post: {
    bucket: 'replies',
    baseXp: 3,
    dailyCap: 24,
    repeatPenaltyStart: 6,
    repeatPenaltyFloor: 0.35,
    qualityWeight: 0.3,
    engagementWeight: 0.15,
    minQualityForFullReward: 0.3
  },
  daily_login: {
    bucket: 'logins',
    baseXp: 2,
    dailyCap: 2,
    oncePerDay: true
  },
  high_quality_review: {
    bucket: 'highQualityReviews',
    baseXp: 50,
    dailyCap: 100,
    repeatPenaltyStart: 2,
    repeatPenaltyFloor: 0.5,
    qualityWeight: 0.4,
    engagementWeight: 0.15,
    minQualityForFullReward: 0.8,
    internalOnly: true
  },
  trending_post: {
    bucket: 'trending',
    baseXp: 100,
    dailyCap: 200,
    repeatPenaltyStart: 2,
    repeatPenaltyFloor: 0.55,
    qualityWeight: 0.2,
    engagementWeight: 0.8
  },
  community_create: {
    bucket: 'communities',
    baseXp: 200,
    dailyCap: 200,
    oncePerDay: true,
    qualityWeight: 0.2,
    minQualityForFullReward: 0.4
  }
}

export const LEVEL_DEFINITIONS = Array.from({ length: MAX_LEVEL }, (_, index) => {
  const level = index + 1
  const minXp = getXpThresholdForLevel(level)
  const nextMinXp = level === MAX_LEVEL ? Infinity : getXpThresholdForLevel(level + 1)

  return {
    level,
    title: getLevelTitle(level),
    minXp,
    maxXp: nextMinXp === Infinity ? Infinity : nextMinXp - 1,
    capabilities: getLevelCapabilities(level),
    visibility: getLevelVisibilityProfile(level)
  }
})

export function getXpThresholdForLevel(level) {
  if (level <= 1) return 0
  return Math.round(LEVEL_BASE_XP * Math.pow(level - 1, LEVEL_EXPONENT))
}

export function getLevelTitle(level) {
  return LEVEL_TITLES[level] || LEVEL_TITLES[1]
}

export function getTierFromRank(rank) {
  if (!rank || rank < 1) return 'Smallfolk'
  if (rank === 1) return 'King'
  if (rank <= 10) return 'Hand of the King'
  if (rank <= 50) return 'Small Council Elite'
  if (rank <= 200) return 'Kingsguard'
  if (rank <= 1000) return 'Warden'
  if (rank <= 5000) return 'Lord'
  if (rank <= 20000) return 'Bannermen'
  if (rank <= 100000) return 'Knight'
  if (rank <= 500000) return 'Soldiers'
  return 'Smallfolk'
}

export function getTopPercentLabel(percentile) {
  if (percentile === null || percentile === undefined) return null
  const safePercentile = Math.max(0.01, percentile)
  return `${safePercentile < 1 ? safePercentile.toFixed(2) : Math.round(safePercentile)}%`
}

export function getLevelCapabilities(level) {
  return LEVEL_CAPABILITIES[level] || []
}

export function getLevelBenefits(level) {
  const visibility = getLevelVisibilityProfile(level)
  return [
    ...getLevelCapabilities(level),
    `Ranking weight: x${visibility.weight.toFixed(2)}`,
    `Review visibility boost: +${Math.round(visibility.reviewBoost * 100)}%`,
    `Daily cap multiplier: x${visibility.dailyCapMultiplier.toFixed(2)}`
  ]
}

export function getLevelVisibilityProfile(level) {
  return LEVEL_VISIBILITY[level] || LEVEL_VISIBILITY[1]
}

export function getLevelFromXp(totalXp = 0) {
  const safeXp = Math.max(0, totalXp)

  for (let level = MAX_LEVEL; level >= 1; level -= 1) {
    if (safeXp >= getXpThresholdForLevel(level)) {
      return {
        level,
        title: getLevelTitle(level),
        minXp: getXpThresholdForLevel(level),
        maxXp: level === MAX_LEVEL ? Infinity : getXpThresholdForLevel(level + 1) - 1
      }
    }
  }

  return {
    level: 1,
    title: getLevelTitle(1),
    minXp: 0,
    maxXp: getXpThresholdForLevel(2) - 1
  }
}

export function getProgressionSnapshot(user) {
  ensureProgressionState(user)

  const totalXp = Math.max(0, user?.points?.total || 0)
  const levelInfo = getLevelFromXp(totalXp)
  const nextLevelXp = levelInfo.level >= MAX_LEVEL ? null : getXpThresholdForLevel(levelInfo.level + 1)
  const xpIntoLevel = totalXp - levelInfo.minXp
  const xpForLevel = nextLevelXp === null ? null : Math.max(1, nextLevelXp - levelInfo.minXp)
  const progressPercent = nextLevelXp === null ? 100 : Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100))

  return {
    totalXp,
    currentLevel: levelInfo.level,
    currentTitle: levelInfo.title,
    currentLevelMinXp: levelInfo.minXp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel: nextLevelXp === null ? 0 : Math.max(0, nextLevelXp - totalXp),
    progressPercent,
    capabilities: getLevelCapabilities(levelInfo.level),
    visibility: getLevelVisibilityProfile(levelInfo.level),
    badges: getUnlockedBadgeSummaries(user),
    dailyCaps: getDailyBucketSummary(user)
  }
}

export function calculateReviewQuality(review = {}) {
  const content = `${review.content || ''}`.trim()
  const title = `${review.title || ''}`.trim()
  const normalized = content.toLowerCase()
  const words = normalized.match(/\b[\w']+\b/g) || []
  const uniqueWords = new Set(words)
  const sentences = content.split(/[.!?]+/).map(part => part.trim()).filter(Boolean)
  const paragraphs = content.split(/\n+/).map(part => part.trim()).filter(Boolean)
  const avgSentenceLength = sentences.length ? words.length / sentences.length : 0
  const dwellTimeEstimate = Math.max(8, Math.round(words.length / 3.2))

  const lengthScore = clamp((content.length - 80) / 520, 0, 1)
  const titleScore = clamp((title.length - 8) / 32, 0, 1)
  const structureScore =
    clamp(sentences.length / 6, 0, 1) * 0.65 +
    clamp(paragraphs.length / 3, 0, 1) * 0.35
  const vocabularyScore = words.length > 0 ? clamp(uniqueWords.size / Math.max(words.length, 1), 0.3, 0.85) : 0
  const ratingScore = review.rating >= 2 && review.rating <= 9 ? 1 : 0.45
  const readabilityScore = avgSentenceLength > 4 && avgSentenceLength < 30 ? 1 : 0.65
  const dwellScore = clamp((dwellTimeEstimate - 12) / 90, 0, 1)

  const repetitivePhrases = countRepeatedPhrases(normalized)
  const spamPenalty =
    clamp((24 - content.length) / 24, 0, 1) * 0.45 +
    clamp(repetitivePhrases / 4, 0, 1) * 0.22 +
    clamp(review.flagCount || 0, 0, 3) * 0.12 +
    clamp(review?.moderation?.confidence || 0, 0, 1) * 0.25 +
    (review.isFlagged ? 0.32 : 0)

  const rawScore =
    lengthScore * 0.24 +
    titleScore * 0.08 +
    structureScore * 0.2 +
    vocabularyScore * 0.13 +
    ratingScore * 0.08 +
    readabilityScore * 0.12 +
    dwellScore * 0.15

  const score = clamp(rawScore - spamPenalty, 0, 1)

  return {
    score: round(score, 2),
    details: {
      lengthScore: round(lengthScore, 2),
      titleScore: round(titleScore, 2),
      structureScore: round(structureScore, 2),
      vocabularyScore: round(vocabularyScore, 2),
      ratingScore: round(ratingScore, 2),
      readabilityScore: round(readabilityScore, 2),
      dwellScore: round(dwellScore, 2),
      dwellTimeEstimate,
      spamPenalty: round(spamPenalty, 2),
      repeatedPhrases
    }
  }
}

export function calculateTextQuality(text = '') {
  const content = `${text}`.trim()
  const words = content.toLowerCase().match(/\b[\w']+\b/g) || []
  const uniqueRatio = words.length ? new Set(words).size / words.length : 0
  const sentenceCount = content.split(/[.!?]+/).map(part => part.trim()).filter(Boolean).length
  const repeatedPhrases = countRepeatedPhrases(content.toLowerCase())

  const score =
    clamp((content.length - 25) / 180, 0, 1) * 0.5 +
    clamp(sentenceCount / 3, 0, 1) * 0.2 +
    clamp(uniqueRatio, 0.25, 0.85) * 0.2 -
    clamp(repeatedPhrases / 3, 0, 1) * 0.35

  return {
    score: round(clamp(score, 0, 1), 2),
    details: {
      length: content.length,
      sentenceCount,
      uniqueRatio: round(uniqueRatio, 2),
      repeatedPhrases
    }
  }
}

export function calculateReviewEngagementFactor(review = {}) {
  const likes = review.likes?.length || review.likeCount || 0
  const replies = review.replies?.length || review.replyCount || 0
  const dislikes = review.dislikes?.length || review.dislikeCount || 0
  const dwellTimeEstimate = review?.gamification?.qualityDetails?.dwellTimeEstimate || 0

  const factor =
    clamp(likes / 20, 0, 1) * 0.45 +
    clamp(replies / 10, 0, 1) * 0.3 +
    clamp(dwellTimeEstimate / 120, 0, 1) * 0.15 -
    clamp(dislikes / 10, 0, 1) * 0.2

  return round(clamp(factor, 0, 1), 2)
}

export function calculatePostTrendingSignal(post = {}) {
  const likes = post.likes?.length || 0
  const comments = post.comments?.length || 0
  const dislikes = post.dislikes?.length || 0
  const views = post.views || 0
  const createdAt = post.createdAt ? new Date(post.createdAt) : new Date()
  const ageHours = Math.max(1, (Date.now() - createdAt.getTime()) / 3600000)
  const freshness = clamp(1 - ageHours / 72, 0.2, 1)
  const rawScore = (likes * 1.4) + (comments * 2.2) + (views / 20) - (dislikes * 1.25)

  return round(rawScore * freshness, 2)
}

export function getTrendingTier(post = {}) {
  const score = calculatePostTrendingSignal(post)

  if (score >= 40) return { key: 'gold', label: 'Iron Throne', factor: 1.35, score }
  if (score >= 24) return { key: 'silver', label: "King's Council", factor: 1.15, score }
  if (score >= 12) return { key: 'bronze', label: 'Bannerman', factor: 1.0, score }

  return null
}

export function calculateRankingScore({
  qualityScore = 0,
  engagementScore = 0,
  consistencyScore = 0
} = {}) {
  const normalizedQuality = clamp(qualityScore, 0, 100)
  const normalizedEngagement = clamp(engagementScore, 0, 100)
  const normalizedConsistency = clamp(consistencyScore, 0, 100)
  const finalScore =
    (normalizedQuality * 0.5) +
    (normalizedEngagement * 0.3) +
    (normalizedConsistency * 0.2)

  return {
    finalScore: round(finalScore, 2),
    qualityComponent: round(normalizedQuality * 0.5, 2),
    engagementComponent: round(normalizedEngagement * 0.3, 2),
    consistencyComponent: round(normalizedConsistency * 0.2, 2)
  }
}

export function calculateReviewRankingProfile(review = {}, user = {}) {
  const quality = typeof review?.gamification?.qualityScore === 'number'
    ? review.gamification.qualityScore
    : calculateReviewQuality(review).score
  const engagement = calculateReviewEngagementFactor(review)

  return calculateRankingScore({
    qualityScore: quality * 100,
    engagementScore: engagement * 100,
    consistencyScore: Math.min(100, ((user?.streaks?.current || 0) * 8))
  })
}

export function applyXpEvent(user, { action, target = {}, metadata = {}, now = new Date() }) {
  ensureProgressionState(user, now)

  const config = ACTION_CONFIG[action]
  if (!config) {
    return {
      grantedXp: 0,
      blockedReason: 'unknown_action',
      progression: getProgressionSnapshot(user)
    }
  }

  const levelBefore = getLevelFromXp(user.points?.total || 0)
  const daily = user.progression.daily
  const levelVisibility = getLevelVisibilityProfile(user.level || 1)
  const effectiveDailyCap = Math.round(config.dailyCap * levelVisibility.dailyCapMultiplier)
  const xpUsedToday = daily.xp[config.bucket] || 0
  const actionCountToday = daily.counts[config.bucket] || 0

  if (config.oncePerDay && actionCountToday >= 1) {
    return {
      grantedXp: 0,
      blockedReason: 'already_claimed_today',
      progression: getProgressionSnapshot(user)
    }
  }

  let qualityScore = 0
  let qualityDetails = {}

  if (action === 'review_post' || action === 'review_like_received' || action === 'high_quality_review') {
    const quality = calculateReviewQuality(target)
    qualityScore = quality.score
    qualityDetails = quality.details
  } else if (action === 'comment_post' || action === 'reply_post' || action === 'community_create') {
    const quality = calculateTextQuality(target.content || target.description || '')
    qualityScore = quality.score
    qualityDetails = quality.details
  } else if (typeof metadata.qualityScore === 'number') {
    qualityScore = clamp(metadata.qualityScore, 0, 1)
  }

  let engagementFactor = 0
  if (action === 'review_like_received') {
    engagementFactor = calculateReviewEngagementFactor(target)
  } else if (action === 'trending_post') {
    engagementFactor = clamp(metadata.trendFactor || 0, 0, 1.5)
  } else if (typeof metadata.engagementFactor === 'number') {
    engagementFactor = clamp(metadata.engagementFactor, 0, 1.5)
  }

  const diminishingMultiplier = getDiminishingMultiplier(actionCountToday, config)
  const badgeMultiplier = 1 + getBadgeBoost(user, action)
  const lowQualityPenalty =
    config.minQualityForFullReward && qualityScore < config.minQualityForFullReward
      ? clamp(qualityScore / config.minQualityForFullReward, 0.15, 1)
      : 1
  const moderationPenalty = getModerationPenalty(metadata, target)
  const baseXp = config.baseXp
  const qualityBonus = qualityScore * (config.qualityWeight || 0)
  const engagementBonus = engagementFactor * (config.engagementWeight || 0)
  const tierFactor = metadata.tierFactor || 1
  const rawXp = baseXp * (1 + qualityScore + engagementFactor)
  const weightedXp = rawXp * (1 + qualityBonus + engagementBonus) * tierFactor

  let bonusXp = 0
  let bonusReason = null

  if (action === 'review_post' && qualityScore >= 0.8) {
    const bonusConfig = ACTION_CONFIG.high_quality_review
    const bonusUsedToday = daily.xp[bonusConfig.bucket] || 0
    const bonusCountToday = daily.counts[bonusConfig.bucket] || 0
    const bonusCap = Math.round(bonusConfig.dailyCap * levelVisibility.dailyCapMultiplier)
    const bonusRemaining = Math.max(0, bonusCap - bonusUsedToday)
    const bonusMultiplier = getDiminishingMultiplier(bonusCountToday, bonusConfig)
    const rawBonus = bonusConfig.baseXp * (1 + qualityScore + Math.min(engagementFactor, 0.5))
    const adjustedBonus = rawBonus * bonusMultiplier * badgeMultiplier * moderationPenalty

    bonusXp = Math.max(0, Math.min(bonusRemaining, Math.round(adjustedBonus)))
    bonusReason = bonusXp > 0 ? 'high_quality_review' : null

    if (bonusXp > 0) {
      daily.xp[bonusConfig.bucket] = bonusUsedToday + bonusXp
      daily.counts[bonusConfig.bucket] = bonusCountToday + 1
    }
  }

  const adjustedXp = weightedXp * diminishingMultiplier * badgeMultiplier * lowQualityPenalty * moderationPenalty
  const remainingCap = Math.max(0, effectiveDailyCap - xpUsedToday)
  const grantedXp = Math.max(0, Math.min(remainingCap, Math.round(adjustedXp)))
  const totalGrantedXp = grantedXp + bonusXp

  if (totalGrantedXp <= 0) {
    return {
      grantedXp: 0,
      blockedReason: remainingCap <= 0 ? 'daily_cap_reached' : 'filtered_low_quality',
      qualityScore,
      engagementFactor,
      progression: getProgressionSnapshot(user)
    }
  }

  user.points.total = clamp(user.points.total + totalGrantedXp, 0, MAX_SAFE_XP)
  user.points.available = clamp(user.points.available + totalGrantedXp, 0, MAX_SAFE_XP)
  user.level = getLevelFromXp(user.points.total).level

  daily.xp[config.bucket] = xpUsedToday + grantedXp
  daily.counts[config.bucket] = actionCountToday + 1
  user.markModified?.('progression')

  const unlockedBadges = evaluateBadgeUnlocks(user, {
    action,
    qualityScore,
    engagementFactor,
    metadata
  })
  const progression = getProgressionSnapshot(user)
  const levelUp = progression.currentLevel > levelBefore.level

  return {
    action,
    grantedXp: totalGrantedXp,
    baseXp,
    bonusXp,
    bonusReason,
    qualityScore,
    qualityDetails,
    engagementFactor,
    diminishingMultiplier: round(diminishingMultiplier, 2),
    badgeMultiplier: round(badgeMultiplier, 2),
    moderationPenalty: round(moderationPenalty, 2),
    lowQualityPenalty: round(lowQualityPenalty, 2),
    dailyCap: effectiveDailyCap,
    dailyXpUsed: (daily.xp[config.bucket] || 0) + (bonusReason ? daily.xp.highQualityReviews || 0 : 0),
    progression,
    unlockedBadges,
    levelUp,
    message: buildXpMessage(action, totalGrantedXp, qualityScore, engagementFactor, bonusReason)
  }
}

export function ensureProgressionState(user, now = new Date()) {
  if (!user.points) {
    user.points = { total: 0, available: 0, redeemed: 0 }
  }

  if (typeof user.points.total !== 'number') user.points.total = 0
  if (typeof user.points.available !== 'number') user.points.available = 0
  if (typeof user.points.redeemed !== 'number') user.points.redeemed = 0

  if (!user.progression) {
    user.progression = {}
  }

  if (!user.progression.daily) {
    user.progression.daily = buildEmptyDailyProgress(now)
  }

  if (!user.progression.badgeIds) {
    user.progression.badgeIds = []
  }

  const todayKey = getDateKey(now)
  if (user.progression.daily.dateKey !== todayKey) {
    user.progression.daily = buildEmptyDailyProgress(now)
  }

  if (typeof user.level !== 'number' || user.level < 1) {
    user.level = getLevelFromXp(user.points.total).level
  }
}

export function evaluateBadgeUnlocks(user, context = {}) {
  ensureProgressionState(user)

  const unlocked = []
  const badgeIds = new Set(user.progression.badgeIds || [])
  const metrics = buildBadgeMetrics(user, context)

  Object.entries(BADGE_DEFINITIONS).forEach(([badgeId, badge]) => {
    if (badgeIds.has(badgeId)) return
    if (!isBadgeUnlocked(badgeId, metrics)) return

    badgeIds.add(badgeId)
    unlocked.push({
      badgeId,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earnedAt: new Date()
    })
  })

  if (unlocked.length > 0) {
    user.progression.badgeIds = Array.from(badgeIds)
    user.badges = user.badges || []

    unlocked.forEach(badge => {
      if (!user.badges.find(existing => existing.name === badge.name)) {
        user.badges.push(badge)
      }
    })

    user.markModified?.('progression')
    user.markModified?.('badges')
  }

  return unlocked
}

export function getLevelCatalog() {
  return LEVEL_DEFINITIONS
}

export function getXpConfig() {
  return {
    formula: 'XP_required(level) = 150 * ((level - 1) ^ 1.5)',
    maxLevel: MAX_LEVEL,
    levels: getLevelCatalog(),
    actions: {
      review_post: { baseXp: 20, dailyCap: 120 },
      review_like_received: { baseXp: 2, dailyCap: 40 },
      comment_post: { baseXp: 5, dailyCap: 30 },
      reply_post: { baseXp: 3, dailyCap: 24 },
      daily_login: { baseXp: 2, dailyCap: 2 },
      high_quality_review: { baseXp: 50, dailyCap: 100 },
      trending_post: { baseXp: 100, dailyCap: 200 },
      community_create: { baseXp: 200, dailyCap: 200 }
    },
    rankingFormula: 'ranking_score = (avg_quality_score * 0.5) + (engagement_score * 0.3) + (consistency_score * 0.2)',
    badges: Object.entries(BADGE_DEFINITIONS).map(([badgeId, badge]) => ({
      badgeId,
      ...badge
    }))
  }
}

function getDailyBucketSummary(user) {
  ensureProgressionState(user)
  const daily = user.progression.daily
  const levelProfile = getLevelVisibilityProfile(user.level || 1)

  return Object.entries(ACTION_CONFIG).reduce((summary, [action, config]) => {
    if (config.internalOnly) return summary

    summary[action] = {
      used: daily.xp[config.bucket] || 0,
      cap: Math.round(config.dailyCap * levelProfile.dailyCapMultiplier)
    }
    return summary
  }, {})
}

function getUnlockedBadgeSummaries(user) {
  const badgeIds = user?.progression?.badgeIds || []
  return badgeIds.map(badgeId => ({
    badgeId,
    ...(BADGE_DEFINITIONS[badgeId] || {})
  }))
}

function getBadgeBoost(user, action) {
  const badgeIds = user?.progression?.badgeIds || []
  return badgeIds.reduce((total, badgeId) => {
    const badge = BADGE_DEFINITIONS[badgeId]
    return total + (badge?.boosts?.[action] || 0)
  }, 0)
}

function buildBadgeMetrics(user, context) {
  return {
    helpfulnessRatio: user.helpfulnessRatio || 0,
    averageReviewLength: user.averageReviewLength || 0,
    reviewedGenres: user.reviewedGenres?.length || 0,
    reviewedFormats: user.reviewedFormats || [],
    totalLikes: user.achievements?.totalLikes || 0,
    commentsPosted: user.achievements?.commentsPosted || 0,
    reviewsWritten: user.achievements?.reviewsWritten || 0,
    streakCurrent: user.streaks?.current || 0,
    streakLongest: user.streaks?.longest || 0,
    qualityScore: context.qualityScore || 0,
    engagementFactor: context.engagementFactor || 0,
    trendFactor: context.metadata?.trendFactor || 0,
    trendingTier: context.metadata?.tierKey || context.metadata?.trendingTier || null,
    communityMemberCount: context.metadata?.communityMemberCount || 0,
    revivedDiscussionCount: context.metadata?.revivedDiscussionCount || 0
  }
}

function isBadgeUnlocked(badgeId, metrics) {
  switch (badgeId) {
    case 'hand_of_the_king':
      return metrics.helpfulnessRatio >= 0.8 && metrics.averageReviewLength >= 400
    case 'maesters_insight':
      return metrics.averageReviewLength >= 500
    case 'three_eyed_raven':
      return metrics.reviewedGenres >= 10 && metrics.averageReviewLength >= 300
    case 'master_of_coin':
      return metrics.totalLikes >= 100
    case 'kings_landing_whisperer':
      return metrics.commentsPosted >= 50
    case 'the_spider':
      return metrics.reviewedGenres >= 12 && metrics.reviewedFormats.includes('movie') && metrics.reviewedFormats.includes('tv')
    case 'the_north_remembers':
      return metrics.reviewsWritten >= 40 && metrics.streakLongest >= 14
    case 'nights_watch':
      return metrics.streakCurrent >= 7
    case 'lord_of_winterfell':
      return metrics.communityMemberCount >= 100
    case 'warden_of_the_west':
      return metrics.communityMemberCount >= 500
    case 'breaker_of_chains':
      return metrics.revivedDiscussionCount >= 3
    case 'iron_throne':
      return metrics.trendingTier === 'gold'
    case 'wildfire':
      return metrics.trendFactor >= 1.2
    case 'battle_of_the_bastards':
      return metrics.engagementFactor >= 0.9
    default:
      return false
  }
}

function buildEmptyDailyProgress(now) {
  return {
    dateKey: getDateKey(now),
    xp: {
      reviews: 0,
      reviewLikes: 0,
      comments: 0,
      replies: 0,
      logins: 0,
      highQualityReviews: 0,
      communities: 0,
      trending: 0
    },
    counts: {
      reviews: 0,
      reviewLikes: 0,
      comments: 0,
      replies: 0,
      logins: 0,
      highQualityReviews: 0,
      communities: 0,
      trending: 0
    }
  }
}

function getDiminishingMultiplier(actionCountToday, config) {
  if (!config.repeatPenaltyStart || actionCountToday < config.repeatPenaltyStart) {
    return 1
  }

  const overflowCount = actionCountToday - config.repeatPenaltyStart + 1
  return Math.max(config.repeatPenaltyFloor || 0.35, 1 - (overflowCount * 0.16))
}

function getModerationPenalty(metadata = {}, target = {}) {
  if (metadata.forcePenaltyMultiplier) return metadata.forcePenaltyMultiplier
  if (metadata.isSpamPattern) return 0.1
  if (metadata.isFlagged || target.isFlagged) return 0.2

  const moderationConfidence = metadata.moderationConfidence ?? target?.moderation?.confidence ?? 0
  if (moderationConfidence >= 0.85) return 0.25
  if (moderationConfidence >= 0.65) return 0.55

  return 1
}

function countRepeatedPhrases(text) {
  const phrases = text.match(/\b[\w']+(?:\s+[\w']+){1,2}\b/g) || []
  const seen = new Map()

  phrases.forEach(phrase => {
    seen.set(phrase, (seen.get(phrase) || 0) + 1)
  })

  let repeated = 0
  seen.forEach(count => {
    if (count > 2) repeated += 1
  })

  return repeated
}

function getDateKey(date) {
  return new Date(date).toISOString().slice(0, 10)
}

function buildXpMessage(action, grantedXp, qualityScore, engagementFactor, bonusReason) {
  const labels = {
    daily_login: "the day's watch",
    review_post: 'review posted',
    review_like_received: 'court approval',
    comment_post: 'council comment',
    reply_post: 'ravens sent',
    community_create: 'house founded',
    trending_post: 'Iron Throne trending post'
  }

  const qualityTier =
    qualityScore >= 0.88 ? 'Maester-Level Insight' :
    qualityScore >= 0.75 ? 'Hand of the King Quality' :
    qualityScore >= 0.6 ? 'Knighted Quality' :
    qualityScore > 0 ? 'Small Council Quality' :
    ''

  const engagementTier = engagementFactor >= 0.9 ? 'high court engagement' : engagementFactor >= 0.5 ? 'strong realm engagement' : ''
  const bonusBit = bonusReason === 'high_quality_review' ? ' High-quality review bonus applied.' : ''
  const qualityBit = qualityTier ? ` ${qualityTier}.` : ''
  const engagementBit = engagementTier ? ` ${engagementTier}.` : ''

  return `+${grantedXp} XP - ${labels[action] || action}.${qualityBit}${engagementBit}${bonusBit}`.trim()
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function round(value, digits = 0) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
