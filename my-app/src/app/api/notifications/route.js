import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth.js';
import Notification from '@/lib/models/Notification.js';
import User from '@/lib/models/User.js';
import Community from '@/lib/models/Community.js';
import connectDB from '@/lib/config/database.js';

await connectDB();

// GET /api/notifications — fetch the current user's notifications
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 30;
    const skip = (page - 1) * limit;

    // Sync follow requests into Notification collection (so they show up)
    await syncFollowRequestNotifications(user);

    // Sync community join requests for communities the user admins
    await syncCommunityJoinRequestNotifications(user);

    // Fetch notifications
    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find({ recipient: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUser', 'username fullName avatar level')
        .populate('requestingUser', 'username fullName avatar level')
        .populate('community', 'name slug icon')
        .lean(),
      Notification.countDocuments({ recipient: user._id }),
      Notification.countDocuments({ recipient: user._id, read: false })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: totalCount,
        page,
        hasMore: skip + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get notifications' },
      { status: 500 }
    );
  }
});

// PATCH /api/notifications — mark notifications as read
export const PATCH = withAuth(async (request, { user }) => {
  try {
    const body = await request.json();
    const { notificationIds, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany(
        { recipient: user._id, read: false },
        { $set: { read: true } }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipient: user._id },
        { $set: { read: true } }
      );
    }

    const unreadCount = await Notification.countDocuments({ recipient: user._id, read: false });

    return NextResponse.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
});

/**
 * Create Notification docs for each pending follow request that doesn't already
 * have a corresponding notification.
 */
async function syncFollowRequestNotifications(user) {
  try {
    const fullUser = await User.findById(user._id)
      .populate('followRequests.from', 'username fullName avatar')
      .select('followRequests');

    if (!fullUser?.followRequests?.length) return;

    for (const req of fullUser.followRequests) {
      if (!req.from) continue;
      const exists = await Notification.findOne({
        recipient: user._id,
        type: 'follow_request',
        fromUser: req.from._id,
        actionTaken: false
      });
      if (!exists) {
        await Notification.create({
          recipient: user._id,
          type: 'follow_request',
          fromUser: req.from._id,
          title: 'New Follow Request',
          message: `${req.from.fullName || req.from.username} wants to follow you.`,
          image: req.from.avatar || '',
          link: `/profile/${req.from._id}`
        });
      }
    }
  } catch (err) {
    console.error('syncFollowRequestNotifications error:', err);
  }
}

/**
 * Create Notification docs for each pending community join request where
 * the current user is the creator / moderator.
 */
async function syncCommunityJoinRequestNotifications(user) {
  try {
    const communities = await Community.find({
      $or: [
        { creator: user._id },
        { moderators: user._id }
      ],
      'pendingRequests.0': { $exists: true }
    }).populate('pendingRequests.user', 'username fullName avatar');

    for (const community of communities) {
      for (const req of community.pendingRequests) {
        if (!req.user) continue;
        const exists = await Notification.findOne({
          recipient: user._id,
          type: 'community_join_request',
          community: community._id,
          requestingUser: req.user._id || req.user,
          actionTaken: false
        });
        if (!exists) {
          const reqUser = req.user;
          await Notification.create({
            recipient: user._id,
            type: 'community_join_request',
            community: community._id,
            requestingUser: reqUser._id || reqUser,
            title: 'Community Join Request',
            message: `${reqUser.fullName || reqUser.username} wants to join ${community.name}.`,
            image: reqUser.avatar || community.icon || '',
            link: `/communities/${community.slug}`
          });
        }
      }
    }
  } catch (err) {
    console.error('syncCommunityJoinRequestNotifications error:', err);
  }
}
