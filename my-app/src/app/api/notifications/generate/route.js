import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth.js';
import connectDB from '@/lib/config/database.js';
import { generateForUser } from '@/lib/services/entertainmentNotification.service.js';

await connectDB();

// POST /api/notifications/generate — generate dynamic entertainment notifications for the current user
export const POST = withAuth(async (request, { user }) => {
  try {
    await connectDB();
    const created = await generateForUser(user._id, 5);

    return NextResponse.json({
      success: true,
      generated: created.length
    });
  } catch (error) {
    console.error('Generate entertainment notifications error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate notifications' },
      { status: 500 }
    );
  }
});
