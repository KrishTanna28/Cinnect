import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import User from '@/lib/models/User.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { applyXpEvent, getProgressionSnapshot, getTrendingTier } from '@/lib/utils/gamification.js'

await connectDB()

// POST /api/posts/[id]/comment/[commentId]/reply - Add reply to comment
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { id, commentId } = await params
    const { content, spoiler } = await request.json()

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

    await post.addReply(commentId, user._id, content, spoiler || false)

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
