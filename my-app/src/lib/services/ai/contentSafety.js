/**
 * Cinnect AI Assistant - Content Safety Module
 * Integrates existing ML models for content moderation and spoiler detection
 */

import { moderateText } from '@/lib/services/moderation.service';

// HuggingFace API for spoiler detection
const SPOILER_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli';

// Spam patterns (from moderationBot.js)
const SPAM_PATTERNS = [
  /(.)\1{10,}/i,                               // Repeated characters
  /https?:\/\//gi,                             // URLs
  /\b(buy|click|visit|download|free|win|prize)\b/gi, // Promotional keywords
  /\b(\d{3}[-.]?\d{3}[-.]?\d{4})\b/g,         // Phone numbers
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi // Emails
];

// Offensive patterns
const OFFENSIVE_PATTERNS = [
  /\b(hate|racist|sexist)\b/gi
];

// Thresholds - higher = more lenient
const TOXICITY_THRESHOLD = 0.7;
const SPOILER_THRESHOLD = 0.75;  // Higher threshold for spoilers to avoid false positives

/**
 * Detect spoilers in text using facebook/bart-large-mnli
 * @param {string} text - Text to analyze
 * @returns {Promise<{isSpoiler: boolean, confidence: number}>}
 */
export async function detectSpoilersML(text) {
  if (!text || text.trim().length < 10) {
    return { isSpoiler: false, confidence: 0 };
  }

  const apiToken = process.env.HUGGINGFACE_API_TOKEN;
  if (!apiToken) {
    console.warn('[ContentSafety] HUGGINGFACE_API_TOKEN not set, falling back to pattern detection');
    return detectSpoilersPattern(text);
  }

  try {
    const response = await fetch(SPOILER_MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text.slice(0, 1000), // Limit input length
        parameters: {
          candidate_labels: [
            'this contains movie or TV show spoilers',
            'this is a general opinion or review without spoilers'
          ]
        }
      })
    });

    if (!response.ok) {
      if (response.status === 503) {
        // Model loading, fall back to pattern detection
        return detectSpoilersPattern(text);
      }
      return { isSpoiler: false, confidence: 0 };
    }

    const raw = await response.json();

    // Parse response (handle various HuggingFace formats)
    let parsed = raw;
    while (Array.isArray(parsed)) {
      parsed = parsed[0];
    }

    let spoilerScore = 0;

    if (parsed?.labels && parsed?.scores) {
      const sIdx = parsed.labels.findIndex(l =>
        l.toLowerCase().includes('spoiler') && !l.toLowerCase().includes('without')
      );
      spoilerScore = sIdx !== -1 ? parsed.scores[sIdx] : 0;
    } else if (parsed?.label && typeof parsed?.score === 'number') {
      const lbl = parsed.label.toLowerCase();
      if (lbl.includes('spoiler') && !lbl.includes('without')) {
        spoilerScore = parsed.score;
      } else {
        spoilerScore = 1 - parsed.score;
      }
    }

    return {
      isSpoiler: spoilerScore > SPOILER_THRESHOLD,
      confidence: spoilerScore
    };
  } catch (error) {
    console.error('[ContentSafety] Spoiler detection error:', error);
    return detectSpoilersPattern(text);
  }
}

/**
 * Pattern-based spoiler detection (fallback) - conservative approach
 */
function detectSpoilersPattern(text) {
  const lowerText = text.toLowerCase();

  // Only flag explicit spoiler phrases, not single words
  const spoilerPhrases = [
    'dies at the end', 'gets killed', 'turns out to be', 'the twist is',
    'in the final scene', 'reveals that', 'actually was the',
    'the secret is', 'ending is when'
  ];

  const matches = spoilerPhrases.filter(phrase => lowerText.includes(phrase));

  // Need at least one full phrase match to flag as spoiler
  return {
    isSpoiler: matches.length > 0,
    confidence: matches.length > 0 ? 0.8 : 0
  };
}

/**
 * Check text for toxic/offensive content using toxic-bert
 * @param {string} text - Text to analyze
 * @returns {Promise<{isToxic: boolean, score: number, labels: object}>}
 */
