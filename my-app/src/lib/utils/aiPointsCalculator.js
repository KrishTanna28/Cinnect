/**
 * Deterministic Points Calculation System
 * Replaces previous AI-based calculations with fully algorithmic rules
 */

// AI Points Calculator - Functional Module
  
  /**
   * Main entry point: Calculate points algorithmically
   */
export async function calculateReviewPoints(review, user, context = {}) {
    const breakdown = {};
    
    // 1. Base Points (deterministic logic)
    const basePoints = calculateBasePoints(review);
    breakdown.base = basePoints;
    
    // 2. Algorithm Quality Score (0-1 multiplier)
    const qualityScore = await analyzeReviewQuality(review);
    breakdown.aiQuality = qualityScore;
    
    // 3. Authenticity Check (sentiment vs rating alignment)
    const authenticityScore = await checkAuthenticity(review);
    breakdown.authenticity = authenticityScore;
    
    // 4. Engagement Quality (meaningful interactions only)
    const engagementScore = await analyzeEngagementQuality(review, context);
    breakdown.engagement = engagementScore;
    
    // 5. Content Analysis (spoilers, duplicates, genre detection)
    const contentAnalysis = await analyzeContent(review, user);
    breakdown.content = contentAnalysis;
    
    // 6. Behavior Modeling (credibility score)
    const credibilityScore = calculateCredibility(user);
    breakdown.credibility = credibilityScore;
    
    // 7. Calculate Final Points using Hybrid Formula
    const finalPoints = calculateFinalScore(
      basePoints,
      qualityScore,
      authenticityScore,
      engagementScore,
      contentAnalysis,
      credibilityScore,
      user
    );
    
    // 8. Generate Explanatory Feedback
    const feedback = await generateFeedback(breakdown, review);
    
    return {
      total: Math.max(0, finalPoints),
      breakdown,
      feedback,
      multiplier: calculateMultiplier(user)
    };
  }
  
  /**
   * 1. Calculate base points (deterministic)
   */
export function calculateBasePoints(review) {
    let points = 0;
    const details = {};
    
    // Length-based points
    const length = review.content.length;
    if (length < 100) {
      points += 10;
      details.length = { points: 10, tier: 'short' };
    } else if (length < 300) {
      points += 25;
      details.length = { points: 25, tier: 'medium' };
    } else if (length < 500) {
      points += 40;
      details.length = { points: 40, tier: 'detailed' };
    } else {
      points += 60;
      details.length = { points: 60, tier: 'in-depth' };
    }
    
    // Title quality
    if (review.title && review.title.length > 10) {
      points += 5;
      details.title = 5;
    }
    
    return { total: points, details };
  }
  
  /**
   * 2. Quality Analysis (Deterministic & Extended)
   */
export async function analyzeReviewQuality(review) {
    const text = review.content || '';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    // Normalized length score
    const lengthScore = Math.min(1.0, words.length / 100);
    
    // Word diversity
    const diversityScore = words.length > 0 ? (uniqueWords.size / words.length) : 0;
    
    // Formatting (punctuation count vs word count)
    const punctuation = (text.match(/[.,!?]/g) || []).length;
    let formattingScore = 0.5;
    if (words.length > 0) {
        const ratio = punctuation / words.length;
        if (ratio >= 0.05 && ratio <= 0.2) formattingScore = 1.0;
        else if (ratio > 0.2) formattingScore = 0.8;
        else formattingScore = 0.6;
    }

    // Repetition detection
    const wordCounts = {};
    let maxFreq = 0;
    for (const w of words) {
        const lw = w.toLowerCase();
        wordCounts[lw] = (wordCounts[lw] || 0) + 1;
        if (wordCounts[lw] > maxFreq) maxFreq = wordCounts[lw];
    }
    const maxFreqRatio = words.length > 0 ? (maxFreq / words.length) : 0;
    const repetitionPenalty = (maxFreqRatio > 0.3 && words.length > 10) ? 0.5 : 1.0;
    
    // Final combined score
    let overall = ((lengthScore * 0.3) + (diversityScore * 0.4) + (formattingScore * 0.3)) * repetitionPenalty;
    overall = Math.max(0.1, Math.min(1.0, overall));

    return {
        score: overall,
        details: { lengthScore, diversityScore, formattingScore, maxFreqRatio, overallQuality: overall },
        points: Math.round(overall * 100)
    };
  }
  
  /**
   * 3. Authenticity Check (sentiment vs rating alignment)
   */
