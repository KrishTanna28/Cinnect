import { NextResponse } from 'next/server'
import { getLeaderboardPage } from '@/lib/utils/ranking.js'
import connectDB from '@/lib/config/database.js'

export async function GET(request) {
  
  await connectDB()
try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const leaderboard = await getLeaderboardPage({ page, limit })

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
