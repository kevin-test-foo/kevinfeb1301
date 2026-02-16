import { NextRequest, NextResponse } from 'next/server';
import { fetchPostsWithForceCacheAndMetadata } from '../../../../lib/blogService';

// Next.js 16: No legacy route segment configs needed
// Cache behavior is handled via 'use cache' in blogService

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[API] /api/posts/force-cache - Using blogService...');

    // Use the metadata version which captures timestamp inside the cached function
    const { posts, cachedAt } = await fetchPostsWithForceCacheAndMetadata();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/posts/force-cache - Completed in ${duration}ms, cached at ${cachedAt}`);

    return NextResponse.json({
      data: posts,
      cache_strategy: 'force-cache',
      duration_ms: duration,
      fetched_at: cachedAt, // Use timestamp from cached function
      description: 'Uses cache indefinitely, only fetches if no cache exists'
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('[API] /api/posts/force-cache - Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch posts',
        cache_strategy: 'force-cache',
        duration_ms: Date.now() - startTime,
        fetched_at: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}