import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

// Next.js 16: No 'use cache' means dynamic execution
// Replaced legacy: export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tag } = body;

    if (!tag) {
      return NextResponse.json(
        { error: 'Cache tag is required' },
        { status: 400 }
      );
    }

    console.log(`[API] /api/revalidate - Revalidating cache tag: ${tag}`);

    // Revalidate the specified cache tag
    // Next.js 16: revalidateTag requires a second argument (cache profile)
    // 'max' uses stale-while-revalidate semantics
    revalidateTag(tag, 'max');

    return NextResponse.json({
      message: `Cache tag '${tag}' has been revalidated`,
      revalidated_at: new Date().toISOString(),
      tag
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[API] /api/revalidate - Error:', error);

    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

// Also support GET method for easier testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tag = url.searchParams.get('tag');

  if (!tag) {
    return NextResponse.json(
      {
        error: 'Cache tag is required. Use ?tag=your-tag-name',
        available_tags: ['api-posts', 'external-data']
      },
      { status: 400 }
    );
  }

  console.log(`[API] /api/revalidate - Revalidating cache tag: ${tag}`);

  try {
    // Next.js 16: revalidateTag requires a second argument (cache profile)
    revalidateTag(tag, 'max');

    return NextResponse.json({
      message: `Cache tag '${tag}' has been revalidated`,
      revalidated_at: new Date().toISOString(),
      tag
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('[API] /api/revalidate - Error:', error);

    return NextResponse.json(
      { error: 'Failed to revalidate cache' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}