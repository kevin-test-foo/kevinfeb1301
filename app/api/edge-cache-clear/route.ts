import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to test edge cache clearing via the outbound proxy.
 *
 * DELETE /api/edge-cache-clear - Clear entire CDN cache (nuke)
 * DELETE /api/edge-cache-clear?key=<tag> - Clear specific cache key/tag
 * DELETE /api/edge-cache-clear?path=<url-path> - Clear specific URL path from CDN
 *
 * This is for testing purposes to validate the outbound proxy integration.
 */

export async function DELETE(request: NextRequest) {
  const endpoint = process.env.OUTBOUND_PROXY_ENDPOINT;

  if (!endpoint) {
    return NextResponse.json(
      {
        error: 'OUTBOUND_PROXY_ENDPOINT not configured',
        message: 'Edge cache clearing is not available in this environment'
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const path = url.searchParams.get('path');

  const startTime = Date.now();

  try {
    let targetUrl: string;
    let operation: string;

    if (key) {
      // Clear specific key/tag
      targetUrl = `http://${endpoint}/rest/v0alpha1/cache/keys/${encodeURIComponent(key)}`;
      operation = `clear-key:${key}`;
    } else if (path) {
      // Clear specific URL path from CDN
      // Strip leading slash and encode each segment individually so
      // slashes remain as path separators in the proxy URL.
      // Root path "/" falls through to nuke-all since the proxy has
      // no single-segment representation for it.
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      if (!normalizedPath) {
        // Root path — use full cache clear
        targetUrl = `http://${endpoint}/rest/v0alpha1/cache`;
        operation = `clear-path:/`;
      } else {
        const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
        targetUrl = `http://${endpoint}/rest/v0alpha1/cache/paths/${encodedPath}`;
        operation = `clear-path:${path}`;
      }
    } else {
      // Nuke entire cache
      targetUrl = `http://${endpoint}/rest/v0alpha1/cache`;
      operation = 'nuke-all';
    }

    console.log(`[EdgeCacheClear] ${operation} - Calling: ${targetUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    const responseText = await response.text().catch(() => '');

    console.log(`[EdgeCacheClear] ${operation} - Status: ${response.status}, Duration: ${duration}ms`);

    return NextResponse.json(
      {
        success: response.ok,
        operation,
        status: response.status,
        duration_ms: duration,
        response: responseText || null,
        cleared_at: new Date().toISOString(),
      },
      {
        status: response.ok ? 200 : 502,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[EdgeCacheClear] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration_ms: duration,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        },
      }
    );
  }
}

export async function GET() {
  const endpoint = process.env.OUTBOUND_PROXY_ENDPOINT;

  return NextResponse.json({
    endpoint_configured: !!endpoint,
    usage: {
      'DELETE /api/edge-cache-clear': 'Clear entire CDN cache (nuke)',
      'DELETE /api/edge-cache-clear?key=<tag>': 'Clear specific cache key/tag',
      'DELETE /api/edge-cache-clear?path=<url-path>': 'Clear specific URL path from CDN',
    },
    examples: {
      nuke: 'curl -X DELETE https://your-site/api/edge-cache-clear',
      key: 'curl -X DELETE https://your-site/api/edge-cache-clear?key=api-posts',
      path: 'curl -X DELETE https://your-site/api/edge-cache-clear?path=/blogs',
    },
  });
}
