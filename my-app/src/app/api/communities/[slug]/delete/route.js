import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import Post from '@/lib/models/Post.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { deleteImageFromCloudinary } from '@/lib/utils/cloudinaryHelper.js'

await connectDB()

// DELETE /api/communities/[slug]/delete - Delete community (creator only)
export const DELETE = withAuth(async (request, { user, params }) => {
  try {
    await connectDB();
    const { slug } = await params

    const community = await Community.findOne({ slug })

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is the creator
    if (community.creator.toString() !== user._id?.toString()) {
      return NextResponse.json(
        { success: false, message: 'Only the creator can delete the community' },
        { status: 403 }
      )
    }

    // Delete all posts in this community
    await Post.deleteMany({ community: community._id })

    // Delete community images from Cloudinary
    if (community.banner) {
      await deleteImageFromCloudinary(community.banner).catch(err => 
        console.error('Failed to delete banner:', err)
      )
    }
    if (community.icon) {
      await deleteImageFromCloudinary(community.icon).catch(err => 
        console.error('Failed to delete icon:', err)
      )
    }

    // Delete the community
    await Community.deleteOne({ _id: community._id })

    return NextResponse.json({
      success: true,
      message: 'Community deleted successfully'
    })
  } catch (error) {
    console.error('Delete community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to delete community'
      },
      { status: 500 }
    )
  }
})
