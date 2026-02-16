/**
 * Request-scoped context for tracking cache tags during SSR.
 * Uses AsyncLocalStorage to maintain isolation between concurrent requests.
 */
export declare class RequestContext {
    private static storage;
    /**
     * Add tags to the current request context.
     * Called by cache handler during cache hits.
     */
    static addTags(tags: string[]): void;
    /**
     * Get all unique tags accumulated during the current request.
     * Called by middleware before sending response.
     */
    static getTags(): string[];
    /**
     * Run a callback within a request context.
     * Must be called by middleware to initialize tracking.
     */
    static run<T>(callback: () => T): T;
    /**
     * Check if running within a request context.
     * Useful for debugging and conditional logic.
     */
    static isActive(): boolean;
}
//# sourceMappingURL=request-context.d.ts.map