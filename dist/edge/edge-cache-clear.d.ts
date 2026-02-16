/**
 * Result of a cache clear operation.
 * @internal
 */
interface CacheClearResult {
    success: boolean;
    error?: string;
    statusCode?: number;
    duration?: number;
    paths?: string[];
}
/**
 * Edge cache clearer for clearing CDN cache via the outbound proxy.
 * This is an internal class not exposed in the public API.
 * @internal
 */
export declare class EdgeCacheClear {
    private baseUrl;
    constructor(endpoint?: string);
    /**
     * Clear the entire edge cache (nuclear option).
     */
    nukeCache(): Promise<CacheClearResult>;
    /**
     * Clear specific paths from the edge cache (granular invalidation).
     * @param paths Array of paths to clear (e.g., ['/blogs/my-post', '/blogs'])
     */
    clearPaths(paths: string[]): Promise<CacheClearResult>;
    private clearSinglePath;
    /**
     * Clear a single path from the edge cache.
     */
    clearPath(routePath: string): Promise<CacheClearResult>;
    /**
     * Clear paths in the background (non-blocking).
     */
    clearPathsInBackground(paths: string[], context: string): void;
    /**
     * Clear a single path in the background (non-blocking).
     */
    clearPathInBackground(routePath: string, context: string): void;
    /**
     * Clear cache entries by key/tag.
     * @param keys Array of cache keys/tags to clear
     */
    clearKeys(keys: string[]): Promise<CacheClearResult>;
    private clearSingleKey;
    /**
     * Clear keys in the background (non-blocking).
     */
    clearKeysInBackground(keys: string[], context: string): void;
    /**
     * Clear entire cache in the background (non-blocking).
     */
    nukeCacheInBackground(context: string): void;
}
/**
 * Creates an EdgeCacheClear instance if the environment is configured.
 * Returns null if edge cache clearing is not available.
 * @internal
 */
export declare function createEdgeCacheClearer(): EdgeCacheClear | null;
export {};
//# sourceMappingURL=edge-cache-clear.d.ts.map