import { NextResponse } from 'next/server'
import { getLeaderboardPage } from '@/lib/utils/ranking.js'
import connectDB from '@/lib/config/database.js'
import { buildCacheKey, remember } from '@/lib/utils/cache.js'

export async function GET(request) {
try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const cacheKey = buildCacheKey('leaderboard', 'public', page, limit)
    const leaderboard = await remember(cacheKey, 300, async () => {
      await connectDB()
      return getLeaderboardPage({ page, limit })
    })

    return NextResponse.json({
      success: true,
      data: leaderboard
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch leaderboard'
      },
      { status: 500 }
    )
  }
}

export const revalidate = 300
