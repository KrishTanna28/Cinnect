/**
 * Cinnect AI Assistant API Route
 * Enhanced domain-specialized movie & platform assistant with ML-based content safety
 */

import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/middleware/withAuth';

// Import AI modules
import { SYSTEM_PROMPT } from '@/lib/services/ai/systemPrompt';
import { classifyIntent, INTENTS } from '@/lib/services/ai/intentClassifier';
import { buildContext } from '@/lib/services/ai/contextBuilder';
import { tools, executeTool } from '@/lib/services/ai/tools';
import { getSpoilerResponseMode, generateSpoilerWarning, SPOILER_INSTRUCTIONS } from '@/lib/services/ai/spoilerHandler';
import { checkContentSafety, getUnsafeContentResponse, checkResponseSafety } from '@/lib/services/ai/contentSafety';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Full system prompt with spoiler handling
const FULL_SYSTEM_PROMPT = `${SYSTEM_PROMPT}\n${SPOILER_INSTRUCTIONS}`;

/**
 * Extract text from Gemini response parts
 */
function extractText(result) {
  const parts = result.candidates?.[0]?.content?.parts || [];
  return parts
    .filter(p => typeof p.text === 'string')
    .map(p => p.text)
    .join('');
}

/**
 * Handle out-of-domain queries
 */
function getOutOfDomainResponse() {
  return "I'm C.A.S.T, your cinematic assistant! I specialize in movies, TV shows, and everything entertainment-related on Cinnect. Is there something about films, shows, or our platform I can help you with?";
}

/**
 * Handle greeting messages
 */
