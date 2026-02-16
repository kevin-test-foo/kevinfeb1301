import { createLogger } from '../utils/logger.js';
const edgeLog = createLogger('EdgeCacheClear');
/**
 * Edge cache clearer for clearing CDN cache via the outbound proxy.
 * This is an internal class not exposed in the public API.
 * @internal
 */
export class EdgeCacheClear {
    constructor(endpoint) {
        const proxyEndpoint = endpoint || process.env.OUTBOUND_PROXY_ENDPOINT;
        if (!proxyEndpoint) {
            throw new Error('OUTBOUND_PROXY_ENDPOINT environment variable is required for edge cache clearing');
        }
        this.baseUrl = `http://${proxyEndpoint}/rest/v0alpha1/cache`;
    }
    /**
     * Clear the entire edge cache (nuclear option).
     */
    async nukeCache() {
        const startTime = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(this.baseUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorText}`,
                    statusCode: response.status,
                    duration,
                };
            }
            edgeLog.debug(`Cleared entire edge cache in ${duration}ms`);
            return { success: true, statusCode: response.status, duration };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage, duration };
        }
    }
    /**
     * Clear specific paths from the edge cache (granular invalidation).
     * @param paths Array of paths to clear (e.g., ['/blogs/my-post', '/blogs'])
     */
    async clearPaths(paths) {
        if (paths.length === 0) {
            return { success: true, duration: 0, paths: [] };
        }
        const startTime = Date.now();
        const results = [];
        try {
            const clearPromises = paths.map((routePath) => this.clearSinglePath(routePath, results));
            await Promise.all(clearPromises);
            const duration = Date.now() - startTime;
            const successCount = results.filter((r) => r.success).length;
            const clearedPaths = results.filter((r) => r.success).map((r) => r.path);
            edgeLog.debug(`Cleared ${successCount}/${paths.length} paths in ${duration}ms`);
            return {
                success: successCount > 0,
                duration,
                paths: clearedPaths,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage, duration, paths: [] };
        }
    }
    async clearSinglePath(routePath, results) {
        try {
            const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
            const cleanPath = normalizedPath.replace(/\/$/, '') || '/';
            const pathSegment = cleanPath === '/' ? '' : cleanPath.substring(1);
            const url = `${this.baseUrl}/paths/${pathSegment}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                results.push({ path: routePath, success: true });
            }
            else {
                edgeLog.warn(`Failed to clear path ${routePath}: HTTP ${response.status}`);
                results.push({ path: routePath, success: false });
            }
        }
        catch (error) {
            edgeLog.warn(`Error clearing path ${routePath}:`, error);
            results.push({ path: routePath, success: false });
        }
    }
    /**
     * Clear a single path from the edge cache.
     */
    async clearPath(routePath) {
        return this.clearPaths([routePath]);
    }
    /**
     * Clear paths in the background (non-blocking).
     */
    clearPathsInBackground(paths, context) {
        if (paths.length === 0)
            return;
        this.clearPaths(paths)
            .then((result) => {
            if (result.success) {
                edgeLog.debug(`Background path clear for ${context}: ${result.paths?.length} paths cleared`);
            }
            else {
                edgeLog.warn(`Background path clear failed for ${context}: ${result.error}`);
            }
        })
            .catch((error) => {
            edgeLog.error(`Background path clear error for ${context}:`, error);
        });
    }
    /**
     * Clear a single path in the background (non-blocking).
     */
    clearPathInBackground(routePath, context) {
        this.clearPathsInBackground([routePath], context);
    }
    /**
     * Clear cache entries by key/tag.
     * @param keys Array of cache keys/tags to clear
     */
    async clearKeys(keys) {
        if (keys.length === 0) {
            return { success: true, duration: 0, paths: [] };
        }
        const startTime = Date.now();
        const results = [];
        try {
            const clearPromises = keys.map((key) => this.clearSingleKey(key, results));
            await Promise.all(clearPromises);
            const duration = Date.now() - startTime;
            const successCount = results.filter((r) => r.success).length;
            const clearedKeys = results.filter((r) => r.success).map((r) => r.key);
            edgeLog.debug(`Cleared ${successCount}/${keys.length} keys in ${duration}ms`);
            return {
                success: successCount > 0,
                duration,
                paths: clearedKeys,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: errorMessage, duration, paths: [] };
        }
    }
    async clearSingleKey(key, results) {
        try {
            const url = `${this.baseUrl}/keys/${encodeURIComponent(key)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                results.push({ key, success: true });
            }
            else {
                edgeLog.warn(`Failed to clear key ${key}: HTTP ${response.status}`);
                results.push({ key, success: false });
            }
        }
        catch (error) {
            edgeLog.warn(`Error clearing key ${key}:`, error);
            results.push({ key, success: false });
        }
    }
    /**
     * Clear keys in the background (non-blocking).
     */
    clearKeysInBackground(keys, context) {
        if (keys.length === 0)
            return;
        this.clearKeys(keys)
            .then((result) => {
            if (result.success) {
                edgeLog.debug(`Background key clear for ${context}: ${result.paths?.length} keys cleared`);
            }
            else {
                edgeLog.warn(`Background key clear failed for ${context}: ${result.error}`);
            }
        })
            .catch((error) => {
            edgeLog.error(`Background key clear error for ${context}:`, error);
        });
    }
    /**
     * Clear entire cache in the background (non-blocking).
     */
    nukeCacheInBackground(context) {
        this.nukeCache()
            .then((result) => {
            if (result.success) {
                edgeLog.debug(`Background nuke successful for ${context} (${result.duration}ms)`);
            }
            else {
                edgeLog.warn(`Background nuke failed for ${context}: ${result.error}`);
            }
        })
            .catch((error) => {
            edgeLog.error(`Background nuke error for ${context}:`, error);
        });
    }
}
/**
 * Creates an EdgeCacheClear instance if the environment is configured.
 * Returns null if edge cache clearing is not available.
 * @internal
 */
export function createEdgeCacheClearer() {
    try {
        return new EdgeCacheClear();
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=edge-cache-clear.js.map