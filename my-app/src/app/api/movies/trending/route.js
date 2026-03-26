import { NextResponse } from 'next/server'
import { getTrending } from '@/lib/services/tmdb.service.js'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const mediaType = searchParams.get('mediaType') || 'all'
    const timeWindow = searchParams.get('timeWindow') || 'week'
    
    const content = await getTrending(mediaType, timeWindow)

    return NextResponse.json({
      success: true,
      data: content,
    })
  } catch (error) {
    console.error('getTrending error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch trending content',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
