/**
 * Serializes cache data for JSON storage.
 * Converts Buffers to base64 strings and Maps to serializable objects.
 */
export function serializeForStorage(data) {
    const serialized = {};
    for (const [key, entry] of Object.entries(data)) {
        if (!isValidCacheEntry(entry)) {
            serialized[key] = entry;
            continue;
        }
        const value = entry.value;
        if (!value || typeof value !== 'object') {
            serialized[key] = entry;
            continue;
        }
        const serializedValue = serializeValue(value);
        serialized[key] = {
            ...entry,
            value: serializedValue,
        };
    }
    return serialized;
}
/**
 * Deserializes cache data from JSON storage.
 * Converts base64 strings back to Buffers and serialized Maps back to Map objects.
 */
export function deserializeFromStorage(data) {
    const deserialized = {};
    for (const [key, entry] of Object.entries(data)) {
        if (!isValidCacheEntry(entry)) {
            deserialized[key] = entry;
            continue;
        }
        const value = entry.value;
        if (!value || typeof value !== 'object') {
            deserialized[key] = entry;
            continue;
        }
        const deserializedValue = deserializeValue(value);
        deserialized[key] = {
            ...entry,
            value: deserializedValue,
        };
    }
    return deserialized;
}
function isValidCacheEntry(entry) {
    return entry !== null && typeof entry === 'object' && 'value' in entry;
}
function serializeValue(value) {
    const serializedValue = { ...value };
    // Convert body Buffer to base64 string for storage
    if (isBuffer(serializedValue.body)) {
        serializedValue.body = bufferToSerializable(serializedValue.body);
    }
    // Handle rscData if it's a Buffer
    if (isBuffer(serializedValue.rscData)) {
        serializedValue.rscData = bufferToSerializable(serializedValue.rscData);
    }
    // Handle segmentData if it's a Map with Buffers
    if (serializedValue.segmentData instanceof Map) {
        serializedValue.segmentData = mapToSerializable(serializedValue.segmentData);
    }
    return serializedValue;
}
function deserializeValue(value) {
    const deserializedValue = { ...value };
    // Convert base64 string back to Buffer for body
    if (isSerializedBuffer(deserializedValue.body)) {
        deserializedValue.body = serializableToBuffer(deserializedValue.body);
    }
    // Convert base64 string back to Buffer for rscData
    if (isSerializedBuffer(deserializedValue.rscData)) {
        deserializedValue.rscData = serializableToBuffer(deserializedValue.rscData);
    }
    // Convert serialized Map back to Map with Buffers
    if (isSerializedMap(deserializedValue.segmentData)) {
        deserializedValue.segmentData = serializableToMap(deserializedValue.segmentData);
    }
    return deserializedValue;
}
function isBuffer(value) {
    return Buffer.isBuffer(value);
}
function isSerializedBuffer(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'type' in value &&
        value.type === 'Buffer' &&
        'data' in value);
}
function isSerializedMap(value) {
    return (value !== null &&
        typeof value === 'object' &&
        'type' in value &&
        value.type === 'Map' &&
        'data' in value);
}
function bufferToSerializable(buffer) {
    return {
        type: 'Buffer',
        data: buffer.toString('base64'),
    };
}
function serializableToBuffer(serialized) {
    return Buffer.from(serialized.data, 'base64');
}
function mapToSerializable(map) {
    const segmentObj = {};
    for (const [segKey, segValue] of map.entries()) {
        if (Buffer.isBuffer(segValue)) {
            segmentObj[segKey] = bufferToSerializable(segValue);
        }
        else {
            segmentObj[segKey] = segValue;
        }
    }
    return {
        type: 'Map',
        data: segmentObj,
    };
}
function serializableToMap(serialized) {
    const segmentMap = new Map();
    for (const [segKey, segValue] of Object.entries(serialized.data)) {
        if (isSerializedBuffer(segValue)) {
            segmentMap.set(segKey, serializableToBuffer(segValue));
        }
        else {
            segmentMap.set(segKey, segValue);
        }
    }
    return segmentMap;
}
//# sourceMappingURL=serialization.js.map