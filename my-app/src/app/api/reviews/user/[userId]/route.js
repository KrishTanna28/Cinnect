import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import connectDB from '@/lib/config/database.js'

// GET /api/reviews/user/[userId] - Get reviews by user ID
export async function GET(request, { params }) {
  
  await connectDB()
try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 10
    const page = parseInt(searchParams.get('page')) || 1
    const skip = (page - 1) * limit

    const reviews = await Review.find({ user: userId })
      .populate('user', 'username avatar fullName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)

    const total = await Review.countDocuments({ user: userId })

    return NextResponse.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    })
  } catch (error) {
    console.error('Get user reviews error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get user reviews'
      },
      { status: 500 }
    )
  }
}
