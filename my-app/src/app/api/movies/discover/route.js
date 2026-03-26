import { NextResponse } from 'next/server'
import { discoverMovies } from '@/lib/services/tmdb.service.js'

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    
    const filters = {
      page: parseInt(searchParams.get('page') || '1'),
      genres: searchParams.get('genres'),
      year: searchParams.get('year'),
      language: searchParams.get('language'),
      sortBy: searchParams.get('sortBy'),
      minRating: searchParams.get('minRating'),
      maxRating: searchParams.get('maxRating'),
    }

    const data = await discoverMovies(filters)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('discoverMovies error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to discover movies',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
