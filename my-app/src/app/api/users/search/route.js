import { NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';

// GET /api/users/search - Search users by username or full name
export const GET = withOptionalAuth(async (request, { user }) => {
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

    const filter = {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    };

    if (user) {
      // Exclude current user
      // Also exclude users who blocked the current user
      // And exclude users that the current user has blocked
      const userDoc = await User.findById(user._id).select('blockedUsers');
      const blockedByMe = userDoc?.blockedUsers || [];
      
      filter.$and = [
        { _id: { $nin: [...blockedByMe, user._id] } },
        { blockedUsers: { $ne: user._id } }
      ];
    }

    // Search users by username or full name
    const users = await User.find(filter)
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
