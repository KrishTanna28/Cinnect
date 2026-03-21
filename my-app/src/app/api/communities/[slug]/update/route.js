import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { uploadCommunityBannerToCloudinary, uploadCommunityIconToCloudinary } from '@/lib/utils/cloudinaryHelper.js'

await connectDB()

// PATCH /api/communities/[slug]/update - Update community details (creator/moderators only)
export const PATCH = withAuth(async (request, { user, params }) => {
  try {
    await connectDB();
    const { slug } = await params
    const body = await request.json()
    const { description, rules, banner, icon, isPrivate } = body

    const community = await Community.findOne({ slug })

    if (!community) {
      return NextResponse.json(
        { success: false, message: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is creator or moderator
    if (!community.isModerator(user._id)) {
      return NextResponse.json(
        { success: false, message: 'Only the creator or moderators can update the community' },
        { status: 403 }
      )
    }

    // Update description if provided
    if (description !== undefined) {
      if (description.length > 500) {
        return NextResponse.json(
          { success: false, message: 'Description cannot exceed 500 characters' },
          { status: 400 }
        )
      }
      community.description = description
    }

    // Update rules if provided
    if (rules !== undefined) {
      if (Array.isArray(rules)) {
        // Validate rules format - only title is required
        const validRules = rules.filter(rule => 
          rule && typeof rule === 'object' && rule.title
        ).map(rule => ({
          title: rule.title?.trim() || ''
        }))
        
        community.rules = validRules
      }
    }

    if (banner !== undefined) {
      if (banner && banner.startsWith('data:image')) {
        community.banner = await uploadCommunityBannerToCloudinary(banner);
      } else {
        community.banner = banner;
      }
    }
    
    if (icon !== undefined) {
      if (icon && icon.startsWith('data:image')) {
        community.icon = await uploadCommunityIconToCloudinary(icon);
      } else {
        community.icon = icon;
      }
    }

    if (isPrivate !== undefined) {
      community.isPrivate = isPrivate;
    }

    await community.save()

    return NextResponse.json({
      success: true,
      message: 'Community updated successfully',
      data: {
        description: community.description,
        rules: community.rules
      }
    })
  } catch (error) {
    console.error('Update community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update community'
      },
      { status: 500 }
    )
  }
})
