import type { NextApiRequest, NextApiResponse } from 'next';
import { revalidateTag } from 'next/cache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const tag = req.query.tag as string;

  if (!tag) {
    return res.status(400).json({ error: 'tag query parameter is required' });
  }

  try {
    console.log(`[RevalidateTag] Revalidating tag: ${tag}`);
    revalidateTag(tag, 'max');

    return res.json({
      message: `Tag '${tag}' revalidated`,
      revalidated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RevalidateTag] Error:', error);
    return res.status(500).json({ error: 'Failed to revalidate', message: String(error) });
  }
}
