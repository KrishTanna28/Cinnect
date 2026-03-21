import { NextResponse } from 'next/server'
import Community from '@/lib/models/Community.js'
import User from '@/lib/models/User.js'
import SearchHistory from '@/lib/models/SearchHistory.js'
import UserActivity from '@/lib/models/UserActivity.js'
import Review from '@/lib/models/Review.js'
import { getMovieDetails } from '@/lib/services/tmdb.service.js'
import { withAuth } from '@/lib/middleware/withAuth.js'
import connectDB from '@/lib/config/database.js'

await connectDB()

export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const userId = user._id

    // Find full user config for watchlist, favorites, following
    const fullUser = await User.findById(userId)
      .select('watchlist favorites following friends')
      .lean()

    const followingIds = fullUser?.following?.map(id => id.toString()) || []
    
    // Extract keywords from search history
    const searches = await SearchHistory.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
    const searchKeywords = searches.map(s => s.query)

    const reviews = await Review.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('mediaTitle mediaType mediaId')
      .lean()
    const reviewKeywords = reviews.map(r => r.mediaTitle).filter(Boolean)

    // Extract keywords from activity
    const activity = await UserActivity.findOne({ user: userId }).lean()
    
    let activityKeywords = [...reviewKeywords]
    
    // Add up to 3 recent items from watchlist/favorites
    try {
      const recentFavs = fullUser?.favorites?.slice(-3).map(f => f.movieId) || []
      const recentWatchlist = fullUser?.watchlist?.slice(-3).map(w => w.movieId) || []
      const tmdbIds = [...new Set([...recentFavs, ...recentWatchlist])]
      
      for (const id of tmdbIds) {
        const details = await getMovieDetails(id).catch(() => null)
        if (details) {
          if (details.title) activityKeywords.push(details.title)
          if (details.genres) {
            activityKeywords.push(...details.genres.map(g => g.name || g))
          }
        }
      }
    } catch (e) {
      console.error('Error fetching tmdb details for reco:', e)
    }

    if (activity) {
      if (activity.recentViews) {
        // limit recent views to last 20 to avoid huge regexes
        const recent = activity.recentViews.slice(-20)
        activityKeywords.push(...recent.map(v => v.title).filter(Boolean))
        activityKeywords.push(...recent.flatMap(v => v.genres || []))
      }
      if (activity.viewedActors) {
        const recentActors = activity.viewedActors.slice(-10)
        activityKeywords.push(...recentActors.map(v => v.name).filter(Boolean))
      }
    }

    // Extract related entity IDs from all user interactions for direct matches
    const entityIds = new Set()
    fullUser?.favorites?.forEach(f => f.movieId && entityIds.add(String(f.movieId)))
    fullUser?.watchlist?.forEach(w => w.movieId && entityIds.add(String(w.movieId)))
    reviews.forEach(r => r.mediaId && entityIds.add(String(r.mediaId)))
    if (activity) {
      activity.recentViews?.forEach(v => v.mediaId && entityIds.add(String(v.mediaId)))
      activity.viewedActors?.forEach(v => v.actorId && entityIds.add(String(v.actorId)))
    }
    const userRelatedEntityIds = [...entityIds]

    // Combine all potential keywords and clean them
    const allKeywords = [...new Set([...searchKeywords, ...activityKeywords])]
      .filter(k => k.length > 2)
      .map(k => k.toLowerCase())

    // Base query to exclude inactive & existing membership
    const baseQuery = { 
      isActive: true,
      members: { $nin: [userId] },
      creator: { $ne: userId }
    }

    let recommendedCommunities = []

    // 1. Communities where friends are members
    if (followingIds.length > 0) {
      const friendCommunities = await Community.find({
        ...baseQuery,
        members: { $in: followingIds }
      })
      .populate('creator', 'username avatar fullName')
      .limit(limit)
      .lean()
      
      recommendedCommunities.push(...friendCommunities)
    }

    // 2. Communities directly matching user's interacted entities (movies, shows, actors)
    if (userRelatedEntityIds.length > 0 && recommendedCommunities.length < limit) {
      const remainingLimit = limit - recommendedCommunities.length;
      const entityCommunities = await Community.find({
        ...baseQuery,
        _id: { $nin: recommendedCommunities.map(c => c._id) },
        relatedEntityId: { $in: userRelatedEntityIds }
      })
      .populate('creator', 'username avatar fullName')
      .limit(remainingLimit)
      .lean()

      recommendedCommunities.push(...entityCommunities)
    }

    // 3. Communities matching keywords
    if (allKeywords.length > 0 && recommendedCommunities.length < limit) {
      const remainingLimit = limit - recommendedCommunities.length;
      // Build a regex search pattern for keywords (escaped)
      const escapedKeywords = allKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const searchRegex = new RegExp(escapedKeywords.join('|'), 'i')
      
      const keywordCommunities = await Community.find({
        ...baseQuery,
        _id: { $nin: recommendedCommunities.map(c => c._id) },
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { relatedEntityName: searchRegex }
        ]
      })
      .populate('creator', 'username avatar fullName')
      .limit(remainingLimit)
      .lean()

      recommendedCommunities.push(...keywordCommunities)
    }

    // 4. Fallback to popular communities if we still don't have enough
    if (recommendedCommunities.length < limit) {
      const remainingLimit = limit - recommendedCommunities.length;
      const popularCommunities = await Community.find({
        ...baseQuery,
        _id: { $nin: recommendedCommunities.map(c => c._id) }
      })
      .populate('creator', 'username avatar fullName')
      .sort({ memberCount: -1, postCount: -1 })
      .limit(remainingLimit)
      .lean()

      recommendedCommunities.push(...popularCommunities)
    }

    // Add mutuals to response
    let mutualsMap = {}
    if (followingIds.length > 0) {
      const mutuals = await User.find({ _id: { $in: followingIds } })
        .select('username avatar fullName')
        .lean()
      mutuals.forEach(m => mutualsMap[m._id.toString()] = m)
    }

    const modifiedCommunities = recommendedCommunities.map(c => {
      const mIds = c.members?.map(id => id.toString()) || []
      const mutualsInCommunity = followingIds
         .filter(fid => mIds.includes(fid))
         .map(fid => mutualsMap[fid])
         .filter(Boolean)
      
      // Remove members array to save bandwidth
      const { members, ...rest } = c
      
      return {
        ...rest,
        mutuals: mutualsInCommunity
      }
    })

    return NextResponse.json({
      success: true,
      data: modifiedCommunities
    })

  } catch (error) {
    console.error('Fetch recommended communities error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch recommended communities' },
      { status: 500 }
    )
  }
})
