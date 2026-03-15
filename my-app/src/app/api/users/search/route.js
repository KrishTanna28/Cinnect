import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';

// GET /api/users/search - Search users by username or full name
export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        users: []
      });
    }

    // Search users by username or full name
    const users = await User.find({
      _id: { $ne: user._id }, // Exclude current user
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    })
      .select('username fullName avatar')
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to search users' },
      { status: 500 }
    );
  }
});
