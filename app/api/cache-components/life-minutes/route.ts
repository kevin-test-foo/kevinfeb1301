import { cacheLife } from 'next/cache';

/**
 * cacheLife('minutes') profile test route
 *
 * Tests the predefined 'minutes' cache profile.
 * Expected behavior: ~60 second cache duration.
 */

async function getDataWithMinutesCache() {
  'use cache';
  cacheLife('minutes');

  return {
    value: Math.random(),
    cached_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/life-minutes - Using cacheLife(minutes)...');

    const data = await getDataWithMinutesCache();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/cache-components/life-minutes - Completed in ${duration}ms`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'minutes',
      expected_duration: '~60 seconds',
      duration_ms: duration,
      fetched_at: new Date().toISOString(),
      description: "Uses cacheLife('minutes') predefined profile",
    });
  } catch (error) {
    console.error('[API] /api/cache-components/life-minutes - Error:', error);

    return Response.json(
      {
        error: 'Failed to get cached data',
        cache_profile: 'minutes',
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
