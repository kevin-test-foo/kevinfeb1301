// Middleware for automatic Surrogate-Key header propagation
// Captures cache tags from cacheTag() calls and sets Surrogate-Key headers
// for CDN cache invalidation (Pantheon Advanced Page Cache integration)
//
// See: lib/wordpressService.ts for cacheTag() usage
// See: @pantheon-systems/nextjs-cache-handler/middleware for implementation

import { createSurrogateKeyMiddleware } from '@pantheon-systems/nextjs-cache-handler/middleware';

// Create middleware with debug logging enabled
export const middleware = createSurrogateKeyMiddleware({
  debug: true,
  fallbackKey: 'nextjs-app',
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
