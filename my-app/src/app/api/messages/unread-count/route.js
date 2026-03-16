import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Conversation from '@/lib/models/Conversation';

export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB();
    
    const allUserConvs = await Conversation.find({ participants: user._id }).select('unreadCount').lean();
    
    let totalUnread = 0;
    for (const conv of allUserConvs) {
      const count = conv.unreadCount?.[user._id.toString()] || 0;
      if (count > 0) totalUnread++;
    }

    return NextResponse.json({ success: true, count: totalUnread });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch' }, { status: 500 });
  }
});