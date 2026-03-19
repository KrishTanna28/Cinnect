import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import User from '@/lib/models/User.js'
import { withAuth, withOptionalAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'
import { uploadCommunityBannerToCloudinary, uploadCommunityIconToCloudinary } from '@/lib/utils/cloudinaryHelper.js'

await connectDB()

// GET /api/communities - Get all communities
export const GET = withOptionalAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort') || 'popular' // popular, recent, members
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const query = { isActive: true }
    if (category && category !== 'all') query.category = category
    if (search) {
      // Use regex for partial matching - case insensitive
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    let sort = {}
    switch (sortBy) {
      case 'recent':
        sort = { createdAt: -1 }
        break
      case 'members':
        sort = { memberCount: -1, createdAt: -1 }
        break
      case 'popular':
      default:
        sort = { postCount: -1, memberCount: -1 }
        break
    }

    const skip = (page - 1) * limit

    const [communities, total] = await Promise.all([
      Community.find(query)
        .populate('creator', 'username avatar fullName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Community.countDocuments(query)
    ])

    let modifiedCommunities = communities;
    if (user && user.following && user.following.length > 0) {
      const followingIds = user.following.map(id => id.toString());
      
      const mutualIdSet = new Set();
      communities.forEach(c => {
        const mIds = c.members?.map(id => id.toString()) || [];
        followingIds.forEach(fid => {
          if (mIds.includes(fid)) mutualIdSet.add(fid);
        });
      });
      
      let mutualsMap = {};
      if (mutualIdSet.size > 0) {
        const mutuals = await User.find({ _id: { $in: Array.from(mutualIdSet) } })
          .select('username avatar fullName')
          .lean();
        mutuals.forEach(m => mutualsMap[m._id.toString()] = m);
      }
      
      modifiedCommunities = communities.map(c => {
        const mIds = c.members?.map(id => id.toString()) || [];
        const mutualsInCommunity = followingIds
           .filter(fid => mIds.includes(fid))
           .map(fid => mutualsMap[fid])
           .filter(Boolean);
        
        // Remove full members array to save bandwidth
        const { members, ...rest } = c;
        
        return {
          ...rest,
          mutuals: mutualsInCommunity
        };
      });
    } else {
      // Clean members array for non-authenticated users or users with no friends
      modifiedCommunities = communities.map(c => {
        const { members, ...rest } = c;
        return rest;
      });
    }

    return NextResponse.json({
      success: true,
      data: modifiedCommunities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get communities error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch communities'
      },
      { status: 500 }
    )
  }
})

// POST /api/communities - Create new community
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const {
      name,
      description,
      category,
      relatedEntityId,
      relatedEntityName,
      relatedEntityType,
      banner,
      icon,
      isPrivate,
      requireApproval
    } = body

    // Validation
    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: 'Name and description are required' },
        { status: 400 }
      )
    }

    // Check if community name already exists
    const existing = await Community.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'A community with this name already exists' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // Create community
    const community = await Community.create({
      name,
      slug,
      description,
      category,
      relatedEntityId,
      relatedEntityName,
      relatedEntityType,
      creator: user._id,
      moderators: [user._id],
      members: [user._id],
      isPrivate,
      requireApproval
    })

    // Upload images to Cloudinary if provided
    try {
      if (banner) {
        const bannerUrl = await uploadCommunityBannerToCloudinary(banner, community._id?.toString())
        community.banner = bannerUrl
      }
      
      if (icon) {
        const iconUrl = await uploadCommunityIconToCloudinary(icon, community._id?.toString())
        community.icon = iconUrl
      }

      if (banner || icon) {
        await community.save()
      }
    } catch (imageError) {
      console.error('Image upload error:', imageError)
      // Continue without images - community is already created
    }

    await community.populate('creator', 'username avatar fullName')

    return NextResponse.json({
      success: true,
      message: 'Community created successfully',
      data: community
    }, { status: 201 })
  } catch (error) {
    console.error('Create community error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create community'
      },
      { status: 500 }
    )
  }
})
