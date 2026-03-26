import { NextResponse } from 'next/server'
import { getAiringTodayTV } from '@/lib/services/tmdb.service.js'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    
    const data = await getAiringTodayTV(page)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('getAiringTodayTV error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch airing today TV shows',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
