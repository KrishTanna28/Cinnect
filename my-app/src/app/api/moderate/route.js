import { NextResponse } from 'next/server'
import { runModerationPipeline, moderateText } from '@/lib/services/moderation.service.js'
import { withAuth } from '@/lib/middleware/withAuth.js'

/**
 * POST /api/moderate
 * Runs the full content moderation pipeline.
 * Body: { text?: string, imageUrls?: string[], videoUrls?: string[] }
 * Returns: { adult_content: boolean, moderation: object }
 */
export const POST = withAuth(async (request) => {
  try {
    const { text, imageUrls, videoUrls } = await request.json()

    if (!text && (!imageUrls || imageUrls.length === 0) && (!videoUrls || videoUrls.length === 0)) {
      return NextResponse.json(
        { success: false, message: 'At least one of text, imageUrls, or videoUrls is required' },
        { status: 400 }
      )
    }

    const result = await runModerationPipeline({ text, imageUrls, videoUrls })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Moderation pipeline error:', error)
    return NextResponse.json(
      { success: false, message: 'Moderation service error' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/moderate/text
 * Quick text-only moderation endpoint (for comments/replies).
 * Body: { text: string }
 */
export async function PUT(request) {
  try {
    const { text } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Text is required' },
        { status: 400 }
      )
    }

    const result = await moderateText(text)

    return NextResponse.json({
      success: true,
      data: {
        adult_content: result.isAdult,
        moderation: {
          text_score: result.score,
          labels: result.labels
        }
      }
    })
  } catch (error) {
    console.error('Text moderation error:', error)
    return NextResponse.json(
      { success: false, message: 'Text moderation service error' },
      { status: 500 }
    )
  }
}
