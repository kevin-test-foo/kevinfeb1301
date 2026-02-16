import { cacheLife, cacheTag } from 'next/cache';

/**
 * cacheTag() component-level tagging test route
 *
 * Tests cache tagging within 'use cache' blocks.
 * Can be invalidated via revalidateTag('component-products').
 */

// Mock product data
const MOCK_PRODUCTS = [
  { id: 1, name: 'Widget A', price: 29.99 },
  { id: 2, name: 'Widget B', price: 49.99 },
  { id: 3, name: 'Widget C', price: 19.99 },
];

async function getProducts() {
  'use cache';
  cacheLife('hours');
  cacheTag('component-products');

  // Simulate database query
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    products: MOCK_PRODUCTS,
    fetched_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/tagged - Using cacheTag(component-products)...');

    const data = await getProducts();
    const duration = Date.now() - startTime;

    console.log(`[API] /api/cache-components/tagged - Completed in ${duration}ms`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'hours',
      tags: ['component-products'],
      duration_ms: duration,
      fetched_at: new Date().toISOString(),
      description: "Uses cacheTag('component-products') for on-demand revalidation",
      revalidate_instruction: "Call /api/revalidate?tag=component-products to invalidate",
    });
  } catch (error) {
    console.error('[API] /api/cache-components/tagged - Error:', error);

    return Response.json(
      {
        error: 'Failed to get products',
        tags: ['component-products'],
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
