import { NextResponse } from 'next/server'
import { searchMulti } from '@/lib/services/tmdb.service.js'
import { generateQueryVariants } from '@/lib/utils/fuzzySearch.js'

// Minimum results from the primary query before we try fuzzy variants
const FUZZY_FALLBACK_THRESHOLD = 3

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl
    const query = searchParams.get('query') || searchParams.get('q')
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

    // 1. Always try the original query first
    const data = await searchMulti(query, page)

    // 2. If results are sparse and we're on page 1, try fuzzy variants
    if (page === 1 && (data.results?.length || 0) < FUZZY_FALLBACK_THRESHOLD) {
      const variants = generateQueryVariants(query).slice(1) // skip original (already tried)

      for (const variant of variants) {
        try {
          const variantData = await searchMulti(variant, 1)
          if (variantData.results?.length) {
            // Merge new results, deduplicating by id+mediaType
            const existingKeys = new Set(
              data.results.map(r => `${r.mediaType}-${r.id}`)
            )
            for (const item of variantData.results) {
              const key = `${item.mediaType}-${item.id}`
              if (!existingKeys.has(key)) {
                data.results.push(item)
                existingKeys.add(key)
              }
            }
            // Update total count to reflect merged results
            data.totalResults = data.results.length

            // If we now have enough results, stop trying variants
            if (data.results.length >= FUZZY_FALLBACK_THRESHOLD) break
          }
        } catch {
          // Variant search failed — continue with next variant
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('searchMulti error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to search content',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'