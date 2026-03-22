import Conversation from '@/lib/models/Conversation';
import { emitUnreadCount } from '@/lib/socketServer';

export const emitUnreadCountUpdate = async (io, userIdStr) => {
  if (!userIdStr) return;
  try {
    const allUserConvs = await Conversation.find({ participants: userIdStr }).select('unreadCount').lean();
    let totalUnread = 0;
    for (const conv of allUserConvs) {
      const count = conv.unreadCount?.[userIdStr] || 0;
      if (count > 0) totalUnread++;
    }
    // Use the socketServer utility which handles HTTP fallback for Vercel
    await emitUnreadCount(userIdStr, totalUnread);
  } catch (err) {
    console.error('Failed to emit unread count', err);
  }
};
