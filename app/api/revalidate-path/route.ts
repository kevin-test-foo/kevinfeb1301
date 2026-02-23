import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return NextResponse.json(
      { error: 'path query parameter is required. Use ?path=/your-path' },
      { status: 400 }
    );
  }

  console.log(`[RevalidatePath] Revalidating path: ${path}`);

  try {
    revalidatePath(path);

    return NextResponse.json({
      message: `Path '${path}' has been revalidated`,
      revalidated_at: new Date().toISOString(),
      path,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[RevalidatePath] Error:', error);

    return NextResponse.json(
      { error: 'Failed to revalidate path', message: String(error) },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
