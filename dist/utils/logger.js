/**
 * Debug logger that only logs when CACHE_DEBUG environment variable is set.
 * This allows verbose logging during development/debugging without cluttering
 * production logs.
 */
function isDebugEnabled() {
    const debugValue = process.env.CACHE_DEBUG;
    return debugValue === 'true' || debugValue === '1';
}
function formatMessage(handlerName, message) {
    return `[${handlerName}] ${message}`;
}
/**
 * Creates a logger instance for a specific handler.
 * Debug and info logs are only shown when CACHE_DEBUG=true.
 * Warn and error logs are always shown.
 */
export function createLogger(handlerName) {
    return {
        /**
         * Debug level - only shown when CACHE_DEBUG=true
         * Use for verbose operational logs (GET, SET, HIT, MISS, etc.)
         */
        debug: (message, ...args) => {
            if (isDebugEnabled()) {
                console.log(formatMessage(handlerName, message), ...args);
            }
        },
        /**
         * Info level - only shown when CACHE_DEBUG=true
         * Use for important operational events (initialization, cache cleared, etc.)
         */
        info: (message, ...args) => {
            if (isDebugEnabled()) {
                console.log(formatMessage(handlerName, message), ...args);
            }
        },
        /**
         * Warn level - always shown
         * Use for recoverable issues that might need attention
         */
        warn: (message, ...args) => {
            console.warn(formatMessage(handlerName, message), ...args);
        },
        /**
         * Error level - always shown
         * Use for errors that affect cache operations
         */
        error: (message, ...args) => {
            console.error(formatMessage(handlerName, message), ...args);
        },
    };
}
//# sourceMappingURL=logger.js.map