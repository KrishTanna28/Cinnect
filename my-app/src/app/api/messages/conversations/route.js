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

    const currentUserDoc = await User.findById(user._id).select('blockedUsers isPrivate').lean();
    const myBlockedUsers = currentUserDoc?.blockedUsers || [];
    const isUserPrivate = currentUserDoc?.isPrivate || false;

    // Filter by type
    if (type === 'requests') {
      query.isRequest = true;
      query.requestFor = user._id;
    } else if (type === 'messages') {
      if (isUserPrivate) {
        query.$or = [
          { isRequest: false },
          { isRequest: true, requestFor: { $ne: user._id } }
        ];
      }
      // If !isUserPrivate, public user sees all conversations (including requests to them) in the messages tab
    }
    
    // Do not show conversations that user has deleted
    query.deletedFor = { $ne: user._id };

    const conversations = await Conversation.find(query)
      .populate({
        path: 'participants',
        select: 'username fullName avatar blockedUsers'
      })
      .populate({
        path: 'lastMessage',
        select: 'content type mediaUrl sender createdAt reactions'
      })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format conversations
    const formattedConversations = conversations.map(conv => {
      let otherParticipant = conv.participants.find(
        p => p._id.toString() !== user._id.toString()
      );

      // Check if blocked by other participant or if we blocked them
      const isBlockedByThem = otherParticipant && otherParticipant.blockedUsers && otherParticipant.blockedUsers.some(id => id.toString() === user._id.toString());
      const didIBlockThem = otherParticipant && myBlockedUsers.some(id => id.toString() === otherParticipant._id.toString());

      if (isBlockedByThem || didIBlockThem) {
        // We still return the conversation but anonymize if the OTHER person blocked us.
        // We also want to let the frontend know the block status to disable inputs
        const anonymize = isBlockedByThem; // only hide their data if they blocked us
        otherParticipant = {
          _id: otherParticipant?._id || 'unknown',
          username: anonymize ? 'User' : otherParticipant?.username,
          fullName: anonymize ? 'User' : otherParticipant?.fullName,
          avatar: anonymize ? null : otherParticipant?.avatar,
          isBlockedByThem: isBlockedByThem,
          didIBlockThem: didIBlockThem
        };
      }

      return {
        _id: conv._id,
        participant: otherParticipant,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        isRequest: isUserPrivate ? (conv.isRequest && conv.requestFor?.toString() === user._id.toString()) : false,
        unreadCount: (conv.unreadCount && typeof conv.unreadCount.get === 'function') 
          ? conv.unreadCount.get(user._id.toString()) 
          : (conv.unreadCount?.[user._id.toString()] || 0),
        mutedBy: conv.mutedBy || [],
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

    const currentUserDoc = await User.findById(user._id).select('blockedUsers');
    const myBlockedUsers = currentUserDoc?.blockedUsers || [];
    const isBlockedByThem = recipient.blockedUsers?.some(id => id.toString() === user._id.toString());
    const didIBlockThem = myBlockedUsers.some(id => id.toString() === recipientId.toString());

    if (isBlockedByThem || didIBlockThem) {
      return NextResponse.json(
        { success: false, message: 'Not available' },
        { status: 403 }
      );
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [user._id, recipientId] }
    })
      .populate('participants', 'username fullName avatar')
      .populate('lastMessage');

    if (conversation) {
      let otherParticipant = conversation.participants.find(
        p => p._id.toString() !== user._id.toString()
      );
      
      return NextResponse.json({
        success: true,
        conversation: {
          _id: conversation._id,
          participant: otherParticipant,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          isRequest: currentUserDoc.isPrivate ? (conversation.isRequest && conversation.requestFor?.toString() === user._id.toString()) : false,
          unreadCount: (conversation.unreadCount && typeof conversation.unreadCount.get === 'function') 
            ? conversation.unreadCount.get(user._id.toString()) 
            : (conversation.unreadCount?.[user._id.toString()] || 0),
          mutedBy: conversation.mutedBy || [],
          createdAt: conversation.createdAt
        },
        isNew: false
      });
    }

    // Check if sender follows recipient
    const isFollowing = recipient.followers?.some(
      follower => follower.toString() === user._id.toString()
    );

    // Only make it a request if the recipient is private AND the sender doesn't follow the recipient
    const shouldBeRequest = recipient.isPrivate && !isFollowing;

    // Create new conversation
    conversation = await Conversation.create({
      participants: [user._id, recipientId],
      isRequest: shouldBeRequest,
      requestFor: shouldBeRequest ? recipientId : null,
      unreadCount: new Map()
    });

    conversation = await conversation.populate('participants', 'username fullName avatar');
    
    let newOtherParticipant = conversation.participants.find(
        p => p._id.toString() !== user._id.toString()
    );

    return NextResponse.json({
      success: true,
      conversation: {
          _id: conversation._id,
          participant: newOtherParticipant,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
          isRequest: false, // The newly created conversation is a request sent BY them, so it's not a request FOR them
          unreadCount: 0,
          mutedBy: [],
          createdAt: conversation.createdAt
      },
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
