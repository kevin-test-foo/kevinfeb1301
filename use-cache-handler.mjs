// Use cache handler configuration for Next.js 16 'use cache' directive
// Uses @pantheon-systems/nextjs-cache-handler cacheHandlers (plural) support
//
// This handler enables Surrogate-Key header propagation for CDN cache invalidation
// when using 'use cache: remote' directive for runtime caching.
//
// Architecture:
// - Tags set via cacheTag() are stored with cache entries
// - On cache HIT, tags are propagated via CacheTagContext (Symbol.for pattern)
// - withSurrogateKey() reads tags from CacheTagContext and sets Surrogate-Key header
//
// Note: The handler now uses Symbol.for('@nextjs-cache-handler/tag-context') pattern
// internally to propagate tags. This allows cross-context access without direct
// module imports, similar to Next.js's @next/request-context pattern.

import { createUseCacheHandler } from '@pantheon-systems/nextjs-cache-handler';

// Initialize global tag store as fallback (used when Symbol.for pattern doesn't propagate)
globalThis.__pantheonSurrogateKeyTags = globalThis.__pantheonSurrogateKeyTags || [];

// Get the handler class based on environment
const UseCacheHandlerClass = createUseCacheHandler({
  type: 'auto', // Auto-detect: GCS if CACHE_BUCKET is set, otherwise file-based
});

// Next.js expects an object with handler methods, so we instantiate the class
const handler = new UseCacheHandlerClass();

// Export the handler instance directly
// Tag propagation is now handled internally by the handler via Symbol.for pattern
export default {
  get: handler.get.bind(handler),
  set: handler.set.bind(handler),
  refreshTags: handler.refreshTags.bind(handler),
  getExpiration: handler.getExpiration.bind(handler),
  updateTags: handler.updateTags.bind(handler),
};
// Cache bust: Wed Feb 11 17:30:07 PST 2026
