import Notification from '@/lib/models/Notification.js';
import User from '@/lib/models/User.js';
import Review from '@/lib/models/Review.js';
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

/**
 * Notify friends about a new review they might be interested in.
 * This sends notifications randomly to a subset of friends who:
 * - Have reviewed the same content, OR
 * - Have similar favorite genres
 *
 * @param {object} params
 */
export async function notifyFriendsAboutReview({
  reviewerId,
  reviewerData,
  mediaId,
  mediaType,
  mediaTitle,
  genres = [],
  reviewUrl
}) {
  try {
    // Get the reviewer's followers (friends)
    const reviewer = await User.findById(reviewerId).select('followers').lean();
    if (!reviewer || !reviewer.followers || reviewer.followers.length === 0) return;

    const reviewerName = reviewerData.fullName || reviewerData.username;

    // Get all friends who have push notifications and newReviews enabled
    const potentialRecipients = await User.find({
      _id: { $in: reviewer.followers },
      'preferences.notifications.push': { $ne: false },
      'preferences.notifications.newReviews': { $ne: false }
    }).select('_id preferences.favoriteGenres reviews').lean();

    if (potentialRecipients.length === 0) return;

    // Find friends who have reviewed the same content
    const friendsWhoReviewed = await Review.find({
      user: { $in: potentialRecipients.map(u => u._id) },
      mediaId,
      mediaType
    }).distinct('user');

    const interestedFriends = [];

    for (const friend of potentialRecipients) {
      // Priority 1: Friend has reviewed the same content
      if (friendsWhoReviewed.some(id => id.toString() === friend._id.toString())) {
        interestedFriends.push({ friend, priority: 'high' });
        continue;
      }

      // Priority 2: Friend has overlapping favorite genres
      const friendGenres = friend.preferences?.favoriteGenres || [];
      const hasOverlap = genres.some(genre => friendGenres.includes(genre));
      if (hasOverlap && friendGenres.length > 0) {
        interestedFriends.push({ friend, priority: 'medium' });
      }
    }

    if (interestedFriends.length === 0) return;

    // Randomly select friends to notify (25% chance for high priority, 10% for medium)
    for (const { friend, priority } of interestedFriends) {
      const chance = priority === 'high' ? 0.25 : 0.10;
      const shouldNotify = Math.random() < chance;

      if (shouldNotify) {
        await sendNotification(friend._id, reviewerId, {
          type: 'friend_review',
          title: 'Friend Review',
          message: `${reviewerName} reviewed "${mediaTitle}" that you might be interested in.`,
          image: reviewerData.avatar || '',
          link: reviewUrl,
          referenceId: mediaId,
          parentId: null
        });
      }
    }
  } catch (error) {
    console.error('Failed to notify friends about review:', error);
  }
}
