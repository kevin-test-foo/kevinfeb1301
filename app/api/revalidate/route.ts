import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn('[Revalidate] WARNING: WEBHOOK_SECRET not set - webhook endpoint is insecure!');
}

/**
 * Validate webhook secret from request
 */
function validateWebhookSecret(request: NextRequest, bodySecret?: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[Revalidate] Skipping secret validation - WEBHOOK_SECRET not configured');
    return true; // Allow in dev without secret
  }

  // Check header first
  const headerSecret = request.headers.get('X-Webhook-Secret');
  if (headerSecret === WEBHOOK_SECRET) {
    return true;
  }

  // Check body secret
  if (bodySecret === WEBHOOK_SECRET) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, surrogate_keys } = body;

    // Validate secret
    if (!validateWebhookSecret(request, secret)) {
      console.error('[Revalidate] Unauthorized: Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Validate surrogate_keys array
    if (!surrogate_keys || !Array.isArray(surrogate_keys) || surrogate_keys.length === 0) {
      console.error('[Revalidate] Bad request: surrogate_keys array required');
      return NextResponse.json(
        { error: 'surrogate_keys array is required' },
        { status: 400 }
      );
    }

    console.log(`[Revalidate] Revalidating ${surrogate_keys.length} cache tags:`, surrogate_keys);

    // Revalidate each surrogate key
    const results = [];
    for (const key of surrogate_keys) {
      try {
        revalidateTag(key, 'max');
        results.push({ key, status: 'success' });
        console.log(`[Revalidate] ✓ Revalidated: ${key}`);
      } catch (error) {
        results.push({ key, status: 'error', message: String(error) });
        console.error(`[Revalidate] ✗ Failed to revalidate ${key}:`, error);
      }
    }

    return NextResponse.json({
      message: `Revalidated ${surrogate_keys.length} cache tags`,
      revalidated_at: new Date().toISOString(),
      results,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[Revalidate] Error processing webhook:', error);

    return NextResponse.json(
      { error: 'Failed to process webhook', message: String(error) },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        }
      }
    );
  }
}

// Keep GET method for manual testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tag = url.searchParams.get('tag');
  const secret = url.searchParams.get('secret');

  // Validate secret
  if (!validateWebhookSecret(request, secret || undefined)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid webhook secret' },
      { status: 401 }
    );
  }

  if (!tag) {
    return NextResponse.json(
      {
        error: 'Cache tag is required. Use ?tag=your-tag-name&secret=your-secret',
        available_tags: ['wordpress-posts', 'post-123', 'author-5']
      },
      { status: 400 }
    );
  }

  console.log(`[Revalidate] Manual revalidation of tag: ${tag}`);

  try {
    revalidateTag(tag, 'max');

    return NextResponse.json({
      message: `Cache tag '${tag}' has been revalidated`,
      revalidated_at: new Date().toISOString(),
      tag
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[Revalidate] Error:', error);

    return NextResponse.json(
      { error: 'Failed to revalidate cache', message: String(error) },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        }
      }
    );
  }
}
