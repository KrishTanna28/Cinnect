import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Message from '@/lib/models/Message';

// DELETE /api/messages/[conversationId]/[messageId] - Delete message for user
export const DELETE = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();

    const { conversationId, messageId } = await params;

    const message = await Message.findOne({
      _id: messageId,
      conversation: conversationId
    });

    if (!message) {
      return NextResponse.json(
        { success: false, message: 'Message not found' },
        { status: 404 }
      );
    }

    // Add user to deletedFor array (soft delete)
    if (!message.deletedFor.includes(user._id)) {
      message.deletedFor.push(user._id);
      await message.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete message' },
      { status: 500 }
    );
  }
});
