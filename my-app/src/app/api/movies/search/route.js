import { NextResponse } from 'next/server'
import { searchMovies } from '@/lib/services/tmdb.service.js'
import { generateQueryVariants } from '@/lib/utils/fuzzySearch.js'

const FUZZY_FALLBACK_THRESHOLD = 3

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const query = searchParams.get('query')
    const page = parseInt(searchParams.get('page') || '1')

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: 'Search query is required',
        },
        { status: 400 }
      )
    }

    const data = await searchMovies(query, page)

    // If results are sparse on page 1, try fuzzy variants
    if (page === 1 && (data.results?.length || 0) < FUZZY_FALLBACK_THRESHOLD) {
      const variants = generateQueryVariants(query).slice(1)
      for (const variant of variants) {
        try {
          const variantData = await searchMovies(variant, 1)
          if (variantData.results?.length) {
            const existingIds = new Set(data.results.map(r => r.id))
            for (const item of variantData.results) {
              if (!existingIds.has(item.id)) {
                data.results.push(item)
                existingIds.add(item.id)
              }
            }
            data.totalResults = data.results.length
            if (data.results.length >= FUZZY_FALLBACK_THRESHOLD) break
          }
        } catch {
          // variant failed, continue
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('searchMovies error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to search movies',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
