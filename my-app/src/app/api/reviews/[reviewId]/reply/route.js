import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import { emitNotification } from '@/lib/socketServer.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { applyXpEvent, getProgressionSnapshot } from '@/lib/utils/gamification.js'
import connectDB from '@/lib/config/database.js'

// POST /api/reviews/[reviewId]/reply - Add a reply to a review
export const POST = withAuth(async (request, { user, params }) => {
  
    await connectDB()
try {
    const { reviewId } = await params
    const body = await request.json()
    const { content, spoiler, parentReplyId: requestedParentId } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Reply content is required' },
        { status: 400 }
      )
    }

    const review = await Review.findById(reviewId)

    if (!review) {
      return NextResponse.json(
        { success: false, message: 'Review not found' },
        { status: 404 }
      )
    }

    // Server-side spoiler detection if not explicitly checked
    let finalSpoiler = spoiler || false;
    if (!finalSpoiler) {
      try {
        const detectRes = await fetch(new URL('/api/spoiler-detect', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content })
        });
        const detectData = await detectRes.json();
        if (detectData.success && detectData.data?.isSpoiler) {
          finalSpoiler = true;
          console.log(`[Backend Spoiler Detection] Reply flagged as spoiler: ${(detectData.data.confidence * 100).toFixed(1)}%`);
        }
      } catch (err) {
        console.error('Backend spoiler detection failed for reply:', err);
      }
    }

    let parentReplyId = requestedParentId || null;
    let depth = 0;
    
    if (parentReplyId) {
      const parentReply = review.replies.id(parentReplyId);
      if (parentReply) {
        depth = Math.min((parentReply.depth || 0) + 1, 5);
      } else {
        parentReplyId = null;
      }
    }

    const mentionedUsers = [];
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions = [...content.matchAll(mentionRegex)].map(m => m[1]);
    const uniqueMentions = [...new Set(mentions)];
    
    if (uniqueMentions.length > 0) {
      const users = await User.find({ username: { $in: uniqueMentions } }).select('_id username').lean();
      users.forEach(u => {
        mentionedUsers.push({ userId: u._id, username: u.username });
      });
    }

    // Add reply using model method
    await review.addReply(user._id, content, finalSpoiler, false, parentReplyId, depth, mentionedUsers)

    // Run adult content text moderation on the reply (non-blocking)
    try {
      const textResult = await moderateText(content)
      if (textResult.isAdult) {
        const lastReply = review.replies[review.replies.length - 1]
        lastReply.adult_content = true
        await review.save()
      }
    } catch (modErr) {
      console.error('Review reply moderation failed:', modErr)
    }

    // Update user achievements
    user.achievements.commentsPosted += 1
    user.markModified('achievements.commentsPosted')

    const xpEvent = applyXpEvent(user, {
      action: 'reply_post',
      target: {
        content,
        moderation: review?.moderation
      },
      metadata: {
        moderationConfidence: review?.moderation?.confidence || 0
      }
    })

    await user.save()

    const addedReplyId = review.replies[review.replies.length - 1]?._id;

    // Send notification to review author (if not self-reply)
    try {
      const { notifyNewReply } = await import('@/lib/services/notification.service.js')
      
      let parentReplyOwnerId = null;
      if (parentReplyId) {
        const parentReply = review.replies.id(parentReplyId);
        if (parentReply) {
          parentReplyOwnerId = parentReply.user;
        }
      }

      await notifyNewReply({
        actor: user,
        ownerId: review.user,
        parentReplyOwnerId,
        mentionedUsers,
        url: `/reviews/${review.mediaType}/${review.mediaId}#${addedReplyId}`,
        mediaTitle: review.mediaTitle,
        isPost: false,
        referenceId: review._id,
        parentId: addedReplyId
      })
    } catch (notifErr) {
      console.error('Failed to create reply notification:', notifErr)
    }

    // Populate the review with user data
    await review.populate('replies.user', 'username avatar fullName')
    await review.populate('replies.mentionedUsers.userId', 'username avatar fullName')

    const addedReply = review.replies[review.replies.length - 1];

    return NextResponse.json({
      success: true,
      message: 'Reply added successfully',
      data: addedReply,
      gamification: {
        xpEvent,
        progression: getProgressionSnapshot(user)
      }
    })
  } catch (error) {
    console.error('Add reply error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to add reply'
      },
      { status: 500 }
    )
  }
})
