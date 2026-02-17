import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const debug = process.env.SURROGATE_KEY_DEBUG === 'true';

/**
 * Custom Node.js server for Surrogate-Key header propagation.
 *
 * This server wraps Next.js and intercepts responses AFTER page execution
 * to inject Surrogate-Key headers from captured cache tags.
 *
 * Why this is needed:
 * - Next.js bug #78864: cacheTag() values don't propagate to cache handlers
 * - Middleware runs BEFORE page execution (can't capture tags)
 * - Custom server runs AFTER page execution (can capture tags)
 *
 * How it works:
 * 1. Page renders and calls cacheTag()
 * 2. Use-cache handler writes tags to globalThis.__pantheonSurrogateKeyTags
 * 3. Before response.writeHead() sends headers, we inject Surrogate-Key
 */

app.prepare().then(() => {
  createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = parse(req.url!, true);
    const { pathname } = parsedUrl;

    if (debug) {
      console.log(`[CustomServer] Request: ${req.method} ${pathname}`);
    }

    // Intercept response.writeHead to inject Surrogate-Key header
    const originalWriteHead = res.writeHead;

    res.writeHead = function(statusCode: number, ...args: any[]) {
      // Extract tags from globalThis (written by use-cache handlers)
      const tags = (globalThis as any).__pantheonSurrogateKeyTags || [];

      if (tags.length > 0) {
        // Deduplicate tags
        const uniqueTags = [...new Set(tags)];
        const surrogateKey = uniqueTags.join(' ');

        if (debug) {
          console.log(`[CustomServer] Found ${uniqueTags.length} tags for ${pathname}`);
          console.log(`[CustomServer] Tags: ${surrogateKey}`);
        }

        // Set Surrogate-Key header
        res.setHeader('Surrogate-Key', surrogateKey);

        // Clear tags for next request
        (globalThis as any).__pantheonSurrogateKeyTags = [];

        if (debug) {
          res.setHeader('X-Cache-Tags-Count', String(uniqueTags.length));
        }
      } else {
        // Fallback key when no tags captured
        const fallbackKey = 'nextjs-app';

        if (debug) {
          console.log(`[CustomServer] No tags captured for ${pathname}, using fallback: ${fallbackKey}`);
        }

        res.setHeader('Surrogate-Key', fallbackKey);
      }

      // Call original writeHead
      return originalWriteHead.apply(this, [statusCode, ...args] as any);
    };

    // Handle the request with Next.js
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    if (debug) {
      console.log(`> Surrogate-Key debug logging: ENABLED`);
    }
  });
});
