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
    await connectDB();
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

    const addedComment = post.comments[post.comments.length - 1];
    const addedCommentId = addedComment._id;
    const isOwnPostAction = post.user?.toString() === user._id?.toString()

    // Send notifications
    if (!isOwnPostAction) {
      try {
        const { notifyNewReply } = await import('@/lib/services/notification.service.js')
        await notifyNewReply({
          actor: user,
          ownerId: post.user,
          url: post.community 
            ? `/communities/${post.community._id || post.community}/post/${post._id}#${addedCommentId}`
            : `/post/${post._id}#${addedCommentId}`,
          mediaTitle: post.title,
          isPost: true,
          referenceId: post._id,
          parentId: addedCommentId
        })
      } catch (notifErr) {
        console.error('Failed to notify about post comment:', notifErr)
      }
    }

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

// PUT /api/posts/[id]/comment - Edit comment
export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params
    const { commentId, content, spoiler } = await request.json()

    if (!commentId || !content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: 'Comment ID and content are required' },
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

    const comment = post.comments.id(commentId)
    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      )
    }

    if (comment.user?.toString() !== user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    comment.content = content.trim()
    if (spoiler !== undefined) {
      comment.spoiler = Boolean(spoiler)
    }
    comment.updatedAt = new Date()

    await post.save()
    await post.populate('user', 'username avatar fullName')
    await post.populate('comments.user', 'username avatar fullName')
    await post.populate('comments.replies.user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Comment updated successfully',
      data: post
    })
  } catch (error) {
    console.error('Edit comment error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to edit comment'
      },
      { status: 500 }
    )
  }
})

// DELETE /api/posts/[id]/comment - Delete comment
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params
    const { commentId } = await request.json()

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: 'Comment ID is required' },
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

    const comment = post.comments.id(commentId)
    if (!comment) {
      return NextResponse.json(
        { success: false, message: 'Comment not found' },
        { status: 404 }
      )
    }

    const isOwner = comment.user?.toString() === user._id?.toString()
    const isModerator = post.community?.isModerator?.(user._id)

    if (!isOwner && !isModerator) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    comment.deleteOne()
    await post.save()
    await post.populate('user', 'username avatar fullName')
    await post.populate('comments.user', 'username avatar fullName')
    await post.populate('comments.replies.user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
      data: post
    })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete comment'
      },
      { status: 500 }
    )
  }
})
