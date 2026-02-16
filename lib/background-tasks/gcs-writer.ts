/**
 * GCS Writer Utility for Background Task Tests
 *
 * This utility provides functions to write task completion markers to GCS.
 * Used by background task test endpoints to prove that after() and waitUntil()
 * callbacks executed successfully.
 *
 * NOTE: This is TEST INFRASTRUCTURE only. Production apps using after() typically
 * don't need GCS - they use it for analytics, webhooks, emails, etc.
 */

import { Storage, Bucket } from '@google-cloud/storage';

// Types for background task data
export interface BackgroundTaskData {
  taskId: string;
  type: 'after' | 'waitUntil';
  completed: boolean;
  startTime?: number;
  completedAt?: number;
  failedAt?: number;
  timestamp?: number;
  source: 'route-handler' | 'middleware' | 'server-action';
  error?: string;
  metadata?: Record<string, unknown>;
}

// Singleton storage instance
let storage: Storage | null = null;
let bucket: Bucket | null = null;

/**
 * Get or create the GCS bucket instance.
 * Uses CACHE_BUCKET environment variable (same as cache handler).
 */
function getBucket(): Bucket | null {
  const bucketName = process.env.CACHE_BUCKET;

  if (!bucketName) {
    console.warn('[BackgroundTasks] CACHE_BUCKET not set - GCS writes will be skipped');
    return null;
  }

  if (!storage) {
    storage = new Storage();
  }

  if (!bucket) {
    bucket = storage.bucket(bucketName);
  }

  return bucket;
}

/**
 * Write a task completion marker to GCS.
 *
 * @param taskId - Unique identifier for the task
 * @param data - Task completion data
 */
export async function writeTaskToGcs(taskId: string, data: BackgroundTaskData): Promise<void> {
  const gcsBucket = getBucket();

  if (!gcsBucket) {
    console.log(`[BackgroundTasks] Skipping GCS write for ${taskId} (no bucket configured)`);
    return;
  }

  const filePath = `background-tasks/${taskId}.json`;

  try {
    const file = gcsBucket.file(filePath);
    await file.save(JSON.stringify(data, null, 2), {
      metadata: { contentType: 'application/json' },
    });
    console.log(`[BackgroundTasks] Wrote ${filePath} to GCS`);
  } catch (error) {
    console.error(`[BackgroundTasks] Failed to write ${filePath}:`, error);
    throw error;
  }
}

/**
 * Read a task completion marker from GCS.
 *
 * @param taskId - Unique identifier for the task
 * @returns The task data if exists, undefined otherwise
 */
export async function readTaskFromGcs(taskId: string): Promise<BackgroundTaskData | undefined> {
  const gcsBucket = getBucket();

  if (!gcsBucket) {
    console.log(`[BackgroundTasks] Skipping GCS read for ${taskId} (no bucket configured)`);
    return undefined;
  }

  const filePath = `background-tasks/${taskId}.json`;

  try {
    const file = gcsBucket.file(filePath);
    const [exists] = await file.exists();

    if (!exists) {
      return undefined;
    }

    const [content] = await file.download();
    return JSON.parse(content.toString()) as BackgroundTaskData;
  } catch (error) {
    console.error(`[BackgroundTasks] Failed to read ${filePath}:`, error);
    throw error;
  }
}

/**
 * Delete a task completion marker from GCS.
 *
 * @param taskId - Unique identifier for the task
 * @returns true if deleted, false if not found
 */
export async function deleteTaskFromGcs(taskId: string): Promise<boolean> {
  const gcsBucket = getBucket();

  if (!gcsBucket) {
    console.log(`[BackgroundTasks] Skipping GCS delete for ${taskId} (no bucket configured)`);
    return false;
  }

  const filePath = `background-tasks/${taskId}.json`;

  try {
    const file = gcsBucket.file(filePath);
    await file.delete({ ignoreNotFound: true });
    console.log(`[BackgroundTasks] Deleted ${filePath} from GCS`);
    return true;
  } catch (error) {
    console.error(`[BackgroundTasks] Failed to delete ${filePath}:`, error);
    throw error;
  }
}

/**
 * Check if a task completion marker exists in GCS.
 *
 * @param taskId - Unique identifier for the task
 * @returns true if exists, false otherwise
 */
export async function taskExistsInGcs(taskId: string): Promise<boolean> {
  const gcsBucket = getBucket();

  if (!gcsBucket) {
    return false;
  }

  const filePath = `background-tasks/${taskId}.json`;

  try {
    const file = gcsBucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error(`[BackgroundTasks] Failed to check existence of ${filePath}:`, error);
    return false;
  }
}
