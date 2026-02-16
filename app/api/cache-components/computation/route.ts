import { cacheLife } from 'next/cache';

/**
 * Expensive computation test route
 *
 * Tests caching of CPU-intensive operations.
 * The 'use cache' directive should cache the computation result.
 */

// Fibonacci calculation (intentionally slow for testing)
function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Cached expensive computation
async function computeFibonacci() {
  'use cache';
  cacheLife('minutes');

  const computeStart = Date.now();

  // Compute Fibonacci(35) - takes ~50-100ms
  const result = fibonacci(35);

  const computeTime = Date.now() - computeStart;

  return {
    input: 35,
    result,
    compute_time_ms: computeTime,
    computed_at: new Date().toISOString(),
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] /api/cache-components/computation - Computing Fibonacci with use cache...');

    const data = await computeFibonacci();
    const totalTime = Date.now() - startTime;

    // If cached, total time should be much less than compute time
    const cacheHit = totalTime < 20;

    console.log(`[API] /api/cache-components/computation - Completed in ${totalTime}ms (cache ${cacheHit ? 'HIT' : 'MISS'})`);

    return Response.json({
      data,
      cache_type: 'use-cache-directive',
      cache_profile: 'minutes',
      operation: 'cpu-computation',
      total_time_ms: totalTime,
      cache_hit: cacheHit,
      fetched_at: new Date().toISOString(),
      description: 'Caches expensive CPU computation (Fibonacci)',
    });
  } catch (error) {
    console.error('[API] /api/cache-components/computation - Error:', error);

    return Response.json(
      {
        error: 'Failed to compute',
        operation: 'cpu-computation',
        fetched_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
