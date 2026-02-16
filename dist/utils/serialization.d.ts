import type { CacheData, SerializedCacheData } from '../types.js';
/**
 * Serializes cache data for JSON storage.
 * Converts Buffers to base64 strings and Maps to serializable objects.
 */
export declare function serializeForStorage(data: CacheData): SerializedCacheData;
/**
 * Deserializes cache data from JSON storage.
 * Converts base64 strings back to Buffers and serialized Maps back to Map objects.
 */
export declare function deserializeFromStorage(data: SerializedCacheData): CacheData;
//# sourceMappingURL=serialization.d.ts.map