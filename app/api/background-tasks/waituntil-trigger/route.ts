/**
 * Background Task Test Endpoint: waitUntil() Trigger
 *
 * This is a pass-through endpoint that middleware intercepts.
 * The actual waitUntil() call happens in middleware.ts.
 *
 * Usage:
 *   GET /api/background-tasks/waituntil-trigger?taskId={uuid}
 *
 * The client generates the taskId since middleware needs it before
 * the route handler responds.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({
      error: 'taskId query parameter is required',
      message: 'Generate a UUID client-side and pass it as ?taskId={uuid}',
    }, {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  console.log(`[BackgroundTasks] waitUntil-trigger reached: taskId=${taskId}`);

  // Middleware should have already called waitUntil() for this request
  return NextResponse.json({
    taskId,
    message: 'Request processed, waitUntil() should be running in middleware',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
