import { cacheLife } from 'next/cache';

/**
 * cacheLife('blog') custom profile test route
 *
 * Tests the custom 'blog' cache profile defined in next.config.mjs:
 * - stale: 60 seconds
 * - revalidate: 300 seconds (5 minutes)
 * - expire: 3600 seconds (1 hour)
 */

async function getDataWithCustomCache() {
  'use cache';
  cacheLife('blog');

  return {
    value: Math.random(),
    cached_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/life-custom - Using cacheLife(blog)...');

    const data = await getDataWithCustomCache();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/cache-components/life-custom - Completed in ${duration}ms`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'blog',
      profile_config: {
        stale: 60,
        revalidate: 300,
        expire: 3600,
      },
      duration_ms: duration,
      fetched_at: new Date().toISOString(),
      description: "Uses custom cacheLife('blog') profile from next.config.mjs",
    });
  } catch (error) {
    console.error('[API] /api/cache-components/life-custom - Error:', error);

    return Response.json(
      {
        error: 'Failed to get cached data',
        cache_profile: 'blog',
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
