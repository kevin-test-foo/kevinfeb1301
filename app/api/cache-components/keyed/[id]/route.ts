import { cacheLife } from 'next/cache';

/**
 * Cache key validation test route
 *
 * Tests that function arguments become part of the cache key.
 * Different IDs should create separate cache entries.
 */

// Mock data fetcher with argument-based caching
async function fetchById(id: string) {
  'use cache';
  cacheLife('hours');

  // Simulate API/database fetch
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    id,
    name: `Item ${id}`,
    description: `This is item number ${id}`,
    random_value: Math.random(),
    fetched_at: new Date().toISOString(),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    console.log(`[API] /api/cache-components/keyed/${id} - Fetching with cache key...`);

    const data = await fetchById(id);
    const duration = Date.now() - startTime;

    // If cached, duration should be much less than 100ms
    const cacheHit = duration < 50;

    console.log(`[API] /api/cache-components/keyed/${id} - Completed in ${duration}ms (cache ${cacheHit ? 'HIT' : 'MISS'})`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'hours',
      cache_key_includes: ['id'],
      id_used: id,
      duration_ms: duration,
      cache_hit: cacheHit,
      fetched_at: new Date().toISOString(),
      description: 'Function arguments become part of cache key',
    });
  } catch (error) {
    console.error(`[API] /api/cache-components/keyed/${id} - Error:`, error);

    return Response.json(
      {
        error: 'Failed to fetch by ID',
        id_used: id,
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