function getGreetingResponse(username = null) {
  const greetings = [
    `Hey${username ? ` ${username}` : ''}! I'm C.A.S.T, your cinematic companion. What are we watching today?`,
    `Hello${username ? ` ${username}` : ''}! Ready to discover something amazing to watch?`,
    `Hi there${username ? ` ${username}` : ''}! I'm here to help you find your next favorite movie or show. What are you in the mood for?`
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Build dynamic system message based on classification
 */
function buildSystemMessage(classification, context, spoilerMode, userContext) {
  let systemMessage = FULL_SYSTEM_PROMPT;

  // Add user personalization context if available
  if (userContext) {
    systemMessage += `\n\n## CURRENT USER
Username: ${userContext.username || 'Guest'}
Level: ${userContext.level || 1}
${userContext.favoriteGenres?.length ? `Favorite Genres: ${userContext.favoriteGenres.join(', ')}` : ''}
Use this to personalize responses when relevant.`;
  }

  // Add intent-specific instructions
  switch (classification.intent) {
    case INTENTS.PERSONALIZATION:
      systemMessage += '\n\n## ACTIVE MODE: PERSONALIZATION\nPrioritize recommendations based on the user context provided. Reference their preferences and history.';
      break;
    case INTENTS.ACTION:
      systemMessage += '\n\n## ACTIVE MODE: ACTION\nThe user wants to perform an action. Use the appropriate tool and confirm the result clearly.';
      break;
    case INTENTS.GUIDANCE:
      systemMessage += '\n\n## ACTIVE MODE: PLATFORM GUIDANCE\nProvide clear step-by-step instructions. Be specific about navigation and feature usage.';
      break;
    case INTENTS.EXPLANATION:
      if (spoilerMode.mode === 'ask_consent') {
        systemMessage += '\n\n## ACTIVE MODE: EXPLANATION (SPOILER CARE)\nUser is asking about plot/story. Offer both spoiler-free and detailed options before revealing anything.';
      } else if (spoilerMode.mode === 'spoiler_allowed') {
        systemMessage += '\n\n## ACTIVE MODE: EXPLANATION (SPOILERS OK)\nUser has consented to spoilers. Still prefix with [SPOILER WARNING] before revealing major plot points.';
      }
      break;
    case INTENTS.COMMUNITY:
      systemMessage += '\n\n## ACTIVE MODE: COMMUNITY INSIGHTS\nFocus on what the community thinks. Cite reviews and discussions when available.';
      break;
    case INTENTS.TRENDING:
      systemMessage += '\n\n## ACTIVE MODE: TRENDING\nShow what\'s popular right now. Include engagement metrics if available.';
      break;
  }

  // Add context if available
  if (context) {
    systemMessage += `\n\n## CONTEXT DATA${context}`;
  }

  return systemMessage;
}

/**
 * Main POST handler
 */
async function handler(request, context) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    const user = context?.user || null;
    const userId = user?._id?.toString() || null;
    const userContext = user ? {
      username: user.username,
      level: user.level,
      favoriteGenres: user.favoriteGenres
    } : null;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Step 1: Content safety check on user message using ML models
    const safetyCheck = await checkContentSafety(message);

    if (!safetyCheck.isSafe) {
      return NextResponse.json({
        message: getUnsafeContentResponse(safetyCheck),
        blocked: true,
        reason: safetyCheck.reason,
        intent: 'safety_violation'
      });
    }

    // Step 2: Classify intent
    const classification = classifyIntent(message);

    // Step 3: Handle special cases without LLM
    if (classification.intent === INTENTS.OUT_OF_DOMAIN) {
      return NextResponse.json({
        message: getOutOfDomainResponse(),
        intent: classification.intent
      });
    }

    if (classification.intent === INTENTS.GREETING) {
      return NextResponse.json({
        message: getGreetingResponse(user?.username),
        intent: classification.intent
      });
    }

    // Step 4: Check spoiler handling mode
    const spoilerMode = getSpoilerResponseMode(message, conversationHistory);

    // Step 5: Build context based on classification
    const contextData = await buildContext(classification, userId, message);

    // Step 6: Build system message
    const systemMessage = buildSystemMessage(classification, contextData, spoilerMode, userContext);

    // Step 7: Build conversation contents
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemMessage }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood! I'm C.A.S.T, ready to help with movies, shows, and Cinnect features." }]
      },
      // Add conversation history
      ...conversationHistory
        .filter(msg => msg.content?.trim())
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
      // Add current message
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    // Step 8: Call LLM with tools
    let result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        tools,
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    });

    // Step 9: Agentic tool loop
    const MAX_TOOL_ROUNDS = 5;
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      const parts = result.candidates?.[0]?.content?.parts || [];
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length === 0) break;

      // Execute all tool calls
      const toolResultParts = [];
      for (const fc of functionCalls) {
        const output = await executeTool(fc.functionCall.name, fc.functionCall.args, userId);
        toolResultParts.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: { result: output }
          }
        });
      }

      // Append model's tool call turn
      contents.push({
        role: 'model',
        parts: functionCalls.map(fc => ({ functionCall: fc.functionCall }))
      });

      // Append tool results
      contents.push({
        role: 'user',
        parts: toolResultParts
      });

      // Call model again
      result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          tools,
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      });
    }

    // Step 10: Extract final response
    let responseText = extractText(result);

    // Step 11: Handle spoiler consent prompting if model didn't handle it
    if (spoilerMode.mode === 'ask_consent' &&
        classification.intent === INTENTS.EXPLANATION &&
        !responseText.toLowerCase().includes('spoiler')) {
      const mediaTitle = classification.entities.mediaTitle;
      responseText = generateSpoilerWarning(mediaTitle);
    }

    // Step 12: Response safety check using ML models
    const hasConsent = spoilerMode.mode === 'spoiler_allowed';
    const responseSafety = await checkResponseSafety(responseText, hasConsent);

    // If response contains spoilers without consent, inject warning
    if (responseSafety.spoilerDetected && !hasConsent) {
      const mediaTitle = classification.entities.mediaTitle;
      responseText = generateSpoilerWarning(mediaTitle);
    }

    // If response failed safety checks (toxic content), use safe fallback
    if (!responseSafety.safe && !responseSafety.spoilerDetected) {
      responseText = "I apologize, but I couldn't generate an appropriate response. Could you rephrase your question?";
    }

    return NextResponse.json({
      message: responseText,
      intent: classification.intent,
      confidence: classification.confidence,
      safetyChecked: true
    });

  } catch (error) {
    console.error('AI Assistant Error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}

// Export with optional auth wrapper to get user context if available
export const POST = withOptionalAuth(handler);
