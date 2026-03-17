import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';

// GET /api/messages/conversations/[conversationId] - Get conversation details
export const GET = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();

    const { conversationId } = await params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: user._id
    })
      .populate('participants', 'username fullName avatar blockedUsers')
      .lean();

    if (!conversation) {
      return NextResponse.json(
        { success: false, message: 'Conversation not found' },
        { status: 404 }
      );
    }

    let otherParticipant = conversation.participants.find(
      p => p._id.toString() !== user._id.toString()
    );

    if (otherParticipant && otherParticipant.blockedUsers && otherParticipant.blockedUsers.some(id => id.toString() === user._id.toString())) {
      otherParticipant = {
        _id: otherParticipant._id,
        username: 'User',
        fullName: 'User',
        avatar: null,
        isBlockedByThem: true
      };
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        participant: otherParticipant
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
});

// DELETE /api/messages/conversations/[conversationId] - Delete conversation
export const DELETE = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();

    const { conversationId } = await params;

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

    // Mark all existing messages as deleted for this user
    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedFor: user._id } }
    );

    // Hide the conversation from the user's inbox
    if (!conversation.deletedFor) {
      conversation.deletedFor = [];
    }
    if (!conversation.deletedFor.includes(user._id)) {
      conversation.deletedFor.push(user._id);
      await conversation.save();
    }

    // Check if the conversation is deleted for everyone, if so fully delete it
    const allParticipantsDeleted = conversation.participants.every(
      pId => conversation.deletedFor.includes(pId) || 
            conversation.deletedFor.some(df => df.toString() === pId.toString())
    );

    if (allParticipantsDeleted) {
      await Message.deleteMany({ conversation: conversationId });
      await Conversation.findByIdAndDelete(conversationId);
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
});

// PATCH /api/messages/conversations/[conversationId] - Accept message request
export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();

    const { conversationId } = await params;
    const { action } = await request.json();

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

    if (action === 'accept') {
      // Move from requests to messages
      conversation.isRequest = false;
      conversation.requestFor = null;
      await conversation.save();

      return NextResponse.json({
        success: true,
        message: 'Message request accepted'
      });
    } else if (action === 'decline') {
      // Delete conversation and messages
      await Message.deleteMany({ conversation: conversationId });
      await Conversation.findByIdAndDelete(conversationId);

      return NextResponse.json({
        success: true,
        message: 'Message request declined'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update conversation' },
      { status: 500 }
    );
  }
});
