import Review from '@/lib/models/Review.js'
import User from '@/lib/models/User.js'

// NOTE: All content moderation is now handled by AI models in the offline cron job.
// This file only handles duplicate detection and tagging reviews for processing.

// ===== CORE MODERATION =====

export async function moderateReview(review, user, consensus = null) {
  try {
    const text = (review.content || '').toLowerCase()
    const words = text.split(/\s+/).filter(w => w.length > 0)

    const baseFlags = {
      isSpam: false, // Detected by AI model offline
      isOffensive: false, // Detected by AI model offline
      isDuplicate: await isDuplicateContent(review, user),
      containsSpoilers: false, // Detected by AI model offline
      isLowEffort: false, // Detected by AI model offline
      isPromotional: false // Detected by AI model offline
    }

    const uniqueWords = new Set(words).size
    const diversityRatio = words.length > 0 ? (uniqueWords / words.length) : 0

    // Basic quality score based on diversity and length - AI will refine this
    let qualityScore = Math.min(100, (diversityRatio * 40) + (words.length / 500 * 20) + 40)

    const scores = {
      qualityScore,
      similarityScore: 0, // Injected by offline cron
      toxicityScore: 0    // Injected by offline cron
    }

    // Only flag duplicates immediately - all other moderation handled by AI models
    if (baseFlags.isDuplicate) {
      review.isFlagged = true
      review.flagReason = 'Potential duplicate content'
    }

    // Merge any existing ML analysis
    const flags = { ...baseFlags, containsSpoilers: review.aiAnalysis?.containsSpoilers || false }
    if (review.aiAnalysis) {
      scores.similarityScore = review.aiAnalysis.similarityScore || 0
      scores.toxicityScore = review.aiAnalysis.toxicityScore || 0
      // Apply AI-detected flags
      if (review.aiAnalysis.isSpam) flags.isSpam = true
      if (review.aiAnalysis.isOffensive) flags.isOffensive = true
      if (review.aiAnalysis.isLowEffort) flags.isLowEffort = true
      if (review.aiAnalysis.isPromotional) flags.isPromotional = true
    }

    review.needsProcessing = true // Tag for offline embedding & ML
    review.moderationFlags = flags
    review.moderatedAt = new Date()
    review.moderatedBy = 'AUTOMATED_BOT'
    await review.save()

    return { flags, scores }

  } catch (error) {
    console.error('Moderation error:', error)
    return { flags: {}, scores: {} }
  }
}

// ===== DUPLICATE CHECK =====

async function isDuplicateContent(review, user) {
  if (!user || !user._id) return false

  const userReviews = await Review.find({
    user: user._id,
    _id: { $ne: review._id }
  }).sort({ createdAt: -1 }).limit(10)

  const words = new Set(review.content.toLowerCase().split(/\s+/))

  for (const r of userReviews) {
    if (!r.content) continue
    const other = new Set(r.content.toLowerCase().split(/\s+/))
    const overlap = [...words].filter(w => other.has(w))
    if (overlap.length / Math.min(words.size, other.size) > 0.8) {
      return true
    }
  }
  return false
}

// ===== REPLY MODERATION =====

export async function moderateReply(reply, review, user) {
  // All moderation is now handled by AI models in the offline cron job
  // Replies are tagged for processing and will be moderated asynchronously
  reply.needsProcessing = true
  await review.save()
  return { success: true, removed: false }
}

// ===== BATCH MODERATION =====

export async function batchModerate(limit = 50) {
  const reviews = await Review.find({
    moderatedAt: { $exists: false },
    isRemoved: { $ne: true }
  }).populate('user').limit(limit).sort({ createdAt: -1 })

  const results = { processed: 0, removed: 0, flagged: 0 }

  for (const review of reviews) {
    const res = await moderateReview(review, review.user)
    results.processed++
    if (review.isRemoved) results.removed++
    if (review.isFlagged) results.flagged++
    await new Promise(r => setTimeout(r, 1000))
  }

  return results
}
