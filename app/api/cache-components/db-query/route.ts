import { cacheLife } from 'next/cache';

/**
 * Database query simulation test route
 *
 * Tests caching of non-fetch operations (simulated DB query).
 * The 'use cache' directive should cache the entire operation.
 */

// Simulated database query with artificial delay
async function queryDatabase() {
  'use cache';
  cacheLife('minutes');

  const queryStart = Date.now();

  // Simulate slow database query (200ms)
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Simulate query results
  const results = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));

  const queryTime = Date.now() - queryStart;

  return {
    results,
    query_time_ms: queryTime,
    queried_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/db-query - Simulating DB query with use cache...');

    const data = await queryDatabase();
    const totalTime = Date.now() - startTime;

    // If cached, total time should be much less than query time
    const cacheHit = totalTime < 50;

    console.log(`[API] /api/cache-components/db-query - Completed in ${totalTime}ms (cache ${cacheHit ? 'HIT' : 'MISS'})`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'minutes',
      operation: 'database-query',
      total_time_ms: totalTime,
      cache_hit: cacheHit,
      fetched_at: new Date().toISOString(),
      description: 'Simulates caching of database query operations',
    });
  } catch (error) {
    console.error('[API] /api/cache-components/db-query - Error:', error);

    return Response.json(
      {
        error: 'Failed to query database',
        operation: 'database-query',
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
