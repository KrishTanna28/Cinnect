import { NextResponse } from 'next/server';
import connectDB from '@/lib/config/database.js';
import { generateForAllUsers } from '@/lib/services/entertainmentNotification.service.js';
import { success, unauthorized, handleError } from '@/lib/utils/apiResponse.js';

/**
 * POST /api/notifications/generate-all
 * Internal endpoint called by the background scheduler to generate
 * entertainment notifications for all active users.
 * Protected by a shared secret header.
 */
export async function POST(request) {
  try {
    const secret = request.headers.get('x-scheduler-secret');
    const expected = process.env.SCHEDULER_SECRET;

    // Require SCHEDULER_SECRET to be configured
    if (!expected) {
      console.error('[Scheduler] SCHEDULER_SECRET not configured');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (secret !== expected) {
      return unauthorized();
    }

    await connectDB();
    await generateForAllUsers();

    return success({ processed: true }, 'Notifications generated successfully');
  } catch (err) {
    return handleError(err, 'Generate-all notifications');
  }
}