export async function detectToxicity(text) {
  if (!text || text.trim().length < 3) {
    return { isToxic: false, score: 0, labels: {} };
  }

  try {
    const result = await moderateText(text);
    return {
      isToxic: result.isAdult || result.score > TOXICITY_THRESHOLD,
      score: result.score,
      labels: result.labels
    };
  } catch (error) {
    console.error('[ContentSafety] Toxicity detection error:', error);
    // Fall back to pattern detection
    return detectToxicityPattern(text);
  }
}

/**
 * Pattern-based toxicity detection (fallback)
 */
function detectToxicityPattern(text) {
  const isToxic = OFFENSIVE_PATTERNS.some(p => p.test(text));
  return {
    isToxic,
    score: isToxic ? 0.8 : 0,
    labels: {}
  };
}

/**
 * Check text for spam patterns
 * @param {string} text - Text to analyze
 * @returns {{isSpam: boolean, patterns: string[]}}
 */
export function detectSpam(text) {
  if (!text) return { isSpam: false, patterns: [] };

  const matchedPatterns = [];

  if (SPAM_PATTERNS[0].test(text)) matchedPatterns.push('repeated_chars');
  if (SPAM_PATTERNS[1].test(text)) matchedPatterns.push('urls');
  if (SPAM_PATTERNS[2].test(text)) matchedPatterns.push('promotional');
  if (SPAM_PATTERNS[3].test(text)) matchedPatterns.push('phone_numbers');
  if (SPAM_PATTERNS[4].test(text)) matchedPatterns.push('emails');

  return {
    isSpam: matchedPatterns.length > 0,
    patterns: matchedPatterns
  };
}

/**
 * Run full content safety check on user message
 * @param {string} message - User message to check
 * @returns {Promise<ContentSafetyResult>}
 */
export async function checkContentSafety(message) {
  const [toxicity, spam] = await Promise.all([
    detectToxicity(message),
    Promise.resolve(detectSpam(message))
  ]);

  const isSafe = !toxicity.isToxic && !spam.isSpam;

  return {
    isSafe,
    toxicity,
    spam,
    shouldWarn: toxicity.score > 0.3 && toxicity.score < TOXICITY_THRESHOLD,
    shouldBlock: toxicity.isToxic || spam.isSpam,
    reason: !isSafe ? (
      toxicity.isToxic ? 'toxic_content' :
      spam.isSpam ? 'spam_detected' : null
    ) : null
  };
}

/**
 * Get appropriate response for unsafe content
 */
export function getUnsafeContentResponse(safetyResult) {
  if (safetyResult.toxicity?.isToxic) {
    return "I'm here to help with movies and entertainment! Let's keep our conversation friendly and respectful. What would you like to know about movies or TV shows?";
  }

  if (safetyResult.spam?.isSpam) {
    if (safetyResult.spam.patterns.includes('urls')) {
      return "I noticed you shared a link. For security, I can't process external URLs. If you want me to look up a movie or show, just tell me its name!";
    }
    return "I'm C.A.S.T, your movie assistant! I'm here to help you discover great content. What would you like to watch?";
  }

  return "Let's talk about movies and TV shows! What are you interested in?";
}

/**
 * Check AI response for safety before sending
 * @param {string} response - AI response to check
 * @param {boolean} spoilerConsent - Whether user has consented to spoilers
 * @returns {Promise<{safe: boolean, response: string, spoilerDetected: boolean}>}
 */
export async function checkResponseSafety(response, spoilerConsent = false) {
  // Check for spoilers if user hasn't consented
  let spoilerResult = { isSpoiler: false, confidence: 0 };

  if (!spoilerConsent) {
    spoilerResult = await detectSpoilersML(response);
  }

  // Check for toxic content in response (shouldn't happen but safety check)
  const toxicity = await detectToxicity(response);

  if (toxicity.isToxic) {
    return {
      safe: false,
      response: "I apologize, but I couldn't generate an appropriate response. Let me try again - what would you like to know?",
      spoilerDetected: false
    };
  }

  if (spoilerResult.isSpoiler && !spoilerConsent) {
    return {
      safe: false,
      response: response, // Keep the response but flag it
      spoilerDetected: true,
      spoilerConfidence: spoilerResult.confidence
    };
  }

  return {
    safe: true,
    response,
    spoilerDetected: spoilerResult.isSpoiler
  };
}
