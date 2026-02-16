import type { CacheData, CacheHandlerParametersGet, CacheHandlerParametersSet, CacheHandlerParametersRevalidateTag, CacheHandlerValue, FileSystemCacheContext, Revalidate, SerializedCacheData } from '../types.js';
import { type Logger } from '../utils/logger.js';
/**
 * Reset the build invalidation check flag.
 * Useful for testing purposes.
 * @internal
 */
export declare function resetBuildInvalidationCheck(): void;
export interface BuildMeta {
    buildId: string;
    timestamp: number;
}
/**
 * Abstract base class for cache handlers.
 * Provides shared functionality for tag mapping, serialization, and build invalidation.
 */
export declare abstract class BaseCacheHandler {
    protected readonly context: FileSystemCacheContext;
    protected readonly handlerName: string;
    protected readonly log: Logger;
    constructor(context: FileSystemCacheContext, handlerName: string);
    /**
     * Initialize the handler. Should be called after construction.
     * Handles build invalidation check and tags mapping initialization.
     */
    protected initialize(): Promise<void>;
    protected abstract initializeTagsMapping(): Promise<void>;
    protected abstract readTagsMapping(): Promise<Record<string, string[]>>;
    protected abstract writeTagsMapping(tagsMapping: Record<string, string[]>): Promise<void>;
    protected abstract readCacheEntry(cacheKey: string, cacheType: 'fetch' | 'route'): Promise<CacheHandlerValue | null>;
    protected abstract writeCacheEntry(cacheKey: string, cacheValue: CacheHandlerValue, cacheType: 'fetch' | 'route'): Promise<void>;
    protected abstract deleteCacheEntry(cacheKey: string, cacheType: 'fetch' | 'route'): Promise<void>;
    protected abstract readBuildMeta(): Promise<BuildMeta>;
    protected abstract writeBuildMeta(meta: BuildMeta): Promise<void>;
    protected abstract invalidateRouteCache(): Promise<void>;
    protected updateTagsMapping(cacheKey: string, tags: string[], isDelete?: boolean): Promise<void>;
    protected updateTagsMappingBulkDelete(cacheKeysToDelete: string[], tagsMapping: Record<string, string[]>): Promise<void>;
    /**
     * Removes cache keys from all tag mappings they're associated with.
     * This is used when cache entries are deleted to keep the tag mapping consistent.
     * Empty tags are cleaned up automatically.
     */
    private removeKeysFromAllTags;
    private addKeyToTags;
    private checkBuildInvalidation;
    protected serializeForStorage(data: CacheData): SerializedCacheData;
    protected deserializeFromStorage(data: SerializedCacheData): CacheData;
    protected determineCacheType(ctx?: CacheHandlerParametersGet[1]): 'fetch' | 'route';
    protected determineCacheTypeFromValue(incrementalCacheValue: CacheHandlerParametersSet[1]): 'fetch' | 'route';
    get(cacheKey: CacheHandlerParametersGet[0], ctx?: CacheHandlerParametersGet[1]): Promise<CacheHandlerValue | null>;
    /**
     * Captures cache tags for propagation to response headers.
     * Called during cache hits to track which tags apply to the current response.
     *
     * @param tags - Tags associated with the cache entry
     * @param cacheKey - The cache key being accessed
     * @param cacheType - Whether this is fetch or route cache
     */
    protected captureTagsForResponse(tags: Readonly<string[]>, cacheKey: string, cacheType: 'fetch' | 'route'): void;
    set(cacheKey: CacheHandlerParametersSet[0], incrementalCacheValue: CacheHandlerParametersSet[1], ctx: CacheHandlerParametersSet[2] & {
        tags?: string[];
        revalidate?: Revalidate;
    }): Promise<void>;
    revalidateTag(tag: CacheHandlerParametersRevalidateTag[0]): Promise<void>;
    /**
     * Hook called after revalidation is complete.
     * Subclasses can override to perform additional cleanup.
     */
    protected onRevalidateComplete(_tags: string[], _deletedKeys: string[]): Promise<void>;
    /**
     * Hook called when a route cache entry is set (ISR page update).
     * Subclasses can override to perform edge cache invalidation.
     */
    protected onRouteCacheSet(_cacheKey: string): void;
    private tryDeleteCacheEntry;
    resetRequestCache(): void;
}
//# sourceMappingURL=base.d.ts.map