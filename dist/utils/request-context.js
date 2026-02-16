import { AsyncLocalStorage } from 'async_hooks';
import { createLogger } from './logger.js';
const log = createLogger('RequestContext');
/**
 * Request-scoped context for tracking cache tags during SSR.
 * Uses AsyncLocalStorage to maintain isolation between concurrent requests.
 */
export class RequestContext {
    /**
     * Add tags to the current request context.
     * Called by cache handler during cache hits.
     */
    static addTags(tags) {
        const context = this.storage.getStore();
        if (context) {
            context.tags.push(...tags);
            log.debug(`Added ${tags.length} tags to request context: ${tags.join(', ')}`);
        }
        else {
            log.warn('No request context available - tags will not be captured');
        }
    }
    /**
     * Get all unique tags accumulated during the current request.
     * Called by middleware before sending response.
     */
    static getTags() {
        const context = this.storage.getStore();
        if (!context) {
            return [];
        }
        // Remove duplicates using Set
        return [...new Set(context.tags)];
    }
    /**
     * Run a callback within a request context.
     * Must be called by middleware to initialize tracking.
     */
    static run(callback) {
        return this.storage.run({
            tags: [],
            startTime: Date.now(),
        }, callback);
    }
    /**
     * Check if running within a request context.
     * Useful for debugging and conditional logic.
     */
    static isActive() {
        return this.storage.getStore() !== undefined;
    }
}
RequestContext.storage = new AsyncLocalStorage();
//# sourceMappingURL=request-context.js.map