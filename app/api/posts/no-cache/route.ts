import { NextRequest, NextResponse } from 'next/server';
import { fetchPostsWithNoCacheAndMetadata } from '../../../../lib/blogService';

// Next.js 16: No 'use cache' means no caching (SSR behavior)
// Timestamp is fresh on every request

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[API] /api/posts/no-cache - Using blogService...');

    // Use the metadata version for consistency - timestamp will always be fresh
    const { posts, cachedAt } = await fetchPostsWithNoCacheAndMetadata();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/posts/no-cache - Completed in ${duration}ms, fetched at ${cachedAt}`);

    return NextResponse.json({
      data: posts,
      cache_strategy: 'no-store',
      duration_ms: duration,
      fetched_at: cachedAt, // Fresh timestamp on every request
      description: 'Always fetches fresh data, never cached'
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[API] /api/posts/no-cache - Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch posts',
        cache_strategy: 'no-store',
        duration_ms: Date.now() - startTime,
        fetched_at: new Date().toISOString()
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}