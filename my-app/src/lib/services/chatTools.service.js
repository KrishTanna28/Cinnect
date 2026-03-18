import connectDB from "@/lib/config/database";
import Community from "@/lib/models/Community";
import Post from "@/lib/models/Post";

/**
 * Search communities by topic — matches against name, description, and category.
 * Sorts by member count descending. Returns top 5.
 *
 * @param {string} topic - The search topic (e.g. "Marvel", "anime", "Game of Thrones").
 * @returns {Promise<object[]>} Top matching communities.
 */
export async function searchCommunitiesByTopic(topic) {
  await connectDB();

  const regex = new RegExp(topic, "i");

  const communities = await Community.find({
    isActive: true,
    $or: [
      { name: regex },
      { description: regex },
      { category: regex },
      { relatedEntityName: regex },
    ],
  })
    .sort({ memberCount: -1, postCount: -1 })
    .limit(5)
    .select("name slug description category memberCount postCount icon banner")
    .lean();

  return communities.map((c) => ({
    name: c.name,
    slug: c.slug,
    description: c.description,
    category: c.category,
    memberCount: c.memberCount,
    postCount: c.postCount,
    icon: c.icon || null,
  }));
}

/**
 * Get trending / most popular posts across all communities.
 * Sorted by a engagement score (likes + comments + views).
 *
 * @param {number} [limit=5] - Number of posts to return (max 10).
 * @returns {Promise<object[]>} Top trending posts.
 */
export async function getTrendingPosts(limit = 5) {
  await connectDB();

  const safeLimit = Math.min(Math.max(limit, 1), 10);

  // Exclude private communities
  const Community = (await import('@/lib/models/Community.js')).default;
  const publicCommunityIds = await Community.find({ 
    isActive: true, 
    isPrivate: { $ne: true } 
  }).distinct('_id');

  const posts = await Post.aggregate([
    { 
      $match: { 
        isApproved: true, 
        isFlagged: { $ne: true },
        community: { $in: publicCommunityIds }
      } 
    },
    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        commentsCount: { $size: { $ifNull: ["$comments", []] } },
        engagementScore: {
          $add: [
            { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 3] },
            { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] },
            { $divide: [{ $ifNull: ["$views", 0] }, 5] },
          ],
        },
      },
    },
    { $sort: { engagementScore: -1, createdAt: -1 } },
    { $limit: safeLimit },
    {
      $lookup: {
        from: "communities",
        localField: "community",
        foreignField: "_id",
        as: "communityInfo",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: { path: "$communityInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "authorInfo",
        pipeline: [{ $project: { username: 1 } }],
      },
    },
    { $unwind: { path: "$authorInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        title: 1,
        content: { $substrCP: [{ $ifNull: ["$content", ""] }, 0, 200] },
        likesCount: 1,
        commentsCount: 1,
        views: 1,
        createdAt: 1,
        communityName: "$communityInfo.name",
        communitySlug: "$communityInfo.slug",
        author: "$authorInfo.username",
      },
    },
  ]);

  return posts;
}

/**
 * Search posts by a keyword / topic. Matches against title and content.
 * Sorted by relevance (text score) then engagement.
 *
 * @param {string} topic - The keyword to search.
 * @param {number} [limit=5] - Max results.
 * @returns {Promise<object[]>} Matching posts.
 */
export async function searchPostsByTopic(topic, limit = 5) {
  await connectDB();

  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const regex = new RegExp(topic, "i");

  // Exclude private communities
  const Community = (await import('@/lib/models/Community.js')).default;
  const publicCommunityIds = await Community.find({ 
    isActive: true, 
    isPrivate: { $ne: true } 
  }).distinct('_id');

  const posts = await Post.aggregate([
    {
      $match: {
        isApproved: true,
        isFlagged: { $ne: true },
        community: { $in: publicCommunityIds },
        $or: [{ title: regex }, { content: regex }],
      },
    },
    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        commentsCount: { $size: { $ifNull: ["$comments", []] } },
        engagementScore: {
          $add: [
            { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 3] },
            { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 2] },
            { $divide: [{ $ifNull: ["$views", 0] }, 5] },
          ],
        },
      },
    },
    { $sort: { engagementScore: -1, createdAt: -1 } },
    { $limit: safeLimit },
    {
      $lookup: {
        from: "communities",
        localField: "community",
        foreignField: "_id",
        as: "communityInfo",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: { path: "$communityInfo", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "authorInfo",
        pipeline: [{ $project: { username: 1 } }],
      },
    },
    { $unwind: { path: "$authorInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        title: 1,
        content: { $substrCP: [{ $ifNull: ["$content", ""] }, 0, 200] },
        likesCount: 1,
        commentsCount: 1,
        views: 1,
        createdAt: 1,
        communityName: "$communityInfo.name",
        communitySlug: "$communityInfo.slug",
        author: "$authorInfo.username",
      },
    },
  ]);

  return posts;
}
