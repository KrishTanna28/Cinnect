/**
 * Cinnect AI Assistant - Spoiler Awareness Module
 * Handles spoiler detection, warnings, and safe content generation
 * Uses ML model (facebook/bart-large-mnli) for accurate spoiler detection
 */

// Re-export ML detection from contentSafety for convenience
export { detectSpoilersML } from './contentSafety';

// Keywords that might indicate spoiler content in responses
const SPOILER_INDICATORS = [
  'ending', 'dies', 'death', 'killed', 'dead', 'finale', 'twist',
  'reveals', 'revealed', 'turns out', 'actually', 'secret',
  'betrays', 'betrayal', 'villain', 'true identity', 'real father',
  'real mother', 'was actually', 'in the end', 'final scene',
  'post-credits', 'mid-credits', 'cliffhanger', 'surprise',
  'plot twist', 'big reveal', 'shocking', 'unexpected'
];

// Topics that inherently require spoiler care - must be EXPLICIT requests
const SPOILER_SENSITIVE_TOPICS = [
  'explain the ending', 'ending explained', 'what happens at the end',
  'how does it end', 'how did it end', 'who dies', 'who died',
  'plot twist', 'full story', 'spoiler', 'spoilers',
  'meaning of the ending', 'post credit scene', 'final episode ending',
  'series finale explained', 'tell me the plot', 'explain what happens'
];

// Questions that are NOT spoiler requests (recommendation/opinion questions)
const SAFE_QUESTION_PATTERNS = [
  /\b(worth|worth it|good|bad|recommend|should i watch|is it good|any good)\b/i,
  /\b(review|opinion|thoughts|rating|rate it|how is it)\b/i,
  /\b(similar to|like|compared to|better than|worse than)\b/i,
  /\b(genre|cast|director|where to watch|streaming)\b/i
];

/**
 * Check if a user message requests spoiler-sensitive content
 */
export function detectSpoilerRequest(message) {
  const lowerMessage = message.toLowerCase();

  // First check if it's a safe question (recommendation, opinion, etc.)
  const isSafeQuestion = SAFE_QUESTION_PATTERNS.some(pattern => pattern.test(message));

  if (isSafeQuestion) {
    return {
      isSpoilerSensitive: false,
      explicitSpoilerRequest: false,
      requestsEnding: false,
      requestsPlot: false
    };
  }

  // Only flag as spoiler-sensitive if explicitly asking for plot/ending details
  const requestsEnding = /\b(explain.*ending|ending.*explain|how\s+(does|did)\s+it\s+end|what\s+happens?\s+(at|in)\s+(the\s+)?end)\b/i.test(message);
  const requestsFullPlot = /\b(explain\s+(the\s+)?plot|tell\s+me\s+(the\s+)?(whole\s+)?story|what\s+happens\s+in)\b/i.test(message);
  const explicitSpoilerRequest = /\bspoiler/i.test(message);

  return {
    isSpoilerSensitive: SPOILER_SENSITIVE_TOPICS.some(topic => lowerMessage.includes(topic)) || requestsEnding || requestsFullPlot,
    explicitSpoilerRequest: explicitSpoilerRequest || lowerMessage.includes('tell me anyway'),
    requestsEnding,
    requestsPlot: requestsFullPlot
  };
}

/**
 * Check if AI response might contain spoilers
 */
export function detectSpoilersInResponse(response) {
  const lowerResponse = response.toLowerCase();

  const indicators = SPOILER_INDICATORS.filter(indicator =>
    lowerResponse.includes(indicator)
  );

  return {
    hasPotentialSpoilers: indicators.length > 0,
    spoilerIndicators: indicators,
    severity: indicators.length > 3 ? 'high' : indicators.length > 1 ? 'medium' : 'low'
  };
}

/**
 * Generate spoiler warning text
 */
export function generateSpoilerWarning(mediaTitle = null) {
  const title = mediaTitle ? ` for "${mediaTitle}"` : '';
  return `⚠️ **Spoiler Warning**${title}\n\nThis response may contain plot details. Would you like me to continue? Reply "yes" for full details or "no" for a spoiler-free summary.`;
}

/**
 * Generate a spoiler-safe version of content
 */
export function generateSpoilerFreeVersion(content, mediaTitle = null) {
  // This would ideally use the LLM to generate, but we provide guidance
  return {
    safePrompt: `Provide a spoiler-free summary. Focus on:
- Genre and tone
- Basic premise (first act setup only)
- Why someone might enjoy it
- Similar movies/shows to compare
Do NOT reveal: plot twists, character deaths, endings, major reveals, or anything beyond the first 20% of the story.`,
    warningText: `I can tell you more about this${mediaTitle ? ` ("${mediaTitle}")` : ''}, but it would involve spoilers. Would you like:\n1. A spoiler-free overview\n2. Full details (with spoilers)\n\nJust let me know!`
  };
}

/**
 * Add spoiler tags to potentially spoilery content
 */
export function wrapInSpoilerTag(content) {
  return `||${content}||`; // Discord-style spoiler syntax, can be rendered in frontend
}

/**
 * Instruction to add to system prompt for spoiler awareness
 */
export const SPOILER_INSTRUCTIONS = `
## SPOILER HANDLING RULES

1. **Default to Safe**: Never reveal plot twists, endings, or deaths unprompted
2. **First Response**: For plot/ending questions, offer both options:
   - Spoiler-free summary
   - Full details (with warning)
3. **Explicit Consent**: Only provide spoilers if user explicitly asks
4. **Warning Format**: Use "[SPOILER WARNING]" before any spoiler content
5. **Safe Descriptions**: You CAN discuss:
   - Genre, tone, and themes (without specifics)
   - General critical reception
   - Cast and crew
   - Release info and awards
   - "What it's about" without plot details
`;

/**
 * Check conversation history for spoiler consent
 */
export function checkSpoilerConsent(conversationHistory, mediaTitle = null) {
  if (!conversationHistory?.length) return false;

  // Look for explicit consent in recent messages
  const recentMessages = conversationHistory.slice(-5);

  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      const content = msg.content?.toLowerCase() || '';

      // Check for consent phrases
      if (content.includes('yes') && (
        content.includes('spoiler') ||
        content.includes('tell me') ||
        content.includes('go ahead') ||
        content.includes('full detail')
      )) {
        return true;
      }

      // Check for explicit spoiler request
      if (content.includes('spoil') && (
        content.includes('please') ||
        content.includes('okay') ||
        content.includes('fine')
      )) {
        return true;
      }

      // Simple yes after spoiler warning
      if (content.trim() === 'yes' || content.trim() === 'yes please') {
        // Check if previous assistant message was a spoiler warning
        const prevIndex = conversationHistory.indexOf(msg) - 1;
        if (prevIndex >= 0) {
          const prevMsg = conversationHistory[prevIndex];
          if (prevMsg.role === 'assistant' &&
              (prevMsg.content?.includes('spoiler') || prevMsg.content?.includes('Spoiler'))) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Get appropriate response mode based on spoiler analysis
 */
export function getSpoilerResponseMode(userMessage, conversationHistory) {
  const spoilerRequest = detectSpoilerRequest(userMessage);
  const hasConsent = checkSpoilerConsent(conversationHistory);

  if (!spoilerRequest.isSpoilerSensitive) {
    return { mode: 'normal', addWarning: false };
  }

  if (spoilerRequest.explicitSpoilerRequest || hasConsent) {
    return { mode: 'spoiler_allowed', addWarning: true };
  }

  return { mode: 'ask_consent', addWarning: false };
}
