import { NextResponse } from 'next/server'
import { getTopRated } from '@/lib/services/tmdb.service.js'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    
    const data = await getTopRated(page)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('getTopRated error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch top rated movies',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
