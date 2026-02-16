/**
 * Background Task Test Endpoint: Verification and Cleanup
 *
 * This endpoint checks if a background task completed and optionally cleans up.
 *
 * Usage:
 *   GET /api/background-tasks/verify?taskId={uuid}  - Check if task completed
 *   DELETE /api/background-tasks/verify?taskId={uuid}  - Delete task file
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  readTaskFromGcs,
  deleteTaskFromGcs,
  taskExistsInGcs,
} from '@/lib/background-tasks/gcs-writer';

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({
      error: 'taskId query parameter is required',
    }, {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  console.log(`[BackgroundTasks] Verifying task: taskId=${taskId}`);

  try {
    const exists = await taskExistsInGcs(taskId);

    if (!exists) {
      return NextResponse.json({
        exists: false,
        taskId,
        message: 'Task file not found (task may not have completed yet)',
      }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    const data = await readTaskFromGcs(taskId);

    return NextResponse.json({
      exists: true,
      taskId,
      data,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`[BackgroundTasks] Verification error: taskId=${taskId}`, error);

    return NextResponse.json({
      exists: false,
      taskId,
      error: error instanceof Error ? error.message : String(error),
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({
      error: 'taskId query parameter is required',
    }, {
      status: 400,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  console.log(`[BackgroundTasks] Deleting task: taskId=${taskId}`);

  try {
    await deleteTaskFromGcs(taskId);

    return NextResponse.json({
      deleted: true,
      taskId,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`[BackgroundTasks] Deletion error: taskId=${taskId}`, error);

    return NextResponse.json({
      deleted: false,
      taskId,
      error: error instanceof Error ? error.message : String(error),
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}
