// Cache handler configuration using @pantheon-systems/nextjs-cache-handler
import { createCacheHandler } from '@pantheon-systems/nextjs-cache-handler';

const CacheHandler = createCacheHandler({
  type: 'auto',
});

export default CacheHandler;
