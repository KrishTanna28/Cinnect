import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import User from '@/lib/models/User.js'
import Notification from '@/lib/models/Notification.js'
import Community from '@/lib/models/Community.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { applyXpEvent, getProgressionSnapshot, getTrendingTier } from '@/lib/utils/gamification.js'
import { extractAndValidateMentions } from '@/lib/utils/mentionUtils.js'
import { emitNotification } from '@/lib/socketServer.js'

await connectDB()

// POST /api/posts/[id]/comment/[commentId]/reply - Add reply to comment
export const POST = withAuth(async (request, { user, params }) => {
  try {
    await connectDB();
    const { id, commentId } = await params
    const { content, spoiler, parentReplyId, mentions } = await request.json()

    if (!content || content.trim().length < 1) {
      return NextResponse.json(
        { success: false, message: 'Reply content is required' },
        { status: 400 }
      )
    }

    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.isLocked) {
      return NextResponse.json(
        { success: false, message: 'Post is locked' },
        { status: 403 }
      )
    }

    const comment = post.comments.id(commentId)
    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      )
    }

    // Validate parentReplyId and calculate depth for nested replies
    let depth = 0
    let parentReply = null

    if (parentReplyId) {
      parentReply = comment.replies.id(parentReplyId)
      if (!parentReply) {
        return NextResponse.json(
          { success: false, message: 'Parent reply not found' },
          { status: 404 }
        )
      }

      // Enforce max depth of 5 levels (depth 0-4)
      if (parentReply.depth >= 2) {
        return NextResponse.json(
          { success: false, message: 'Maximum nesting depth reached (5 levels)' },
          { status: 400 }
        )
      }

      if (parentReply.deleted) {
        return NextResponse.json(
          { success: false, message: 'Cannot reply to a deleted comment' },
          { status: 400 }
        )
      }

      depth = parentReply.depth + 1
    }

    // Extract and validate mentions
    const mentionedUsers = await extractAndValidateMentions(content)

    // Add reply with nested support
    await post.addReply(commentId, user._id, content, spoiler || false, false, parentReplyId, depth, mentionedUsers)

    // Run adult content text moderation on the new reply (non-blocking)
    try {
      const textResult = await moderateText(content)
      if (textResult.isAdult) {
        const comment = post.comments.id(commentId)
        const lastReply = comment.replies[comment.replies.length - 1]
        lastReply.adult_content = true
        await post.save()
      }
    } catch (modErr) {
      console.error('Reply moderation failed:', modErr)
    }

    // Send notifications (non-blocking)
    try {
      const notificationsToSend = []
      const community = await Community.findById(post.community)

      // 1. Notify comment author (if replying directly to comment, not a nested reply)
      const addedReplyId = comment.replies[comment.replies.length - 1]._id;
      const baseLink = `/communities/${community.slug}/posts/${post._id}#${addedReplyId}`;

      if (!parentReplyId && comment.user.toString() !== user._id.toString()) {
        notificationsToSend.push({
          recipient: comment.user,
          type: 'comment_reply',
          title: 'New Reply',
          message: `${user.username} replied to your comment`,
          link: baseLink,
          referenceId: post._id,
          parentId: addedReplyId,
          fromUser: user._id
        })
      }

      // 2. Notify parent reply author (if replying to a reply)
      if (parentReplyId && parentReply.user.toString() !== user._id.toString()) {
        notificationsToSend.push({
          recipient: parentReply.user,
          type: 'reply_to_reply',
          title: 'New Reply',
          message: `${user.username} replied to your reply`,
          link: baseLink,
          referenceId: post._id,
          parentId: addedReplyId,
          fromUser: user._id
        })
      }

      // 3. Notify mentioned users
      for (const mention of mentionedUsers) {
        if (mention.userId.toString() !== user._id.toString()) {
          notificationsToSend.push({
            recipient: mention.userId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${user.username} mentioned you in a reply`,
            link: baseLink,
            referenceId: post._id,
            parentId: addedReplyId,
            fromUser: user._id
          })
        }
      }

      // Create and emit all notifications
      for (const notifData of notificationsToSend) {
        const notification = await Notification.create({
          ...notifData,
          read: false
        })
        await emitNotification(notifData.recipient.toString(), notification)
      }
    } catch (notifError) {
      console.error('Notification error:', notifError)
      // Don't fail the request if notifications fail
    }

    await post.populate('comments.user', 'username avatar fullName')
    await post.populate('comments.replies.user', 'username avatar fullName')

    const xpEvent = applyXpEvent(user, {
      action: 'reply_post',
      target: { content },
      metadata: {
        moderationConfidence: 0
      }
    })

    let trendingEvent = null
    if (post.user.toString() !== user._id.toString()) {
      const tier = getTrendingTier(post)
      const awarded = new Set(post?.gamification?.trendingMilestonesAwarded || [])

      if (tier && !awarded.has(tier.key)) {
        const postOwner = await User.findById(post.user)
        if (postOwner) {
          trendingEvent = applyXpEvent(postOwner, {
            action: 'trending_post',
            target: post,
            metadata: {
              tierKey: tier.key,
              tierFactor: tier.factor,
              trendFactor: Math.min(1.5, tier.score / 30)
            }
          })

          post.gamification = post.gamification || {}
          post.gamification.trendingMilestonesAwarded = Array.from(awarded).concat(tier.key)
          await postOwner.save()
          await post.save()
        }
      }
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Reply added successfully',
      data: post,
      gamification: {
        xpEvent,
        trendingEvent,
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

// PATCH /api/posts/[id]/comment/[commentId]/reply - Like/dislike reply
export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const { id, commentId } = await params
    const { replyId, action } = await request.json()

    if (!replyId || !action) {
      return NextResponse.json(
        { success: false, message: 'Reply ID and action are required' },
        { status: 400 }
      )
    }

    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    if (action === 'like') {
      await post.likeReply(commentId, replyId, user._id)
    } else if (action === 'dislike') {
      await post.dislikeReply(commentId, replyId, user._id)
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      )
    }

    await post.populate('comments.replies.user', 'username avatar fullName')

    const comment = post.comments.id(commentId)
    const reply = comment.replies.id(replyId)
    const userId = user._id?.toString()

    return NextResponse.json({
      success: true,
      data: {
        userLiked: reply.likes.some(id => id?.toString() === userId),
        userDisliked: reply.dislikes.some(id => id?.toString() === userId),
        likes: reply.likes.length,
        dislikes: reply.dislikes.length
      }
    })
  } catch (error) {
    console.error('Vote reply error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to vote on reply'
      },
      { status: 500 }
    )
  }
})
