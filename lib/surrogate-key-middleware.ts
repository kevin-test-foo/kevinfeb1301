import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom middleware that captures cache tags from 'use cache' directive.
 * Specifically designed for pages using cacheTag() calls (like WordPress blog pages).
 *
 * This middleware reads from the globalThis fallback that use-cache handlers write to,
 * since the Symbol.for CacheTagContext pattern doesn't propagate to Edge middleware.
 *
 * NOTE: Edge middleware cannot import cache handler classes due to Node.js API usage.
 */

function getGlobalFallbackTags(): string[] {
  const globalTags = (globalThis as any).__pantheonSurrogateKeyTags;
  if (Array.isArray(globalTags) && globalTags.length > 0) {
    // Get unique tags and clear the global store for next request
    const uniqueTags = [...new Set(globalTags)];
    (globalThis as any).__pantheonSurrogateKeyTags = [];
    return uniqueTags;
  }
  return [];
}

export function createUnifiedSurrogateKeyMiddleware(options: {
  debug?: boolean;
  fallbackKey?: string;
} = {}) {
  const { debug = false, fallbackKey = 'nextjs-app' } = options;

  return function middleware(request: NextRequest): NextResponse {
    const { pathname } = request.nextUrl;

    if (debug) {
      console.log(`[SurrogateKey] Processing: ${pathname}`);
    }

    const response = NextResponse.next();

    // Collect tags from globalThis (written by use-cache handlers)
    const capturedTags = getGlobalFallbackTags();

    // Get existing Surrogate-Key from next.config.mjs
    const existingKey = response.headers.get('Surrogate-Key');
    const existingTags = existingKey && existingKey !== 'unknown'
      ? existingKey.split(/\s+/).filter(Boolean)
      : [];

    // Combine and deduplicate tags
    const allTags = [...new Set([...existingTags, ...capturedTags])];

    if (debug) {
      console.log(`[SurrogateKey] Tags from globalThis: ${capturedTags.length}`);
      console.log(`[SurrogateKey] Total unique tags: ${allTags.length}`);
      if (capturedTags.length > 0) {
        console.log(`[SurrogateKey] Tags: ${capturedTags.join(', ')}`);
      }
    }

    if (allTags.length > 0) {
      const surrogateKey = allTags.join(' ');
      response.headers.set('Surrogate-Key', surrogateKey);

      if (debug) {
        console.log(`[SurrogateKey] Set header: ${surrogateKey}`);
        response.headers.set('x-cache-tags-count', String(allTags.length));
      }
    } else if (fallbackKey) {
      if (!existingKey) {
        response.headers.set('Surrogate-Key', fallbackKey);
      }
      if (debug) {
        console.log(`[SurrogateKey] No tags captured, using fallback: ${fallbackKey}`);
      }
    }

    return response;
  };
}
