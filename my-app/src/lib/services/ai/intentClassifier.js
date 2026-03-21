/**
 * Cinnect AI Assistant - Intent Classification Module
 * Classifies user intent to route to appropriate handlers and context
 */

// Intent categories
export const INTENTS = {
  DISCOVERY: 'discovery',
  PERSONALIZATION: 'personalization',
  INFORMATION: 'information',
  COMMUNITY: 'community',
  ACTION: 'action',
  GUIDANCE: 'guidance',
  TRENDING: 'trending',
  EXPLANATION: 'explanation',
  GREETING: 'greeting',
  OUT_OF_DOMAIN: 'out_of_domain'
};

// Action types for ACTION intent
export const ACTION_TYPES = {
  ADD_WATCHLIST: 'add_watchlist',
  REMOVE_WATCHLIST: 'remove_watchlist',
  ADD_FAVORITE: 'add_favorite',
  REMOVE_FAVORITE: 'remove_favorite',
  MARK_WATCHED: 'mark_watched',
  RATE: 'rate',
  WRITE_REVIEW: 'write_review',
  JOIN_COMMUNITY: 'join_community',
  FOLLOW_USER: 'follow_user'
};

// Pattern-based pre-classification for common intents
const INTENT_PATTERNS = {
  [INTENTS.GREETING]: [
    /^(hi|hello|hey|howdy|greetings|good\s*(morning|afternoon|evening))/i,
    /^(what'?s?\s*up|sup|yo)\b/i
  ],
  [INTENTS.TRENDING]: [
    /\b(trending|popular|hot|buzzing|viral|everyone.*(watch|talk))\b/i,
    /\bwhat'?s?\s*(new|happening|hot)\b/i,
    /\btop\s*\d*\s*(movies?|shows?|series)\b/i
  ],
  [INTENTS.PERSONALIZATION]: [
    /\b(recommend|suggest|for\s+me|my\s+taste|based\s+on|similar\s+to\s+what\s+i)\b/i,
    /\b(i\s+(like|love|enjoy|prefer)|my\s+favorite)\b/i,
    /\bwhat\s+should\s+i\s+watch\b/i
  ],
  [INTENTS.ACTION]: [
    /\b(add|put|save|remove|delete)\s+(to|from|on)?\s*(my\s*)?(watchlist|favorites?|list)\b/i,
    /\b(mark|set)\s+(as\s*)?(watched|seen|complete)\b/i,
    /\b(rate|give|score)\s+(\d|it|this|that)\b/i,
    /\b(write|leave|post)\s+(a\s*)?(review|comment)\b/i,
    /\b(join|leave)\s+(the\s*)?(community|group)\b/i,
    /\b(follow|unfollow)\s+/i
  ],
  [INTENTS.GUIDANCE]: [
    /\bhow\s+(do|can|to)\s+(i|you)\b/i,
    /\bwhere\s+(is|can|do)\b/i,
    /\b(help|guide|explain|show)\s*(me)?\s*(how|where|the\s+way)\b/i,
    /\b(what|where)\s+is\s+(the|my)\s+(watchlist|profile|settings|leaderboard)\b/i,
    /\b(navigate|find|access|use)\s+(the)?\s*(feature|page|section)\b/i
  ],
  [INTENTS.COMMUNITY]: [
    /\b(what\s+)?(people|users|fans|community|others)\s*(think|say|feel|discuss|review)\b/i,
    /\b(reviews?|opinions?|discussions?|posts?)\s+(about|on|for)\b/i,
    /\b(community|group|fan)\s*(page|posts?|discussions?)\b/i,
    /\bleaderboard|top\s+users?\b/i
  ],
  [INTENTS.EXPLANATION]: [
    /\b(explain\s+(the\s+)?(ending|plot)|meaning\s+of|what\s+happens\s+(at|in)\s+(the\s+)?end)\b/i,
    /\b(why\s+did.*die|how\s+did.*end|what\s+was\s+the\s+twist)\b/i,
    /\bending\s+explained\b/i
  ],
  [INTENTS.INFORMATION]: [
    /\b(who\s+(is|was|played|directed)|tell\s+me\s+about|info|information)\b/i,
    /\b(cast|director|release|runtime|rating|genre|awards?)\b/i,
    /\b(when\s+(did|was|is)|where\s+to\s+watch|streaming)\b/i,
    /\b(worth\s*(it|watching)?|is\s+it\s+good|any\s+good|should\s+i\s+watch)\b/i,
    /\b(review|opinion|thoughts|how\s+is\s+it)\b/i
  ],
  [INTENTS.OUT_OF_DOMAIN]: [
    /\b(politics|religion|sports\s+score|weather|stock|crypto|code|programming|recipe|health|medical)\b/i,
    /\b(help\s+me\s+with\s+(math|homework|essay|code))\b/i
  ]
};

// Entity extraction patterns
const ENTITY_PATTERNS = {
  mediaTitle: [
    /"([^"]+)"/,  // Quoted titles
    /'([^']+)'/,  // Single quoted
    /(?:movie|film|show|series)\s+(?:called|named|titled)\s+["']?([^"']+?)["']?(?:\s|$|\.)/i
  ],
  rating: /\b(\d+(?:\.\d)?)\s*(?:\/\s*10|out\s+of\s+10|stars?)?\b/i,
  year: /\b(19\d{2}|20[0-2]\d)\b/
};

