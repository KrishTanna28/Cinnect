import { NextResponse } from 'next/server'
import { getPopularTV } from '@/lib/services/tmdb.service.js'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    
    const data = await getPopularTV(page)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('getPopularTV error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch popular TV shows',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
