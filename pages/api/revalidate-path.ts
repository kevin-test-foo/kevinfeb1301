import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = req.query.path as string;

  if (!path) {
    return res.status(400).json({ error: 'path query parameter is required' });
  }

  try {
    console.log(`[RevalidatePath] Revalidating: ${path}`);
    await res.revalidate(path);

    return res.json({
      message: `Path '${path}' revalidated`,
      revalidated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RevalidatePath] Error:', error);
    return res.status(500).json({ error: 'Failed to revalidate', message: String(error) });
  }
}
