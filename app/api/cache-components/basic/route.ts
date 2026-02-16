import { cacheLife } from 'next/cache';

/**
 * Basic 'use cache' directive test route
 *
 * Tests that the 'use cache' directive caches non-fetch operations.
 * Uses cacheLife('minutes') for a 1-minute cache duration.
 */

// Expensive computation that should be cached
async function computeExpensiveData() {
  'use cache';
  cacheLife('minutes');

  // Simulate expensive computation
  const startTime = Date.now();
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i);
  }
  const computeTime = Date.now() - startTime;

  return {
    result: Math.round(result),
    compute_time_ms: computeTime,
    computed_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/basic - Computing with use cache...');

    const data = await computeExpensiveData();
    const totalTime = Date.now() - startTime;

    console.log(`[API] /api/cache-components/basic - Completed in ${totalTime}ms (compute: ${data.compute_time_ms}ms)`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'minutes',
      total_time_ms: totalTime,
      fetched_at: new Date().toISOString(),
      description: "Uses 'use cache' directive with cacheLife('minutes') profile",
    });
  } catch (error) {
    console.error('[API] /api/cache-components/basic - Error:', error);

    return Response.json(
      {
        error: 'Failed to compute data',
        cache_type: 'use-cache-directive',
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
