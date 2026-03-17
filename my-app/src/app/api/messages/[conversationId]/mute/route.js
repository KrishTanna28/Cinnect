import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Conversation from '@/lib/models/Conversation';

export const POST = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();
    const { conversationId } = await params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: user._id
    });

    if (!conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    if (!conversation.mutedBy) {
      conversation.mutedBy = [];
    }

    const isMuted = conversation.mutedBy.some(uId => uId.toString() === user._id.toString());

    if (isMuted) {
      conversation.mutedBy = conversation.mutedBy.filter(uId => uId.toString() !== user._id.toString());
    } else {
      conversation.mutedBy.push(user._id);
    }

    await conversation.save();

    return NextResponse.json({ success: true, isMuted: !isMuted });
  } catch (error) {
    console.error('Error toggling mute:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
});