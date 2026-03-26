import { NextResponse } from 'next/server'
import { getGenres } from '@/lib/services/tmdb.service.js'

export async function GET(request) {
  try {
    const genres = await getGenres()

    return NextResponse.json({
      success: true,
      data: genres,
    })
  } catch (error) {
    console.error('getGenres error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch genres',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
