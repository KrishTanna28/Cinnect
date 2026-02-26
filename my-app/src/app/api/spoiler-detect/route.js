import { NextResponse } from 'next/server'

const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli'

/**
 * POST /api/spoiler-detect
 * Uses facebook/bart-large-mnli zero-shot classification to detect spoilers.
 * Body: { text: string }
 * Returns: { isSpoiler: boolean, confidence: number, scores: object }
 */
export async function POST(request) {
  try {
    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Text is required' },
        { status: 400 }
      )
    }

    const apiToken = process.env.HUGGINGFACE_API_TOKEN
    if (!apiToken) {
      console.error('HUGGINGFACE_API_TOKEN is not set')
      return NextResponse.json(
        { success: false, message: 'Spoiler detection service not configured' },
        { status: 503 }
      )
    }

    // Call HuggingFace Inference API with zero-shot classification
    const response = await fetch(HUGGINGFACE_API_URL, {
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
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HuggingFace API error:', response.status, errorText)

      // If model is loading, return a retry hint
      if (response.status === 503) {
        return NextResponse.json({
          success: false,
          message: 'Model is loading, please try again in a few seconds',
          retryAfter: 20
        }, { status: 503 })
      }

      return NextResponse.json(
        { success: false, message: 'Spoiler detection service unavailable' },
        { status: 502 }
      )
    }

    const raw = await response.json()
    console.log('[Spoiler Detection] Raw API response:', JSON.stringify(raw))

    // Parse response — handle every known HuggingFace format:
    //   Old zero-shot:  { sequence, labels: [...], scores: [...] }
    //   Router flat:    { label: "...", score: 0.97 }
    //   Router array:   [{ label, score }, ...]
    //   Nested array:   [[{ label, score }, ...]]
    let spoilerScore = 0
    let noSpoilerScore = 0

    // Unwrap nested arrays
    let parsed = raw
    while (Array.isArray(parsed)) {
      parsed = parsed[0]
    }

    if (parsed?.labels && parsed?.scores) {
      // Old zero-shot format: { labels: [...], scores: [...] }
      const sIdx = parsed.labels.findIndex(l =>
        l.toLowerCase().includes('spoiler') && !l.toLowerCase().includes('without')
      )
      const nIdx = parsed.labels.findIndex(l =>
        l.toLowerCase().includes('without spoiler') || l.toLowerCase().includes('general opinion')
      )
      spoilerScore = sIdx !== -1 ? parsed.scores[sIdx] : 0
      noSpoilerScore = nIdx !== -1 ? parsed.scores[nIdx] : 0
    } else if (parsed?.label && typeof parsed?.score === 'number') {
      // Flat format: { label: "...", score: 0.97 }
      const lbl = parsed.label.toLowerCase()
      if (lbl.includes('spoiler') && !lbl.includes('without')) {
        spoilerScore = parsed.score
        noSpoilerScore = 1 - parsed.score
      } else {
        noSpoilerScore = parsed.score
        spoilerScore = 1 - parsed.score
      }
    } else {
      console.error('[Spoiler Detection] Unrecognized response format:', JSON.stringify(raw))
    }

    // Threshold: if spoiler confidence > 0.6, classify as spoiler
    const isSpoiler = spoilerScore > 0.6

    console.log(`[Spoiler Detection] spoiler=${(spoilerScore * 100).toFixed(1)}% | notSpoiler=${(noSpoilerScore * 100).toFixed(1)}% | flagged=${isSpoiler}`)

    return NextResponse.json({
      success: true,
      data: {
        isSpoiler,
        confidence: spoilerScore,
        scores: {
          spoiler: spoilerScore,
          notSpoiler: noSpoilerScore
        }
      }
    })
  } catch (error) {
    console.error('Spoiler detection error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to detect spoiler' },
      { status: 500 }
    )
  }
}
