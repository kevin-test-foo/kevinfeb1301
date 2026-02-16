/**
 * Internal API endpoint for waitUntil() GCS writes
 *
 * This endpoint is called by the middleware's waitUntil() callback to write
 * task completion markers to GCS. The middleware runs in Edge runtime and
 * cannot use @google-cloud/storage directly, so it delegates to this
 * Node.js runtime endpoint.
 *
 * NOTE: This is an INTERNAL endpoint - not meant to be called directly by tests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeTaskToGcs, type BackgroundTaskData } from '@/lib/background-tasks/gcs-writer';

// Note: Cannot use runtime/maxDuration exports with cacheComponents enabled
// Routes default to Node.js runtime, which is correct for GCS operations

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, type, completed, timestamp, source, error } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const taskData: BackgroundTaskData = {
      taskId,
      type: type || 'waitUntil',
      completed: completed ?? true,
      timestamp: timestamp || Date.now(),
      source: source || 'middleware',
      ...(error && { error }),
    };

    await writeTaskToGcs(taskId, taskData);

    return NextResponse.json({
      success: true,
      taskId,
    });
  } catch (err) {
    console.error('[waituntil-write] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