export async function checkAuthenticity(review) {
    const text = (review.content || '').toLowerCase();
    const rating = review.rating || 5;
    
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'good', 'best', 'masterpiece', 'fantastic', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'boring', 'garbage', 'trash', 'disappointing'];
    
    let posCount = 0;
    let negCount = 0;
    
    positiveWords.forEach(w => { if (text.includes(w)) posCount++; });
    negativeWords.forEach(w => { if (text.includes(w)) negCount++; });
    
    const normalizedRating = rating / 10; // 0.1 to 1.0
    
    let sentiment = 0.5;
    if (posCount + negCount > 0) {
        sentiment = posCount / (posCount + negCount);
    } else {
        sentiment = normalizedRating; // Align automatically if no strong sentiment words
    }
    
    // Authenticity based on mismatch
    let alignment = 1 - Math.abs(sentiment - normalizedRating);
    let authentic = alignment > 0.4;
    
    let points = 0;
    if (authentic && alignment > 0.8) {
        points = 50;
    } else if (alignment > 0.6) {
        points = 25;
    } else {
        points = -20;
    }
    
    return {
        score: alignment,
        authentic,
        points,
        details: { sentimentScore: sentiment * 10, alignment, authentic }
    };
  }
  
  /**
   * 4. Engagement Quality Analysis
   */
export async function analyzeEngagementQuality(review, context) {
    const likes = review.likeCount || 0;
    const dislikes = review.dislikeCount || 0;
    const replies = context.replies || [];
    
    // Normalize engagement using global averages
    const globalAvgLikes = context.globalAvgLikes || 10;
    const rawEngagement = (likes - dislikes * 1.5) / Math.max(globalAvgLikes, 1);
    
    // Apply sigmoid curve to limit extreme gains
    const normalizedEngagement = sigmoid(rawEngagement);
    
    // Analyze reply quality deterministically
    let meaningfulReplies = 0;
    
    for (const reply of replies) {
        const rc = reply.content || '';
        const words = rc.split(/\s+/).filter(w => w.trim().length > 0);
        if (words.length >= 5) {
            meaningfulReplies++;
        }
    }
    
    const engagementPoints = Math.round(normalizedEngagement * 100) + (meaningfulReplies * 5);
    
    return {
      score: normalizedEngagement,
      meaningfulReplies,
      points: Math.min(250, Math.max(-50, engagementPoints)),
      details: { likes, dislikes, totalReplies: replies.length, meaningfulReplies }
    };
  }
  
export async function computeSimilarityEmbeddings(text) {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token || !text) return null;
    const res = await fetch('https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2', {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function computeToxicityScore(text) {
  try {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token || !text) return 0;
    const res = await fetch('https://router.huggingface.co/hf-inference/models/unitary/toxic-bert', {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: text })
    });
    if (!res.ok) return 0;
    const raw = await res.json();
    let parsed = raw;
    while (Array.isArray(parsed)) parsed = parsed[0];
    
    if (parsed && typeof parsed.score === 'number' && parsed.label === 'toxic') {
        return parsed.score;
    } else if (parsed && parsed.label) {
        return parsed.label.toLowerCase().includes('toxic') ? parsed.score : 0;
    } else if (parsed && parsed.labels) {
        const toxicIdx = parsed.labels.indexOf('toxic');
        if (toxicIdx !== -1) return parsed.scores[toxicIdx];
    }
    return 0;
  } catch (err) {
    return 0;
  }
}

  async function detectSpoilersHF(text) {
    const spoilerKeywords = ['dies', 'killed', 'plot twist', 'ending', 'turns out', 'final scene', 'death'];
    try {
      const apiToken = process.env.HUGGINGFACE_API_TOKEN;
      if (!apiToken || !text || text.trim().length === 0) {
        return spoilerKeywords.some(w => text.toLowerCase().includes(w));
      }

      const response = await fetch('https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: [
              'this contains movie or TV show spoilers',
              'this is a general opinion or review without spoilers'
            ]
          }
        })
      });

      if (!response.ok) return spoilerKeywords.some(w => text.toLowerCase().includes(w));

      const raw = await response.json();
      let parsed = raw;
      while (Array.isArray(parsed)) parsed = parsed[0];

      let spoilerScore = 0;
      if (parsed?.labels && parsed?.scores) {
        const sIdx = parsed.labels.findIndex(l => l.toLowerCase().includes('spoiler') && !l.toLowerCase().includes('without'));
        spoilerScore = sIdx !== -1 ? parsed.scores[sIdx] : 0;
      } else if (parsed?.label && typeof parsed?.score === 'number') {
        const lbl = parsed.label.toLowerCase();
        if (lbl.includes('spoiler') && !lbl.includes('without')) {
          spoilerScore = parsed.score;
        } else {
          spoilerScore = 1 - parsed.score;
        }
      }

      return spoilerScore > 0.6;
    } catch (error) {
      console.error('Spoiler detection HF error:', error);
      return spoilerKeywords.some(w => text.toLowerCase().includes(w));
    }
  }

  /**
   * 5. Content Analysis (spoilers, duplicates, genre detection, toxicity context)
   */
