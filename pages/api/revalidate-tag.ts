import type { NextApiRequest, NextApiResponse } from 'next';
import { createCacheHandler } from '@pantheon-systems/nextjs-cache-handler';

const CacheHandler = createCacheHandler({ type: 'auto' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tag = req.query.tag as string;

  if (!tag) {
    return res.status(400).json({ error: 'tag query parameter is required' });
  }

  try {
    console.log(`[RevalidateTag] Revalidating tag: ${tag}`);
    const cacheHandler = new CacheHandler({
      revalidatedTags: [],
      _requestHeaders: {},
    } as any);
    await cacheHandler.revalidateTag(tag);

    return res.json({
      message: `Tag '${tag}' revalidated`,
      revalidated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RevalidateTag] Error:', error);
    return res.status(500).json({ error: 'Failed to revalidate', message: String(error) });
  }
}
