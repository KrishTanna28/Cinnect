import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

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

    await post.addComment(user._id, content, spoiler || false)
    await post.populate('user', 'username avatar fullName')
    await post.populate('comments.user', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: post
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
