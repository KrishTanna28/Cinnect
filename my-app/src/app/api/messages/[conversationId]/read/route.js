import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import { emitUnreadCountUpdate } from '@/lib/utils/messages';
import { emitMessagesRead, emitConversationUpdate } from '@/lib/socketServer';

// PATCH /api/messages/[conversationId]/read - Mark messages as read
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();
    const { conversationId } = await params;

    // Verify user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: user._id
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: user._id },
        'readBy.user': { $ne: user._id }
      },
      {
        $push: {
          readBy: {
            user: user._id,
            readAt: new Date()
          }
        }
      }
    );

    // Reset unread count for this user
    const unreadCount = conversation.unreadCount || new Map();
    unreadCount.set(user._id.toString(), 0);
    conversation.unreadCount = unreadCount;
    await conversation.save();

    // Emit read receipt via socket - fire and forget (non-blocking)
    const otherParticipant = conversation.participants.find(
      p => p.toString() !== user._id.toString()
    );
    const otherParticipantIdStr = otherParticipant.toString();
    const userIdStr = user._id.toString();

    // Fire off socket emissions without awaiting
    Promise.all([
      emitMessagesRead(otherParticipantIdStr, { conversationId, userId: user._id }),
      emitMessagesRead(userIdStr, { conversationId, userId: user._id }),
      Conversation.findById(conversationId)
        .populate('participants', 'username fullName avatar')
        .populate('lastMessage')
        .lean()
        .then(populatedConv => emitConversationUpdate(userIdStr, populatedConv)),
      emitUnreadCountUpdate(null, userIdStr),
    ]).catch(err => console.error('Socket emit error:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages read:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to mark messages read' },
      { status: 500 }
    );
  }
});
