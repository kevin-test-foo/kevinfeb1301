import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Debug endpoint to inspect incoming request headers.
 *
 * This helps validate:
 * 1. Whether Host header is preserved through Fastly → sta-caddy-proxy → Next.js
 * 2. What X-FASTLY-ORIG-HOST value is received
 * 3. What other infrastructure headers are present
 *
 * GET /api/debug-headers - Returns all request headers
 */

export async function GET(request: NextRequest) {
  const headersList = await headers();

  // Convert headers to object
  const allHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Extract key headers for analysis
  const analysis = {
    // Host-related headers
    host: allHeaders['host'] || null,
    'x-fastly-orig-host': allHeaders['x-fastly-orig-host'] || null,
    'x-forwarded-host': allHeaders['x-forwarded-host'] || null,

    // Pantheon context headers (should be stripped by caddy, but let's check)
    'pcontext-site-id': allHeaders['pcontext-site-id'] || null,
    'pcontext-site-env': allHeaders['pcontext-site-env'] || null,

    // Other useful headers
    'x-forwarded-for': allHeaders['x-forwarded-for'] || null,
    'x-forwarded-proto': allHeaders['x-forwarded-proto'] || null,
  };

  // Determine if hostname is available for Surrogate-Key generation
  const publicHostname = analysis['x-forwarded-host']
    || analysis['x-fastly-orig-host']
    || (analysis['host'] !== 'localhost:3000' ? analysis['host'] : null);

  const hostnameAvailable = !!publicHostname && !publicHostname.includes('localhost');

  console.log('[Debug Headers] Incoming request headers:', JSON.stringify(allHeaders, null, 2));
  console.log('[Debug Headers] Public hostname available:', hostnameAvailable, publicHostname);

  return NextResponse.json({
    timestamp: new Date().toISOString(),

    // Analysis summary
    analysis: {
      public_hostname: publicHostname,
      hostname_available_for_surrogate_keys: hostnameAvailable,
      host_header_value: analysis.host,
      fastly_orig_host: analysis['x-fastly-orig-host'],
      forwarded_host: analysis['x-forwarded-host'],
    },

    // Key headers for CDN/cache
    key_headers: analysis,

    // All headers for full debugging
    all_headers: allHeaders,

    // Validation notes
    notes: {
      link1_hostname: hostnameAvailable
        ? '✓ Public hostname IS available'
        : '✗ Public hostname NOT available - Host header is ' + analysis.host,
      recommendation: hostnameAvailable
        ? 'Hostname can be used for Surrogate-Key generation'
        : 'Cache handler cannot build hostname-based Surrogate-Keys without public hostname',
    },
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
