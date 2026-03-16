import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';

// GET /api/messages/conversations - Get all conversations for current user
export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all', 'messages', 'requests'

    let query = {
      participants: user._id,
      lastMessage: { $exists: true, $ne: null }
    };

    // Filter by type
    if (type === 'requests') {
      query.isRequest = true;
      query.requestFor = user._id;
    } else if (type === 'messages') {
      query.$or = [
        { isRequest: false },
        { isRequest: true, requestFor: { $ne: user._id } }
      ];
    }

    const conversations = await Conversation.find(query)
      .populate({
        path: 'participants',
        select: 'username fullName avatar'
      })
      .populate({
        path: 'lastMessage',
        select: 'content type mediaUrl sender createdAt reactions'
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format conversations
    const formattedConversations = conversations.map(conv => {
      const otherParticipant = conv.participants.find(
        p => p._id.toString() !== user._id.toString()
      );

      return {
        _id: conv._id,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        isRequest: conv.isRequest && conv.requestFor?.toString() === user._id.toString(),
        unreadCount: (conv.unreadCount && typeof conv.unreadCount.get === 'function') 
          ? conv.unreadCount.get(user._id.toString()) 
          : (conv.unreadCount?.[user._id.toString()] || 0),
        createdAt: conv.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
});

// POST /api/messages/conversations - Create or get existing conversation
export const POST = withAuth(async (request, { user }) => {
  try {
    await connectDB();

    const { recipientId } = await request.json();

    if (!recipientId) {
      return NextResponse.json(
        { success: false, message: 'Recipient ID is required' },
        { status: 400 }
      );
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return NextResponse.json(
        { success: false, message: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [user._id, recipientId] }
    })
      .populate('participants', 'username fullName avatar')
      .populate('lastMessage');

    if (conversation) {
      return NextResponse.json({
        success: true,
        conversation,
        isNew: false
      });
    }

    // Check if sender follows recipient
    const isFollowing = recipient.followers?.some(
      follower => follower.toString() === user._id.toString()
    );

    // Create new conversation
    conversation = await Conversation.create({
      participants: [user._id, recipientId],
      isRequest: !isFollowing,
      requestFor: !isFollowing ? recipientId : null,
      unreadCount: new Map()
    });

    conversation = await conversation.populate('participants', 'username fullName avatar');

    return NextResponse.json({
      success: true,
      conversation,
      isNew: true
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create conversation' },
      { status: 500 }
    );
  }
});