export async function analyzeContent(review, user) {
    const text = (review.content || '').toLowerCase();
    
    let penalties = 0;
    let spamPenalty = 0;
    let toxicityPenalty = 0;
    let spoilerPenalty = 0;
    let duplicatePenalty = 0;
    let qualityAdjustments = 0;
    
    // Duplicate / Spam logic
    const isOfflineDuplicate = text.length < 20 && ['good', 'nice', 'bad', 'ok'].some(w => text.trim() === w);
    if (isOfflineDuplicate) duplicatePenalty += 30;

    let sim = review.aiAnalysis?.similarityScore || 0;
    if (sim > 0.9) duplicatePenalty += 50;
    else if (sim > 0.75) duplicatePenalty += 20;

    if (review.moderationFlags?.isSpam) {
        spamPenalty += 50;
    }

    // Toxicity Penalty (From cron job ML)
    let tox = review.aiAnalysis?.toxicityScore || 0;
    if (tox > 0.8) toxicityPenalty += 100;
    else if (tox > 0.6) toxicityPenalty += 40;
    
    // Spoiler penalty
    const containsSpoilerKeywords = review.aiAnalysis?.containsSpoilers ?? (await detectSpoilersHF(text));
    if (containsSpoilerKeywords && !review.hasSpoilers) {
        spoilerPenalty += 40; // Strong penalty for unflagged spoilers
    } else if (containsSpoilerKeywords && review.hasSpoilers) {
        spoilerPenalty += 5; // Minimal penalty for reduced accessibility
    }

    penalties = spamPenalty + toxicityPenalty + spoilerPenalty + duplicatePenalty;
    
    return {
      points: -penalties, // Deductions mapped down to points subtotal logic
      penalties,
      spamPenalty,
      toxicityPenalty,
      spoilerPenalty,
      qualityAdjustments,
      details: { 
          isDuplicate: isOfflineDuplicate, 
          toxicityScore: tox,
          similarityScore: sim,
          detectedSpoilers: containsSpoilerKeywords, 
          hasSpoilers: review.hasSpoilers || false 
      }
    };
  }
  
  /**
   * 6. Behavior Modeling & Credibility Score
   */
export function calculateCredibility(user) {
    let credibility = 1.0;
    const factors = {};
    
    // Check for rating extremes
    const extremeRatings = user.ratingDistribution?.extreme || 0;
    const totalRatings = user.totalReviews || 1;
    const extremeRatio = extremeRatings / totalRatings;
    
    if (extremeRatio > 0.7) {
      credibility *= 0.7; // 30% penalty
      factors.extremeRatings = -0.3;
    } else if (extremeRatio > 0.5) {
      credibility *= 0.85;
      factors.extremeRatings = -0.15;
    }
    
    // Check for review bursts (spam detection)
    const recentReviews = user.recentReviewCount || 0;
    if (recentReviews > 20) { // More than 20 reviews in short time
      credibility *= 0.6;
      factors.reviewBurst = -0.4;
    }
    
    // Reward consistent quality
    const avgQuality = user.avgReviewQuality || 0.7;
    if (avgQuality > 0.85) {
      credibility *= 1.2;
      factors.highQuality = 0.2;
    }
    
    // Account age factor
    const accountAge = user.accountAgeDays || 0;
    if (accountAge < 7) {
      credibility *= 0.8;
      factors.newAccount = -0.2;
    } else if (accountAge > 365) {
      credibility *= 1.1;
      factors.establishedAccount = 0.1;
    }
    
    return {
      score: Math.max(0.3, Math.min(1.5, credibility)), // Clamp between 0.3-1.5
      factors
    };
  }
  
  /**
   * 7. Calculate Final Score (Hybrid Formula)
   */
