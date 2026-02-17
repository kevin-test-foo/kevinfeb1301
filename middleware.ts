// Middleware for automatic Surrogate-Key header propagation
// Captures cache tags from cacheTag() calls and sets Surrogate-Key headers
// for CDN cache invalidation (Pantheon Advanced Page Cache integration)
//
// This custom middleware bridges BOTH caching systems:
// - RequestContext (legacy cache handler for ISR/route handlers)
// - CacheTagContext ('use cache' directive for WordPress blog pages)
//
// See: lib/wordpressService.ts for cacheTag() usage

import { createUnifiedSurrogateKeyMiddleware } from './lib/surrogate-key-middleware';

// Create unified middleware with debug logging enabled
// WARNING: Using delayed header write pattern - this is experimental and may not work reliably
export const middleware = createUnifiedSurrogateKeyMiddleware({
  debug: true,
  fallbackKey: 'nextjs-app',
  delayMs: 500, // Wait for tags to be captured (race condition!)
});

// Apply middleware to blog pages and other cached routes
// Excludes API routes, static assets, and Next.js internals
export const config = {
  matcher: [
    // Blog pages - primary use case for surrogate keys
    '/blogs/:path*',

    // Include other pages that use caching
    '/',
    '/about',

    // Exclude API routes, static files, and Next.js internals
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
