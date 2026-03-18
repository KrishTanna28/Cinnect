import { NextResponse } from 'next/server'
import Post from '@/lib/models/Post.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { deleteMultipleImagesFromCloudinary } from '@/lib/utils/cloudinaryHelper.js'
import Community from '@/lib/models/Community'

await connectDB()

// GET /api/posts/[id] - Get single post
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const commentsPage = parseInt(searchParams.get('commentsPage') || '1')
    const commentsLimit = parseInt(searchParams.get('commentsLimit') || '10')

    const post = await Post.findById(id)
      .populate('user', 'username avatar fullName')
      .populate('community', 'name slug icon')

    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    await post.incrementViews()

    // Calculate pagination for comments
    const totalComments = post.comments.length
    const startIndex = (commentsPage - 1) * commentsLimit
    const endIndex = startIndex + commentsLimit
    const paginatedComments = post.comments.slice(startIndex, endIndex)

    // Populate comments with user data
    await Post.populate(paginatedComments, { path: 'user', select: 'username avatar fullName' })
    await Post.populate(paginatedComments, { path: 'replies.user', select: 'username avatar fullName' })

    return NextResponse.json({
      success: true,
      data: {
        ...post.toObject(),
        comments: paginatedComments,
        totalComments
      }
    })
  } catch (error) {
    console.error('Get post error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch post'
      },
      { status: 500 }
    )
  }
}

// POST /api/posts/[id] - Like/dislike post
export const POST = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params
    const { action } = await request.json()

    const post = await Post.findById(id)
    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    const userId = user._id?.toString()
    const likeIndex = post.likes.findIndex(id => id?.toString() === userId)
    const dislikeIndex = post.dislikes.findIndex(id => id?.toString() === userId)

    if (action === 'like') {
      // Remove from dislikes if present
      if (dislikeIndex > -1) {
        post.dislikes.splice(dislikeIndex, 1)
      }
      // Toggle like
      if (likeIndex > -1) {
        post.likes.splice(likeIndex, 1)
      } else {
        post.likes.push(user._id)
      }
    } else if (action === 'dislike') {
      // Remove from likes if present
      if (likeIndex > -1) {
        post.likes.splice(likeIndex, 1)
      }
      // Toggle dislike
      if (dislikeIndex > -1) {
        post.dislikes.splice(dislikeIndex, 1)
      } else {
        post.dislikes.push(user._id)
      }
    }

    await post.save()

    return NextResponse.json({
      success: true,
      data: {
        likes: post.likes.length,
        dislikes: post.dislikes.length,
        userLiked: post.likes.some(id => id?.toString() === userId),
        userDisliked: post.dislikes.some(id => id?.toString() === userId)
      }
    })
  } catch (error) {
    console.error('Vote post error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to vote on post'
      },
      { status: 500 }
    )
  }
})

// DELETE /api/posts/[id] - Delete post
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params

    const post = await Post.findById(id).populate('community')
    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if user owns post or is moderator
    const isModerator = post.community.isModerator(user._id)
    if (post.user.toString() !== user._id?.toString() && !isModerator) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete images from Cloudinary if any
    if (post.images && post.images.length > 0) {
      try {
        await deleteMultipleImagesFromCloudinary(post.images)
      } catch (imageError) {
        console.error('Image deletion error:', imageError)
        // Continue with post deletion even if image deletion fails
      }
    }

    await Post.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete post'
      },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(async (request, { user, params }) => {
  try {
    const { id } = await params
    const { title, content, images, category, custom_category, category_color } = await request.json()
    
    const post = await Post.findById(id).populate('community')
    if (!post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if user owns post or is moderator
    const isModerator = post.community?.isModerator(user._id)
    if (post.user.toString() !== user._id?.toString() && !isModerator) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update fields
    if (title !== undefined) post.title = title
    if (content !== undefined) post.content = content
    if (images !== undefined) post.images = images
    if (category !== undefined) post.category = category
    if (custom_category !== undefined) post.custom_category = custom_category
    if (category_color !== undefined) post.category_color = category_color

    await post.save()

    // Populate user data for response
    await post.populate('user', 'username avatar fullName')
    await post.populate('community', 'name slug icon')

    return NextResponse.json({
      success: true,
      data: post
    })
  } catch (error) {
    console.error('Update post error:', error)
    return NextResponse.json( 
      {
        success: false,
        message: error.message || 'Failed to update post' 
      },
      { status: 500 }
    )
  }
})