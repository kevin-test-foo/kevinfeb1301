import type { NextApiRequest, NextApiResponse } from 'next';
import { getSharedCacheStats } from '@pantheon-systems/nextjs-cache-handler';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = await getSharedCacheStats();
    return res.json(stats);
  } catch (error) {
    console.error('[CacheStats] Error:', error);
    return res.status(500).json({ error: 'Failed to get cache stats', message: String(error) });
  }
}
