import { NextResponse } from 'next/server';
import connectDB from '@/lib/config/database.js';
import { generateForAllUsers } from '@/lib/services/entertainmentNotification.service.js';

/**
 * POST /api/notifications/generate-all
 * Internal endpoint called by the background scheduler to generate
 * entertainment notifications for all active users.
 * Protected by a shared secret header.
 */
export async function POST(request) {
  await connectDB();
  try {
    const secret = request.headers.get('x-scheduler-secret');
    const expected = process.env.SCHEDULER_SECRET || 'internal-scheduler';
    if (secret !== expected) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await generateForAllUsers();

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error('Generate-all notifications error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate notifications' },
      { status: 500 }
    );
  }
}
