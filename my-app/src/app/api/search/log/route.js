import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import SearchHistory from '@/lib/models/SearchHistory';
import connectDB from '@/lib/config/database.js'

// GET /api/search/log — fetch user's search history (most recent first)
export const GET = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 30);

    const history = await SearchHistory.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      history: history.map((h) => ({
        _id: h._id,
        query: h.query,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error('Search history GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch search history' },
      { status: 500 }
    );
  }
});

// POST /api/search/log — save a search query
export const POST = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { success: false, message: 'Query is required' },
        { status: 400 }
      );
    }

    const trimmed = query.trim().substring(0, 200);

    // If the exact same query already exists for this user, just update its timestamp
    const existing = await SearchHistory.findOneAndUpdate(
      { user: user._id, query: trimmed },
      { $set: { createdAt: new Date() } },
      { new: true }
    );

    if (!existing) {
      await SearchHistory.create({ user: user._id, query: trimmed });
    }

    // Cap history at 30 entries per user — delete oldest beyond that
    const count = await SearchHistory.countDocuments({ user: user._id });
    if (count > 30) {
      const oldest = await SearchHistory.find({ user: user._id })
        .sort({ createdAt: -1 })
        .skip(30)
        .select('_id');
      if (oldest.length > 0) {
        await SearchHistory.deleteMany({ _id: { $in: oldest.map((o) => o._id) } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search history POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to log search' },
      { status: 500 }
    );
  }
});

// DELETE /api/search/log — delete one entry (by id) or clear all
export const DELETE = withAuth(async (request, { user }) => {
  
    await connectDB()
try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (entryId) {
      // Delete specific entry
      await SearchHistory.deleteOne({ _id: entryId, user: user._id });
    } else {
      // Clear all history for this user
      await SearchHistory.deleteMany({ user: user._id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search history DELETE error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete search history' },
      { status: 500 }
    );
  }
});
