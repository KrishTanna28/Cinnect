import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth.js';
import Notification from '@/lib/models/Notification.js';
import User from '@/lib/models/User.js';
import Community from '@/lib/models/Community.js';
import connectDB from '@/lib/config/database.js';

await connectDB();

// POST /api/notifications/action — accept or reject a request notification
export const POST = withAuth(async (request, { user }) => {
  try {
    const { notificationId, action } = await request.json();
    // action = 'accept' | 'reject'

    if (!notificationId || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'notificationId and action (accept|reject) are required' },
        { status: 400 }
      );
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: user._id
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.actionTaken) {
      return NextResponse.json(
        { success: false, message: 'Action already taken on this notification' },
        { status: 400 }
      );
    }

    // ── Follow Request ──
    if (notification.type === 'follow_request') {
      const requesterId = notification.fromUser;

      if (action === 'accept') {
        // Remove from followRequests, add to followers/following
        user.followRequests = (user.followRequests || []).filter(
          req => req.from.toString() !== requesterId.toString()
        );
        if (!user.followers.some(id => id.toString() === requesterId.toString())) {
          user.followers.push(requesterId);
        }
        await user.save();
        await User.findByIdAndUpdate(requesterId, {
          $addToSet: { following: user._id }
        });
      } else {
        // Just remove from followRequests
        user.followRequests = (user.followRequests || []).filter(
          req => req.from.toString() !== requesterId.toString()
        );
        await user.save();
      }
    }

    // ── Community Join Request ──
    if (notification.type === 'community_join_request') {
      const community = await Community.findById(notification.community);
      if (community) {
        const requestingUserId = notification.requestingUser;

        if (action === 'accept') {
          await community.approveJoinRequest(requestingUserId);
        } else {
          community.removeJoinRequest(requestingUserId);
          await community.save();
        }
      }
    }

    // Update the notification
    notification.actionTaken = true;
    notification.actionType = action === 'accept' ? 'accepted' : 'rejected';
    notification.read = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({ recipient: user._id, read: false });

    return NextResponse.json({
      success: true,
      message: `Request ${action}ed successfully`,
      data: { unreadCount }
    });
  } catch (error) {
    console.error('Notification action error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process notification action' },
      { status: 500 }
    );
  }
});
