import { NextRequest, NextResponse } from 'next/server';
import { fetchPostsWithRevalidateAndMetadata } from '../../../../lib/blogService';

// Next.js 16: Cache behavior handled via 'use cache' in blogService

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[API] /api/posts/revalidate - Using blogService...');

    // Use the metadata version which captures timestamp inside the cached function
    const { posts, cachedAt } = await fetchPostsWithRevalidateAndMetadata();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/posts/revalidate - Completed in ${duration}ms, cached at ${cachedAt}`);

    return NextResponse.json({
      data: posts,
      cache_strategy: 'revalidate-60s',
      duration_ms: duration,
      fetched_at: cachedAt, // Use timestamp from cached function
      description: 'Cached for 60 seconds, then revalidated on next request'
    });

  } catch (error) {
    console.error('[API] /api/posts/revalidate - Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch posts',
        cache_strategy: 'revalidate-60s',
        duration_ms: Date.now() - startTime,
        fetched_at: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}