// Spoiler-sensitive topics - only explicit spoiler requests
const SPOILER_KEYWORDS = [
  'ending explained', 'explain ending', 'what happens at the end',
  'who dies', 'death scene', 'plot twist', 'twist ending',
  'reveal', 'turns out', 'spoiler'
];

/**
 * Classify user intent using pattern matching + optional LLM refinement
 */
export function classifyIntent(message) {
  const lowerMessage = message.toLowerCase().trim();

  // Default classification
  const classification = {
    intent: INTENTS.DISCOVERY,  // Default to discovery
    confidence: 0.5,
    entities: {},
    requiresSpoilerCare: false,
    requiresUserContext: false,
    actionType: null
  };

  // Check patterns in priority order
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        classification.intent = intent;
        classification.confidence = 0.8;
        break;
      }
    }
    if (classification.confidence > 0.5) break;
  }

  // Extract entities
  classification.entities = extractEntities(message);

  // Check for spoiler sensitivity
  classification.requiresSpoilerCare = SPOILER_KEYWORDS.some(
    keyword => lowerMessage.includes(keyword)
  );

  // Determine if user context would help
  classification.requiresUserContext = [
    INTENTS.PERSONALIZATION,
    INTENTS.ACTION,
    INTENTS.DISCOVERY
  ].includes(classification.intent);

  // Extract action type if action intent
  if (classification.intent === INTENTS.ACTION) {
    classification.actionType = extractActionType(lowerMessage);
  }

  return classification;
}

/**
 * Extract named entities from message
 */
function extractEntities(message) {
  const entities = {};

  // Try to extract media title
  for (const pattern of ENTITY_PATTERNS.mediaTitle) {
    const match = message.match(pattern);
    if (match && match[1]) {
      entities.mediaTitle = match[1].trim();
      break;
    }
  }

  // Extract rating if present
  const ratingMatch = message.match(ENTITY_PATTERNS.rating);
  if (ratingMatch) {
    entities.rating = parseFloat(ratingMatch[1]);
  }

  // Extract year if present
  const yearMatch = message.match(ENTITY_PATTERNS.year);
  if (yearMatch) {
    entities.year = yearMatch[1];
  }

  // Try to determine media type
  if (/\b(movie|film)\b/i.test(message)) {
    entities.mediaType = 'movie';
  } else if (/\b(show|series|tv|television)\b/i.test(message)) {
    entities.mediaType = 'tv';
  } else if (/\b(actor|actress|director|person)\b/i.test(message)) {
    entities.mediaType = 'person';
  }

  return entities;
}

/**
 * Extract specific action type from message
 */
function extractActionType(message) {
  if (/\b(add|put|save).*(watchlist|list)\b/i.test(message)) {
    return ACTION_TYPES.ADD_WATCHLIST;
  }
  if (/\b(remove|delete).*(watchlist|list)\b/i.test(message)) {
    return ACTION_TYPES.REMOVE_WATCHLIST;
  }
  if (/\b(add|mark).*(favorite|fav)\b/i.test(message)) {
    return ACTION_TYPES.ADD_FAVORITE;
  }
  if (/\b(remove).*(favorite|fav)\b/i.test(message)) {
    return ACTION_TYPES.REMOVE_FAVORITE;
  }
  if (/\b(mark|set).*(watched|seen|complete)\b/i.test(message)) {
    return ACTION_TYPES.MARK_WATCHED;
  }
  if (/\b(rate|score|give.*\d)\b/i.test(message)) {
    return ACTION_TYPES.RATE;
  }
  if (/\b(review|write.*review)\b/i.test(message)) {
    return ACTION_TYPES.WRITE_REVIEW;
  }
  if (/\bjoin.*(community|group)\b/i.test(message)) {
    return ACTION_TYPES.JOIN_COMMUNITY;
  }
  if (/\bfollow\b/i.test(message)) {
    return ACTION_TYPES.FOLLOW_USER;
  }
  return null;
}

/**
 * Generate LLM prompt for complex intent classification
 * Use this when pattern matching confidence is low
 */
export function generateIntentPrompt(message) {
  return `Classify the user's intent for a movie/TV platform assistant.

User message: "${message}"

Respond with JSON only:
{
  "intent": "discovery|personalization|information|community|action|guidance|trending|explanation|greeting|out_of_domain",
  "confidence": 0.0-1.0,
  "mediaTitle": "extracted title or null",
  "mediaType": "movie|tv|person|null",
  "actionType": "add_watchlist|remove_watchlist|add_favorite|rate|write_review|null",
  "topic": "main subject",
  "requiresSpoilerCare": true|false
}`;
}
