import Conversation from '@/lib/models/Conversation';

export const emitUnreadCountUpdate = async (io, userIdStr) => {
  if (!io || !userIdStr) return;
  try {
    const allUserConvs = await Conversation.find({ participants: userIdStr }).select('unreadCount').lean();
    let totalUnread = 0;
    for (const conv of allUserConvs) {
      const count = conv.unreadCount?.[userIdStr] || 0;
      if (count > 0) totalUnread++;
    }
    io.to(`user:${userIdStr}`).emit('unread-count:update', { count: totalUnread });
  } catch (err) {
    console.error('Failed to emit unread count', err);
  }
};
