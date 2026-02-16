import type { CacheStats, CacheHandlerValue, FileSystemCacheContext } from '../types.js';
import { BaseCacheHandler, type BuildMeta } from './base.js';
/**
 * Google Cloud Storage cache handler for production/Pantheon environments.
 * Stores cache entries in a GCS bucket.
 */
export declare class GcsCacheHandler extends BaseCacheHandler {
    private readonly bucket;
    private readonly fetchCachePrefix;
    private readonly routeCachePrefix;
    private readonly buildMetaKey;
    private readonly tagsPrefix;
    private readonly tagsMapKey;
    private readonly edgeCacheClearer;
    private readonly tagsBuffer;
    constructor(context: FileSystemCacheContext);
    protected initializeTagsMapping(): Promise<void>;
    /**
     * Read tags mapping, flushing any pending updates first to ensure accuracy.
     */
    protected readTagsMapping(): Promise<Record<string, string[]>>;
    /**
     * Direct read from GCS without flushing buffer.
     * Used internally by the buffer.
     */
    private readTagsMappingDirect;
    /**
     * Write tags mapping directly to GCS.
     * Used by the buffer for batched writes.
     */
    protected writeTagsMapping(tagsMapping: Record<string, string[]>): Promise<void>;
    /**
     * Override to use buffered updates instead of immediate writes.
     */
    protected updateTagsMapping(cacheKey: string, tags: string[], isDelete?: boolean): Promise<void>;
    /**
     * Override to use buffered deletes instead of immediate writes.
     */
    protected updateTagsMappingBulkDelete(cacheKeysToDelete: string[], _tagsMapping: Record<string, string[]>): Promise<void>;
    private getCacheKey;
    protected readCacheEntry(cacheKey: string, cacheType: 'fetch' | 'route'): Promise<CacheHandlerValue | null>;
    protected writeCacheEntry(cacheKey: string, cacheValue: CacheHandlerValue, cacheType: 'fetch' | 'route'): Promise<void>;
    protected deleteCacheEntry(cacheKey: string, cacheType: 'fetch' | 'route'): Promise<void>;
    protected readBuildMeta(): Promise<BuildMeta>;
    protected writeBuildMeta(meta: BuildMeta): Promise<void>;
    protected invalidateRouteCache(): Promise<void>;
    private clearEdgeCache;
    protected onRevalidateComplete(tags: string[], deletedKeys: string[]): Promise<void>;
    /**
     * Called when a route cache entry is set (ISR page update).
     * Clears the edge cache for this specific route so users get the fresh version.
     */
    protected onRouteCacheSet(cacheKey: string): void;
    private cacheKeyToRoutePath;
    private extractRoutePaths;
}
/**
 * Get cache statistics for the GCS-based cache.
 */
export declare function getSharedCacheStats(): Promise<CacheStats>;
/**
 * Clear all cache entries for the GCS-based cache.
 */
export declare function clearSharedCache(): Promise<number>;
export default GcsCacheHandler;
//# sourceMappingURL=gcs.d.ts.map