import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import connectDB from '@/lib/config/database';
import Conversation from '@/lib/models/Conversation';
import Message from '@/lib/models/Message';
import { uploadChatMediaToCloudinary } from '@/lib/utils/cloudinaryHelper';

// GET /api/messages/[conversationId] - Get messages in a conversation
export const GET = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();

    const { conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

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

    // Get messages
    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: user._id }
    })
      .populate('sender', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

    // Emit read receipt via socket
    const io = globalThis._io;
    if (io) {
      const otherParticipant = conversation.participants.find(
        p => p.toString() !== user._id.toString()
      );
      io.to(`user:${otherParticipant}`).emit('messages:read', {
        conversationId,
        userId: user._id
      });

      // Notify our own other devices to update
      const populatedConv = await Conversation.findById(conversationId)
        .populate('participants', 'username fullName avatar')
        .populate('lastMessage')
        .lean();
        
      io.to(`user:${user._id}`).emit('conversation:update', populatedConv);
      io.to(`user:${user._id}`).emit('messages:read', {
        conversationId,
        userId: user._id
      });
    }

    const total = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: user._id }
    });

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
});

// POST /api/messages/[conversationId] - Send a message
export const POST = withAuth(async (request, { params, user }) => {
  try {
    await connectDB();

    const { conversationId } = await params;
    let { content, type = 'text', mediaUrl, fileData } = await request.json();

    if (!content && !mediaUrl && !fileData) {
      return NextResponse.json(
        { success: false, message: 'Message content or media is required' },    
        { status: 400 }
      );
    }

    if (fileData) {
      // Base64 file size check
      const base64Length = fileData.length - (fileData.indexOf(',') + 1);
      const padding = (fileData.charAt(fileData.length - 2) === '=') ? 2 : ((fileData.charAt(fileData.length - 1) === '=') ? 1 : 0);
      const sizeBytes = (base64Length * 0.75) - padding;
      
      if (sizeBytes > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { success: false, message: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Upload to Cloudinary
      const uploadedUrl = await uploadChatMediaToCloudinary(fileData, conversationId, type);
      mediaUrl = uploadedUrl;
    }

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

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: user._id,
      content: content || '',
      type,
      mediaUrl,
      readBy: [{
        user: user._id,
        readAt: new Date()
      }]
    });

    await message.populate('sender', 'username fullName avatar');

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();

    // Increment unread count for other participant
    const otherParticipant = conversation.participants.find(
      p => p.toString() !== user._id.toString()
    );
    const unreadCount = conversation.unreadCount || new Map();
    const currentCount = unreadCount.get(otherParticipant.toString()) || 0;
    unreadCount.set(otherParticipant.toString(), currentCount + 1);
    conversation.unreadCount = unreadCount;

    await conversation.save();

    // Emit message via WebSocket
    const io = globalThis._io;
    if (io) {
      const messagePayload = {
        conversationId,
        message: message.toObject()
      };

      io.to(`user:${otherParticipant}`).emit('message:new', messagePayload);
      io.to(`user:${user._id}`).emit('message:new', messagePayload); // Sync to sender's other devices

      // Also emit conversation update
      const populatedConv = await Conversation.findById(conversationId)
        .populate('participants', 'username fullName avatar')
        .populate('lastMessage')
        .lean();

      io.to(`user:${otherParticipant}`).emit('conversation:update', populatedConv);
      io.to(`user:${user._id}`).emit('conversation:update', populatedConv);
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send message' },
      { status: 500 }
    );
  }
});
