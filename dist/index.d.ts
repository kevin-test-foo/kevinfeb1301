import type { CacheHandlerConfig, CacheStats } from './types.js';
import { FileCacheHandler } from './handlers/file.js';
import { GcsCacheHandler } from './handlers/gcs.js';
/**
 * Factory function to create a cache handler based on configuration.
 *
 * @param config - Configuration options for the cache handler
 * @returns A cache handler class that can be used with Next.js
 *
 * @example
 * ```typescript
 * // In your cacheHandler.ts file:
 * import { createCacheHandler } from '@pantheon-systems/nextjs-cache-handler';
 *
 * const CacheHandler = createCacheHandler({
 *   type: 'auto', // Auto-detect: GCS if CACHE_BUCKET exists, else file-based
 * });
 *
 * export default CacheHandler;
 * ```
 *
 * @example
 * ```javascript
 * // In your next.config.mjs:
 * const nextConfig = {
 *   cacheHandler: require.resolve('./cacheHandler'),
 *   cacheMaxMemorySize: 0,
 * };
 *
 * export default nextConfig;
 * ```
 */
export declare function createCacheHandler(config?: CacheHandlerConfig): typeof FileCacheHandler | typeof GcsCacheHandler;
/**
 * Get cache statistics for the current environment.
 * Automatically detects whether to use file-based or GCS cache stats.
 */
export declare function getSharedCacheStats(): Promise<CacheStats>;
/**
 * Clear all cache entries for the current environment.
 * Automatically detects whether to use file-based or GCS cache clearing.
 */
export declare function clearSharedCache(): Promise<number>;
export { FileCacheHandler } from './handlers/file.js';
export { GcsCacheHandler } from './handlers/gcs.js';
export { RequestContext } from './utils/request-context.js';
export { createSurrogateKeyMiddleware, middleware as surrogateKeyMiddleware, config as surrogateKeyMiddlewareConfig, type SurrogateKeyMiddlewareConfig, } from './middleware/index.js';
export type { CacheHandlerConfig, CacheStats, CacheEntryInfo, CacheContext, CacheEntry, CacheData, CacheHandlerValue, CacheHandlerParametersGet, CacheHandlerParametersSet, CacheHandlerParametersRevalidateTag, FileSystemCacheContext, Revalidate, LifespanParameters, SerializedBuffer, SerializedMap, SerializableValue, SerializedCacheData, } from './types.js';
//# sourceMappingURL=index.d.ts.map