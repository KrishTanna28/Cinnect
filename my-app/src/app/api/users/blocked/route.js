import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';

export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB();
    
    // Fetch the user's blocked list and populate basic details
    const currentUser = await User.findById(user._id).populate({
      path: 'blockedUsers',
      select: 'username fullName avatar'
    }).lean();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      users: currentUser.blockedUsers || []
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blocked users' },
      { status: 500 }
    );
  }
});