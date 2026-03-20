import Review from '@/lib/models/Review.js'
import User from '@/lib/models/User.js'

// ===== PATTERNS =====

const spamPatterns = [
  /(.)\1{10,}/i,
  /https?:\/\//gi,
  /\b(buy|click|visit|download|free|win|prize)\b/gi,
  /\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
]

const offensivePatterns = [
  /\b(hate|racist|sexist)\b/gi
]

const constructivePatterns = [
  /\b(because|therefore|however|although|specifically|example|instance|reason|pacing|character|plot|cinematography|direction|acting|score|writing)\b/gi
]

const insightfulPatterns = [
  /\b(theme|symbolism|motif|allegory|subtext|foreshadowing|development|arc|cliche|trope|nuance|perspective|juxtaposition)\b/gi
]

const promotionalPatterns = [
  /\b(best movie ever|greatest film|must see|go watch now|buy tickets|perfect 10|flawless masterpiece)\b/gi
]

const spoilerKeywords = [
  'dies', 'killed', 'plot twist', 'ending', 'turns out', 'final scene', 'death'
]

// ===== CORE MODERATION =====

export async function moderateReview(review, user, consensus = null) {
  try {
    const text = (review.content || '').toLowerCase()
    const words = text.split(/\s+/).filter(w => w.length > 0)

    const baseFlags = {
      isSpam: detectSpamPatterns(text) || words.length < 3,
      isOffensive: detectOffensiveContent(text),
      isDuplicate: await isDuplicateContent(review, user),
      containsSpoilers: false, // Model detected offline
      isLowEffort: words.length < 20,
      isPromotional: (text.match(promotionalPatterns[0]) || []).length >= 1 && review.rating >= 9
    }

    if (baseFlags.isLowEffort) {
      const constructivenessMatches = text.match(constructivePatterns[0]) || []
      if (constructivenessMatches.length >= 2 && words.length > 30) baseFlags.isLowEffort = false
    }

    const uniqueWords = new Set(words).size
    const diversityRatio = words.length > 0 ? (uniqueWords / words.length) : 0

    let qualityScore = 50
    if (baseFlags.isSpam || baseFlags.isLowEffort) qualityScore = 10
    else qualityScore = Math.min(100, (diversityRatio * 40) + (words.length / 500 * 20) + 40)

    const scores = {
      qualityScore,
      similarityScore: 0, // Injected by offline cron
      toxicityScore: 0    // Injected by offline cron
    }

    // Take automated actions without impacting points directly
    if (baseFlags.isSpam || baseFlags.isOffensive) {
      review.isRemoved = true
      review.removalReason = baseFlags.isSpam ? 'Spam detected' : 'Offensive content detected'
    } else if (baseFlags.isDuplicate) {
      review.isFlagged = true
      review.flagReason = 'Potential duplicate content'
    }

    // Merge any existing ML analysis
    const flags = { ...baseFlags, containsSpoilers: review.aiAnalysis?.containsSpoilers || false }
    if (review.aiAnalysis) {
      scores.similarityScore = review.aiAnalysis.similarityScore || 0
      scores.toxicityScore = review.aiAnalysis.toxicityScore || 0
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

// ===== HELPERS =====

function detectSpamPatterns(content) {
  return spamPatterns.some(p => p.test(content))
}

function detectOffensiveContent(content) {
  return offensivePatterns.some(p => p.test(content))
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
  let removed = false

  if (detectSpamPatterns(reply.content) || detectOffensiveContent(reply.content)) {
    removed = true
  }

  if (removed) {
    review.replies = review.replies.filter(r => r._id?.toString() !== reply._id?.toString())
    await review.save()
  }

  return { success: true, removed }
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
