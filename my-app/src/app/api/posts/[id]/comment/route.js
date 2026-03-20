import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import User from '@/lib/models/User.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { moderateText } from '@/lib/services/moderation.service.js'
import { applyXpEvent, getProgressionSnapshot, getTrendingTier } from '@/lib/utils/gamification.js'

await connectDB()

// POST /api/posts/[id]/comment - Add comment to post
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params
    const body = await request.json()
    const { content, spoiler } = body

    if (!content || content.trim().length < 1) {
      return NextResponse.json(
        { success: false, message: 'Comment content is required' },
        { status: 400 }
      )
    }

    const post = await Post.findById(id).populate('community')
    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.community && post.community.isPrivate) {
      const isMember = post.community.members.some(mId => mId.toString() === user._id.toString())
      if (!isMember) {
        return NextResponse.json(
          { success: false, message: 'Must be a member to comment in a private community' },
          { status: 403 }
        )
      }
    }

    if (post.isLocked) {
      return NextResponse.json(
        { success: false, message: 'Post is locked' },
        { status: 403 }
      )
    }

    await post.addComment(user._id, content, spoiler || false)

    // Run adult content text moderation on the new comment (non-blocking)
    try {
      const textResult = await moderateText(content)
      if (textResult.isAdult) {
        const lastComment = post.comments[post.comments.length - 1]
        lastComment.adult_content = true
        await post.save()
      }
    } catch (modErr) {
      console.error('Comment moderation failed:', modErr)
    }

    await post.populate('user', 'username avatar fullName')
    await post.populate('comments.user', 'username avatar fullName')

    const xpEvent = applyXpEvent(user, {
      action: 'comment_post',
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
      message: 'Comment added successfully',
      data: post,
      gamification: {
        xpEvent,
        trendingEvent,
        progression: getProgressionSnapshot(user)
      }
    })
  } catch (error) {
    console.error('Add comment error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to add comment'
      },
      { status: 500 }
    )
  }
})

// PATCH /api/posts/[id]/comment - Like/dislike comment
export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params
    const { commentId, action } = await request.json()

    if (!commentId || !action) {
      return NextResponse.json(
        { success: false, message: 'Comment ID and action are required' },
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
      await post.likeComment(commentId, user._id)
    } else if (action === 'dislike') {
      await post.dislikeComment(commentId, user._id)
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      )
    }

    await post.populate('comments.user', 'username avatar fullName')

    const comment = post.comments.id(commentId)
    const userId = user._id?.toString()

    return NextResponse.json({
      success: true,
      data: {
        userLiked: comment.likes.some(id => id?.toString() === userId),
        userDisliked: comment.dislikes.some(id => id?.toString() === userId),
        likes: comment.likes.length,
        dislikes: comment.dislikes.length
      }
    })
  } catch (error) {
    console.error('Vote comment error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to vote on comment'
      },
      { status: 500 }
    )
  }
})
