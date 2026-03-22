import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Message from '@/lib/models/Message';
import Conversation from '@/lib/models/Conversation';
import { emitMessageReaction, emitConversationUpdate } from '@/lib/socketServer';

export const PATCH = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();
    const { conversationId, messageId } = await params;
    const { emoji } = await request.json();

    // Verify user is in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: user._id
    });

    if (!conversation) {
      return NextResponse.json({ success: false, message: 'Conversation not found' }, { status: 404 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    // Toggle reaction logic
    const existingReactionIndex = message.reactions?.findIndex(
      r => r.user.toString() === user._id.toString() && r.emoji === emoji
    ) ?? -1;

    if (!message.reactions) message.reactions = [];

    // If exact same reaction exists, remove it. Otherwise add or update.
    if (existingReactionIndex !== -1) {
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // remove old reaction from this user if they are replacing it
      const oldReactionIndex = message.reactions.findIndex(
        r => r.user.toString() === user._id.toString()
      );
      if (oldReactionIndex !== -1) {
        message.reactions.splice(oldReactionIndex, 1);
      }
      message.reactions.push({ user: user._id, emoji });
    }

    await message.save();

    // Update conversation last activity so the reaction jumps to top of chat list
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Broadcast reaction update (works on both local and Vercel via HTTP fallback)
    const reactionData = {
      conversationId,
      messageId,
      reactions: message.reactions
    };

    // Emit to all participants
    for (const participant of conversation.participants) {
      await emitMessageReaction(participant.toString(), reactionData);
      // Also emit a general update so the conversation list updates the preview
      await emitConversationUpdate(participant.toString(), null);
    }

    return NextResponse.json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json({ success: false, message: 'Failed to toggle reaction' }, { status: 500 });
  }
});
