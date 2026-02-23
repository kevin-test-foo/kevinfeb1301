import type { NextApiRequest, NextApiResponse } from 'next';
import { revalidatePath } from 'next/cache';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = req.query.path as string;

  if (!path) {
    return res.status(400).json({ error: 'path query parameter is required' });
  }

  try {
    console.log(`[RevalidatePath] Revalidating: ${path}`);
    revalidatePath(path);

    return res.json({
      message: `Path '${path}' revalidated`,
      revalidated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RevalidatePath] Error:', error);
    return res.status(500).json({ error: 'Failed to revalidate', message: String(error) });
  }
}
