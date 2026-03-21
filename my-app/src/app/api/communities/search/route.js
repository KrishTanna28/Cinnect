import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import connectDB from '@/lib/config/database.js'
import { buildFuzzyMongoQuery } from '@/lib/utils/fuzzySearch.js'

// GET /api/communities/search - Search communities
export async function GET(request) {
  await connectDB()
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: true,
        communities: []
      })
    }

    // Use fuzzy matching to tolerate typos / misspellings
    const fuzzyQuery = buildFuzzyMongoQuery(query, ['name', 'description'])

    const communities = await Community.find({
      isActive: true,
      ...fuzzyQuery
    })
      .select('name slug icon description memberCount category')
      .sort({ memberCount: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      communities
    })
  } catch (error) {
    console.error('Search communities error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to search communities'
      },
      { status: 500 }
    )
  }
}
