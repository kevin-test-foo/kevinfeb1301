import { cacheLife } from 'next/cache';

/**
 * cacheLife('hours') profile test route
 *
 * Tests the predefined 'hours' cache profile.
 * Expected behavior: ~1 hour cache duration.
 */

async function getDataWithHoursCache() {
  'use cache';
  cacheLife('hours');

  return {
    value: Math.random(),
    cached_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/life-hours - Using cacheLife(hours)...');

    const data = await getDataWithHoursCache();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/cache-components/life-hours - Completed in ${duration}ms`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'hours',
      expected_duration: '~1 hour',
      duration_ms: duration,
      fetched_at: new Date().toISOString(),
      description: "Uses cacheLife('hours') predefined profile",
    });
  } catch (error) {
    console.error('[API] /api/cache-components/life-hours - Error:', error);

    return Response.json(
      {
        error: 'Failed to get cached data',
        cache_profile: 'hours',
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
