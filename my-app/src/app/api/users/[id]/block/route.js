import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';

export const POST = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();
    const { id } = await params;

    if (id === user._id.toString()) {
      return NextResponse.json({ success: false, message: 'Cannot block yourself' }, { status: 400 });
    }

    const currentUser = await User.findById(user._id);
    const targetUser = await User.findById(id);

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const isBlocked = currentUser.blockedUsers?.some(uId => uId.toString() === id);

    if (isBlocked) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(uId => uId.toString() !== id);
      currentUser.markModified('blockedUsers');
    } else {
      if (!currentUser.blockedUsers) currentUser.blockedUsers = [];
      currentUser.blockedUsers.push(id);
      currentUser.markModified('blockedUsers');

      currentUser.following = currentUser.following.filter(uId => uId.toString() !== id);
      currentUser.followers = currentUser.followers.filter(uId => uId.toString() !== id);
      currentUser.markModified('following');
      currentUser.markModified('followers');

      targetUser.following = targetUser.following.filter(uId => uId.toString() !== user._id.toString());
      targetUser.followers = targetUser.followers.filter(uId => uId.toString() !== user._id.toString());
      targetUser.markModified('following');
      targetUser.markModified('followers');
    }
    
    await currentUser.save();

    return NextResponse.json({ success: true, isBlocked: !isBlocked });
  } catch (error) {
    console.error('Error in block user:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
});