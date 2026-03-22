import { NextResponse } from 'next/server'
import Review from '@/lib/models/Review.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import { emitNotification } from '@/lib/socketServer.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { applyXpEvent, getProgressionSnapshot } from '@/lib/utils/gamification.js'
import { extractAndValidateMentions } from '@/lib/utils/mentionUtils.js'
import connectDB from '@/lib/config/database.js'

// POST /api/reviews/[reviewId]/reply - Add a reply to a review
export const POST = withAuth(async (request, { user, params }) => {
  
    await connectDB()
try {
    const { reviewId } = await params
    const body = await request.json()
    const { content, spoiler, parentReplyId } = body

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

    // Validate parentReplyId and calculate depth for nested replies
    let depth = 0
    let parentReply = null

    if (parentReplyId) {
      parentReply = review.replies.id(parentReplyId)
      if (!parentReply) {
        return NextResponse.json(
          { success: false, message: 'Parent reply not found' },
          { status: 404 }
        )
      }

      // Enforce max depth of 5 levels (depth 0-4)
      if (parentReply.depth >= 4) {
        return NextResponse.json(
          { success: false, message: 'Maximum nesting depth reached (5 levels)' },
          { status: 400 }
        )
      }

      depth = parentReply.depth + 1
    }

    // Extract and validate mentions
    const mentionedUsers = await extractAndValidateMentions(content)

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

    // Add reply using model method (incorporates mentionedUsers, depth, parentReplyId)
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

    // Send notifications (non-blocking)
    try {
      const notificationsToSend = []

      // 1. Notify review author (if replying directly to review, not a nested reply)
      if (!parentReplyId && review.user.toString() !== user._id.toString()) {
        const recipient = await User.findById(review.user).select('preferences').lean()
        if (recipient?.preferences?.notifications?.push !== false) {
          notificationsToSend.push({
            recipient: review.user,
            type: 'review_reply',
            fromUser: user._id,
            title: 'New Reply',
            message: `${user.fullName || user.username} replied to your review of "${review.mediaTitle}".`,
            image: user.avatar || '',
            link: `/reviews/${review.mediaType}/${review.mediaId}`
          })
        }
      }

      // 2. Notify parent reply author (if replying to a reply)
      if (parentReplyId && parentReply.user.toString() !== user._id.toString()) {
        const recipient = await User.findById(parentReply.user).select('preferences').lean()
        if (recipient?.preferences?.notifications?.push !== false) {
          notificationsToSend.push({
            recipient: parentReply.user,
            type: 'reply_to_reply',
            fromUser: user._id,
            title: 'New Reply',
            message: `${user.fullName || user.username} replied to your reply on a review.`,
            image: user.avatar || '',
            link: `/reviews/${review.mediaType}/${review.mediaId}`
          })
        }
      }

      // 3. Notify mentioned users
      for (const mention of mentionedUsers) {
        if (mention.userId.toString() !== user._id.toString()) {
          const recipient = await User.findById(mention.userId).select('preferences').lean()
          if (recipient?.preferences?.notifications?.push !== false) {
            notificationsToSend.push({
              recipient: mention.userId,
              type: 'mention',
              fromUser: user._id,
              title: 'You were mentioned',
              message: `${user.fullName || user.username} mentioned you in a review reply.`,
              image: user.avatar || '',
              link: `/reviews/${review.mediaType}/${review.mediaId}`
            })
          }
        }
      }

      // Create and emit all notifications
      for (const notifData of notificationsToSend) {
        const notif = await Notification.create(notifData)
        await emitNotification(notifData.recipient.toString(), notif.toObject())
      }
    } catch (notifErr) {
      console.error('Failed to create reply notification:', notifErr)
    }

    // Populate the review with user data
    await review.populate('replies.user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Reply added successfully',
      data: review,
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
