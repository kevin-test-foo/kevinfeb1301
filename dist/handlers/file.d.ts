import type { CacheStats, CacheHandlerValue, FileSystemCacheContext } from '../types.js';
import { BaseCacheHandler, type BuildMeta } from './base.js';
/**
 * File-based cache handler for local development.
 * Stores cache entries in the .next/cache directory.
 */
export declare class FileCacheHandler extends BaseCacheHandler {
    private readonly baseDir;
    private readonly fetchCacheDir;
    private readonly routeCacheDir;
    private readonly buildMetaFile;
    private readonly tagsDir;
    private readonly tagsMapFile;
    private readonly tagsBuffer;
    constructor(context: FileSystemCacheContext);
    private ensureCacheDir;
    protected initializeTagsMapping(): Promise<void>;
    /**
     * Read tags mapping, flushing any pending updates first to ensure accuracy.
     */
    protected readTagsMapping(): Promise<Record<string, string[]>>;
    /**
     * Direct read from file system without flushing buffer.
     * Used internally by the buffer.
     */
    private readTagsMappingDirect;
    /**
     * Write tags mapping directly to file system.
     * Used by the buffer for batched writes.
     */
    protected writeTagsMapping(tagsMapping: Record<string, string[]>): Promise<void>;
    /**
     * Direct write to file system (sync).
     * Used internally by the buffer.
     */
    private writeTagsMappingDirect;
    /**
     * Override to use buffered updates instead of immediate writes.
     */
    protected updateTagsMapping(cacheKey: string, tags: string[], isDelete?: boolean): Promise<void>;
    /**
     * Override to use buffered deletes instead of immediate writes.
     */
    protected updateTagsMappingBulkDelete(cacheKeysToDelete: string[], _tagsMapping: Record<string, string[]>): Promise<void>;
    private getCacheFilePath;
    protected readCacheEntry(cacheKey: string, cacheType: 'fetch' | 'route'): Promise<CacheHandlerValue | null>;
    protected writeCacheEntry(cacheKey: string, cacheValue: CacheHandlerValue, cacheType: 'fetch' | 'route'): Promise<void>;
    protected deleteCacheEntry(cacheKey: string, cacheType: 'fetch' | 'route'): Promise<void>;
    protected readBuildMeta(): Promise<BuildMeta>;
    protected writeBuildMeta(meta: BuildMeta): Promise<void>;
    protected invalidateRouteCache(): Promise<void>;
}
/**
 * Get cache statistics for the file-based cache.
 */
export declare function getSharedCacheStats(): Promise<CacheStats>;
/**
 * Clear all cache entries for the file-based cache.
 */
export declare function clearSharedCache(): Promise<number>;
export default FileCacheHandler;
//# sourceMappingURL=file.d.ts.map