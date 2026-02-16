import { NextRequest, NextResponse } from 'next/server';
import { getSharedCacheStats, clearSharedCache, getUseCacheStats } from '@pantheon-systems/nextjs-cache-handler';

export async function GET(_request: NextRequest) {
  try {
    // Get stats from both cache systems in parallel
    const [legacyStats, useCacheStats] = await Promise.all([
      getSharedCacheStats(),
      getUseCacheStats(),
    ]);

    console.log(`[API] Cache stats - Legacy: ${legacyStats.size}, UseCache: ${useCacheStats.size}`);

    // Combine entries from both systems
    const combinedEntries = [
      ...legacyStats.entries,
      ...useCacheStats.entries,
    ];

    const combinedKeys = [
      ...legacyStats.keys,
      ...useCacheStats.keys,
    ];

    return NextResponse.json({
      message: 'Combined cache handler statistics (cacheHandler + cacheHandlers)',
      timestamp: new Date().toISOString(),
      cache_stats: {
        size: legacyStats.size + useCacheStats.size,
        entries: combinedEntries,
        keys: combinedKeys,
      },
      // Separate stats for debugging/testing
      legacy_cache: {
        size: legacyStats.size,
        entries: legacyStats.entries,
        keys: legacyStats.keys,
        description: 'cacheHandler (singular): ISR, route handlers, fetch cache',
      },
      use_cache: {
        size: useCacheStats.size,
        entries: useCacheStats.entries,
        keys: useCacheStats.keys,
        description: 'cacheHandlers (plural): use cache directive entries',
      },
      info: {
        handler_type: 'Combined Cache Handler',
        description: 'Reports from both cacheHandler (singular) and cacheHandlers (plural) systems'
      }
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[API] /api/cache-stats - Error:', error);

    return NextResponse.json({
      error: 'Failed to retrieve cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Access the shared file-based cache directly
    const sizeBefore = await clearSharedCache();

    console.log(`[API] Cache cleared - removed ${sizeBefore} entries`);

    return NextResponse.json({
      message: `Cleared ${sizeBefore} cache entries`,
      timestamp: new Date().toISOString(),
      cleared_count: sizeBefore,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[API] /api/cache-stats - Clear cache error:', error);

    return NextResponse.json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}