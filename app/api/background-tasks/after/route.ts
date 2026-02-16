/**
 * Background Task Test Endpoint: after() Trigger
 *
 * This endpoint tests the Next.js 16 `after()` function which executes
 * code after the response has been sent to the client.
 *
 * Usage:
 *   POST /api/background-tasks/after
 *   POST /api/background-tasks/after?delay=1000  (optional delay in ms)
 *
 * The endpoint returns immediately with a taskId, then the after() callback
 * runs and writes a completion marker to GCS.
 */

import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { writeTaskToGcs, type BackgroundTaskData } from '@/lib/background-tasks/gcs-writer';

// Note: Cannot use `export const runtime = 'nodejs'` with cacheComponents enabled
// Routes default to Node.js runtime, which is correct for after() and GCS operations
// maxDuration configuration would require route config, incompatible with cacheComponents

export async function POST(request: NextRequest) {
  const taskId = randomUUID();
  const startTime = Date.now();

  // Optional delay parameter for testing async operations
  const delay = parseInt(request.nextUrl.searchParams.get('delay') || '0', 10);

  console.log(`[BackgroundTasks] after() triggered: taskId=${taskId}, delay=${delay}ms`);

  // Register the after() callback - this runs AFTER the response is sent
  after(async () => {
    console.log(`[BackgroundTasks] after() callback starting: taskId=${taskId}`);

    try {
      // Optional delay to simulate async work
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const taskData: BackgroundTaskData = {
        taskId,
        type: 'after',
        completed: true,
        startTime,
        completedAt: Date.now(),
        source: 'route-handler',
        metadata: {
          delay,
          executionTime: Date.now() - startTime,
        },
      };

      await writeTaskToGcs(taskId, taskData);
      console.log(`[BackgroundTasks] after() callback completed: taskId=${taskId}`);
    } catch (error) {
      console.error(`[BackgroundTasks] after() callback failed: taskId=${taskId}`, error);

      // Attempt to write error state
      try {
        const errorData: BackgroundTaskData = {
          taskId,
          type: 'after',
          completed: false,
          startTime,
          failedAt: Date.now(),
          source: 'route-handler',
          error: error instanceof Error ? error.message : String(error),
        };
        await writeTaskToGcs(taskId, errorData);
      } catch {
        // Can't write error state, just log
        console.error(`[BackgroundTasks] Failed to write error state: taskId=${taskId}`);
      }
    }
  });

  // Return immediately - before after() runs
  return NextResponse.json({
    taskId,
    message: 'Task registered, after() will run after response is sent',
    timestamp: new Date().toISOString(),
    delay,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

// Also support GET for easier testing
export async function GET(request: NextRequest) {
  return POST(request);
}
