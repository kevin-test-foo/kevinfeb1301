import { createLogger } from './logger.js';
/**
 * Buffers tag mapping updates to avoid GCS rate limiting.
 * Collects updates in memory and flushes them at most once per second.
 */
export class TagsBuffer {
    constructor(config) {
        this.pendingUpdates = [];
        this.flushTimer = null;
        this.lastFlushTime = 0;
        this.isFlushing = false;
        this.flushPromise = null;
        this.flushIntervalMs = config.flushIntervalMs ?? 1000;
        this.readTagsMapping = config.readTagsMapping;
        this.writeTagsMapping = config.writeTagsMapping;
        this.log = createLogger(config.handlerName ?? 'TagsBuffer');
    }
    /**
     * Queue a tag addition for a cache key.
     * The update will be flushed to storage at most once per second.
     */
    addTags(cacheKey, tags) {
        if (tags.length === 0) {
            return;
        }
        this.pendingUpdates.push({
            type: 'add',
            cacheKey,
            tags,
        });
        this.scheduleFlush();
    }
    /**
     * Queue a cache key deletion from all tags.
     * The update will be flushed to storage at most once per second.
     */
    deleteKey(cacheKey) {
        this.pendingUpdates.push({
            type: 'delete',
            cacheKey,
        });
        this.scheduleFlush();
    }
    /**
     * Queue multiple cache keys for deletion from all tags.
     */
    deleteKeys(cacheKeys) {
        for (const cacheKey of cacheKeys) {
            this.pendingUpdates.push({
                type: 'delete',
                cacheKey,
            });
        }
        if (cacheKeys.length > 0) {
            this.scheduleFlush();
        }
    }
    /**
     * Force an immediate flush of pending updates.
     * Use this when you need to ensure updates are persisted (e.g., before reading).
     */
    async flush() {
        // If already flushing, wait for that to complete
        if (this.flushPromise) {
            await this.flushPromise;
            // After waiting, check if there are still pending updates
            if (this.pendingUpdates.length > 0) {
                return this.flush();
            }
            return;
        }
        if (this.pendingUpdates.length === 0) {
            return;
        }
        this.flushPromise = this.doFlush();
        try {
            await this.flushPromise;
        }
        finally {
            this.flushPromise = null;
        }
    }
    /**
     * Get the number of pending updates.
     */
    get pendingCount() {
        return this.pendingUpdates.length;
    }
    scheduleFlush() {
        // If a timer is already scheduled, let it handle the flush
        if (this.flushTimer) {
            return;
        }
        const timeSinceLastFlush = Date.now() - this.lastFlushTime;
        const delay = Math.max(0, this.flushIntervalMs - timeSinceLastFlush);
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            this.flush().catch((error) => {
                this.log.error('Error during scheduled flush:', error);
            });
        }, delay);
    }
    async doFlush() {
        if (this.isFlushing || this.pendingUpdates.length === 0) {
            return;
        }
        this.isFlushing = true;
        // Take all pending updates
        const updates = this.pendingUpdates;
        this.pendingUpdates = [];
        try {
            // Read current state
            const tagsMapping = await this.readTagsMapping();
            // Apply all updates
            this.applyUpdates(tagsMapping, updates);
            // Write back
            await this.writeTagsMapping(tagsMapping);
            this.lastFlushTime = Date.now();
            this.log.debug(`Flushed ${updates.length} tag updates`);
        }
        catch (error) {
            // On failure, put updates back for retry
            this.pendingUpdates = [...updates, ...this.pendingUpdates];
            this.log.error('Error flushing tags, will retry:', error);
            // Schedule a retry with backoff
            if (!this.flushTimer) {
                this.flushTimer = setTimeout(() => {
                    this.flushTimer = null;
                    this.flush().catch((e) => {
                        this.log.error('Retry flush failed:', e);
                    });
                }, this.flushIntervalMs * 2);
            }
        }
        finally {
            this.isFlushing = false;
        }
    }
    applyUpdates(tagsMapping, updates) {
        // Collect all keys to delete for efficient removal
        const keysToDelete = new Set();
        for (const update of updates) {
            if (update.type === 'delete') {
                keysToDelete.add(update.cacheKey);
            }
        }
        // Remove deleted keys from all tags
        if (keysToDelete.size > 0) {
            for (const tag of Object.keys(tagsMapping)) {
                tagsMapping[tag] = tagsMapping[tag].filter((key) => !keysToDelete.has(key));
                if (tagsMapping[tag].length === 0) {
                    delete tagsMapping[tag];
                }
            }
        }
        // Add new tag mappings
        for (const update of updates) {
            if (update.type === 'add' && update.tags) {
                for (const tag of update.tags) {
                    if (!tagsMapping[tag]) {
                        tagsMapping[tag] = [];
                    }
                    if (!tagsMapping[tag].includes(update.cacheKey)) {
                        tagsMapping[tag].push(update.cacheKey);
                    }
                }
            }
        }
    }
    /**
     * Cancel any pending flush timer.
     * Call this when shutting down.
     */
    destroy() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
    }
}
//# sourceMappingURL=tags-buffer.js.map