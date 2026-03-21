import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth.js';
import UserActivity from '@/lib/models/UserActivity.js';
import connectDB from '@/lib/config/database.js';

await connectDB();

/**
 * POST /api/users/me/activity — track user activity for notification personalization.
 *
 * Body:
 *   { type: 'view_media', mediaId, mediaType, title, genres }
 *   { type: 'view_actor', actorId, name }
 */
export const POST = withAuth(async (request, { user }) => {
  try {
    await connectDB();
    const body = await request.json();
    const { type } = body;

    if (type === 'view_media') {
      const { mediaId, mediaType, title, genres } = body;
      if (!mediaId || !mediaType) {
        return NextResponse.json({ success: false, message: 'mediaId and mediaType required' }, { status: 400 });
      }

      const update = {
        $push: {
          recentViews: {
            $each: [{ mediaId: String(mediaId), mediaType, title: title || '', genres: genres || [], viewedAt: new Date() }],
            $slice: -50
          }
        }
      };

      // Increment genre frequency
      const incGenres = {};
      for (const g of (genres || [])) {
        if (g) incGenres[`genreFrequency.${g}`] = 1;
      }
      if (Object.keys(incGenres).length > 0) {
        update.$inc = incGenres;
      }

      await UserActivity.findOneAndUpdate({ user: user._id }, update, { upsert: true });
    } else if (type === 'view_actor') {
      const { actorId, name } = body;
      if (!actorId) {
        return NextResponse.json({ success: false, message: 'actorId required' }, { status: 400 });
      }

      await UserActivity.findOneAndUpdate(
        { user: user._id },
        {
          $push: {
            viewedActors: {
              $each: [{ actorId: String(actorId), name: name || '', viewedAt: new Date() }],
              $slice: -30
            }
          }
        },
        { upsert: true }
      );
    } else {
      return NextResponse.json({ success: false, message: 'Unknown activity type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track activity error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to track activity' },
      { status: 500 }
    );
  }
});