export function calculateFinalScore(base, quality, authenticity, engagement, content, credibility, user) {
    // Formula Requirements:
    // (base * quality * authenticity) + (engagement * credibility) + content.points - penalties
    // Note: content.points is typically used for positive content additions, penalties is subtracted

    const basePoints = base.total * quality.score * authenticity.score;
    const engagementPoints = (engagement.points || 0) * credibility.score;
    
    const contentPoints = content.qualityAdjustments || 0;
    const penalties = Math.abs(content.penalties || 0); // ensuring positive literal for formula subtraction
    
    let subtotal = (basePoints + engagementPoints + contentPoints) - penalties;
    
    // Apply streak multiplier
    const multiplier = calculateMultiplier(user);
    const finalPoints = subtotal * multiplier;
    
    // Add streak bonus
    const streakBonus = calculateStreakPoints(user.reviewStreak || 0);
    
    // Apply maximum cap limits (Anti-abuse safeguard)
    const cap = 500;
    return Math.max(0, Math.min(cap, Math.round(finalPoints + streakBonus)));
  }
  
  /**
   * 8. Generate Explanatory Feedback
   */
export async function generateFeedback(breakdown, review) {
    let feedback = "Thanks for your review!";
    
    if (breakdown.content?.penalties <= -20) {
        if (breakdown.content.details?.detectedSpoilers && !breakdown.content.details?.hasSpoilers) {
            feedback = "Please remember to check the 'Contains Spoilers' box when discussing plot details.";
        } else {
            feedback = "Please write more detailed and original reviews.";
        }
    } else if (breakdown.authenticity && !breakdown.authenticity.authentic) {
        feedback = "The sentiment of your review text doesn't seem to match the rating given. Try to align them!";
    } else if (breakdown.aiQuality?.score > 0.8) {
        feedback = "Excellent review! Great structure and detail.";
    }
    
    return feedback;
  }
  
  /**
   * Helper: Sigmoid function for normalization
   */
export function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
  
  /**
   * Calculate streak multiplier
   */
export function calculateMultiplier(user) {
    const streak = user.reviewStreak || 0;
    
    if (streak >= 30) return 1.5;
    if (streak >= 7) return 1.25;
    if (streak >= 3) return 1.1;
    
    return 1.0;
  }
  
  /**
   * Calculate streak bonus points
   */
export function calculateStreakPoints(streak) {
    if (streak >= 30) return 200;
    if (streak >= 7) return 50;
    if (streak >= 3) return 20;
    return 0;
  }
  
  /**
   * Periodic re-evaluation of points (for engagement updates)
   */
export async function reevaluateReview(review, user, context) {
    // Apply time decay
    const reviewAge = Date.now() - new Date(review.createdAt).getTime();
    const daysSinceCreation = reviewAge / (1000 * 60 * 60 * 24);
    
    // Recalculate with current engagement
    const updatedPoints = await calculateReviewPoints(review, user, context);
    
    // Apply decay factor (older reviews get less weight on updates)
    const decayFactor = Math.exp(-daysSinceCreation / 90); // 90-day half-life
    
    return {
      ...updatedPoints,
      total: Math.round(updatedPoints.total * decayFactor),
      decayApplied: decayFactor
    };
  }
const AIPointsCalculator = {
  calculateReviewPoints,
  calculateBasePoints,
  analyzeReviewQuality,
  checkAuthenticity,
  analyzeEngagementQuality,
  computeSimilarityEmbeddings,
  computeToxicityScore,
  detectSpoilersHF,
  analyzeContent,
  calculateCredibility,
  calculateFinalScore,
  generateFeedback,
  reevaluateReview
};
export default AIPointsCalculator;

