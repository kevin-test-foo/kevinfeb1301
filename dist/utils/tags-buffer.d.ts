/**
 * Buffered tags manager for GCS to avoid rate limiting.
 * GCS has a rate limit of 1 write per second per object.
 * This buffer collects tag updates and flushes them periodically.
 */
export interface TagsBufferConfig {
    /** Minimum interval between flushes in milliseconds. Default: 1000ms */
    flushIntervalMs?: number;
    /** Read the current tags mapping from storage */
    readTagsMapping: () => Promise<Record<string, string[]>>;
    /** Write the tags mapping to storage */
    writeTagsMapping: (tagsMapping: Record<string, string[]>) => Promise<void>;
    /** Handler name for logging */
    handlerName?: string;
}
/**
 * Buffers tag mapping updates to avoid GCS rate limiting.
 * Collects updates in memory and flushes them at most once per second.
 */
export declare class TagsBuffer {
    private readonly flushIntervalMs;
    private readonly readTagsMapping;
    private readonly writeTagsMapping;
    private readonly log;
    private pendingUpdates;
    private flushTimer;
    private lastFlushTime;
    private isFlushing;
    private flushPromise;
    constructor(config: TagsBufferConfig);
    /**
     * Queue a tag addition for a cache key.
     * The update will be flushed to storage at most once per second.
     */
    addTags(cacheKey: string, tags: string[]): void;
    /**
     * Queue a cache key deletion from all tags.
     * The update will be flushed to storage at most once per second.
     */
    deleteKey(cacheKey: string): void;
    /**
     * Queue multiple cache keys for deletion from all tags.
     */
    deleteKeys(cacheKeys: string[]): void;
    /**
     * Force an immediate flush of pending updates.
     * Use this when you need to ensure updates are persisted (e.g., before reading).
     */
    flush(): Promise<void>;
    /**
     * Get the number of pending updates.
     */
    get pendingCount(): number;
    private scheduleFlush;
    private doFlush;
    private applyUpdates;
    /**
     * Cancel any pending flush timer.
     * Call this when shutting down.
     */
    destroy(): void;
}
//# sourceMappingURL=tags-buffer.d.ts.map