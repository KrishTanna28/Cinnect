import Notification from '@/lib/models/Notification.js';
import User from '@/lib/models/User.js';
import { emitNotification } from '@/lib/socketServer.js';

/**
 * Helper to dispatch a notification, ensuring the recipient and actor are not the same.
 * @param {string} recipientId - User ID to receive
 * @param {string} actorId - User ID causing the action
 * @param {object} notificationData - Object matching Notification schema
 */
async function sendNotification(recipientId, actorId, notificationData) {
  if (recipientId.toString() === actorId.toString()) return;

  try {
    const recipient = await User.findById(recipientId).select('preferences').lean();
    const pushEnabled = recipient?.preferences?.notifications?.push !== false;

    if (pushEnabled) {
      const notif = await Notification.create({
        recipient: recipientId,
        fromUser: actorId,
        ...notificationData
      });
      emitNotification(recipientId, notif.toObject());
    }
  } catch (error) {
    console.error(`Failed to send ${notificationData.type} notification:`, error);
  }
}

/**
 * Notify relevant users about a new reply.
 * - Notifies owner (post/review)
 * - Notifies parent reply owner
 * - Notifies mentioned users
 * @param {object} params
 */
export async function notifyNewReply({
  actor,
  ownerId,
  parentReplyOwnerId,
  mentionedUsers = [],
  url,
  mediaTitle,
  isPost = false,
  referenceId,
  parentId
}) {
  const actorName = actor.fullName || actor.username;
  const notifiedSet = new Set();
  
  // 1. Notify Main Owner (Post or Review)
  if (ownerId && ownerId.toString() !== actor._id.toString()) {
    await sendNotification(ownerId, actor._id, {
      type: isPost ? 'post_comment' : 'review_reply',
      title: 'New Reply',
      message: `${actorName} replied to your ${isPost ? 'post' : `review of "${mediaTitle}"`}.`,
      image: actor.avatar || '',
      link: url,
      referenceId,
      parentId
    });
    notifiedSet.add(ownerId.toString());
  }

  // 2. Notify Parent Reply Owner (if not the same as owner)
  if (
    parentReplyOwnerId &&
    parentReplyOwnerId.toString() !== actor._id.toString() &&
    !notifiedSet.has(parentReplyOwnerId.toString())
  ) {
    await sendNotification(parentReplyOwnerId, actor._id, {
      type: 'reply_to_reply',
      title: 'New Reply to your comment',
      message: `${actorName} replied to your comment.`,
      image: actor.avatar || '',
      link: url,
      referenceId,
      parentId
    });
    notifiedSet.add(parentReplyOwnerId.toString());
  }

  // 3. Notify Mentioned Users
  for (const mention of mentionedUsers) {
    const mentionId = mention.userId.toString();
    if (mentionId !== actor._id.toString() && !notifiedSet.has(mentionId)) {
      await sendNotification(mentionId, actor._id, {
        type: 'mention',
        title: 'You were mentioned',
        message: `${actorName} mentioned you in a reply.`,
        image: actor.avatar || '',
        link: url,
        referenceId,
        parentId
      });
      notifiedSet.add(mentionId);
    }
  }
}

/**
 * Notify the owner about a new like.
 * @param {object} params
 */
export async function notifyNewLike({
  actor,
  ownerId,
  url,
  mediaTitle,
  isPost = false,
  referenceId,
  parentId
}) {
  const actorName = actor.fullName || actor.username;

  if (ownerId && ownerId.toString() !== actor._id.toString()) {
    await sendNotification(ownerId, actor._id, {
      type: isPost ? 'post_like' : 'review_like',
      title: 'New Like',
      message: `${actorName} liked your ${isPost ? 'post' : `review of "${mediaTitle}"`}.`,
      image: actor.avatar || '',
      link: url,
      referenceId,
      parentId
    });
  }
}
