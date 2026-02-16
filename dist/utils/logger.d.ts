/**
 * Debug logger that only logs when CACHE_DEBUG environment variable is set.
 * This allows verbose logging during development/debugging without cluttering
 * production logs.
 */
/**
 * Creates a logger instance for a specific handler.
 * Debug and info logs are only shown when CACHE_DEBUG=true.
 * Warn and error logs are always shown.
 */
export declare function createLogger(handlerName: string): {
    /**
     * Debug level - only shown when CACHE_DEBUG=true
     * Use for verbose operational logs (GET, SET, HIT, MISS, etc.)
     */
    debug: (message: string, ...args: unknown[]) => void;
    /**
     * Info level - only shown when CACHE_DEBUG=true
     * Use for important operational events (initialization, cache cleared, etc.)
     */
    info: (message: string, ...args: unknown[]) => void;
    /**
     * Warn level - always shown
     * Use for recoverable issues that might need attention
     */
    warn: (message: string, ...args: unknown[]) => void;
    /**
     * Error level - always shown
     * Use for errors that affect cache operations
     */
    error: (message: string, ...args: unknown[]) => void;
};
export type Logger = ReturnType<typeof createLogger>;
//# sourceMappingURL=logger.d.ts.map