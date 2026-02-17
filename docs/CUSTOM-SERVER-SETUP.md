# Custom Server Setup for Surrogate-Key Headers

## Overview

This app uses a custom Node.js server to inject Surrogate-Key headers for CDN cache invalidation with Pantheon Advanced Page Cache.

This is necessary due to Next.js bug #78864 where `cacheTag()` values don't propagate to cache handlers.

## Quick Start

```bash
# Development (with debug logging)
SURROGATE_KEY_DEBUG=true npm run dev

# Production
npm run build
npm start
```

## How It Works

1. **Page renders** - WordPress service calls `cacheTag('post-17', 'post-list', etc.)`
2. **Workaround** - Service also writes tags directly to `globalThis.__pantheonSurrogateKeyTags`
3. **Server intercepts** - Custom server catches `res.writeHead()` before headers sent
4. **Headers injected** - Reads tags from globalThis, sets `Surrogate-Key` header
5. **Cleanup** - Clears globalThis for next request

## Testing

Test Surrogate-Key headers are working:

```bash
# Start server with debug logging
SURROGATE_KEY_DEBUG=true npm start

# In another terminal, test the headers
curl -I http://localhost:3000/blogs
# Should show: Surrogate-Key: post-17 post-list term-3 term-4 term-2 ...

curl -I http://localhost:3000/blogs/some-post-slug
# Should show: Surrogate-Key: post-{id} post-list term-{categoryId} ...
```

## Debug Output

When `SURROGATE_KEY_DEBUG=true` is set, you'll see:

```
[CustomServer] Request: GET /blogs
[WordPress] Generated surrogate keys for post 17: post-17, post-list, term-3, term-4, term-2
[WordPress] Written 14 tags to globalThis for custom server
[CustomServer] Found 14 tags for /blogs
[CustomServer] Tags: post-17 post-list term-3 term-4 term-2 ...
```

## Integration with WordPress Webhooks

When WordPress content changes, send webhook to `/api/revalidate`:

```bash
POST /api/revalidate
Content-Type: application/json
X-Webhook-Secret: your-secret

{
  "surrogate_keys": ["post-17", "post-list", "term-3"]
}
```

The endpoint will:
1. Call `revalidateTag()` for each key (purges Next.js origin cache)
2. Pantheon CDN will see `Surrogate-Key` header on next request
3. CDN can purge by matching keys

## Files

- `server.ts` - Custom Node.js server with response interception
- `lib/wordpressService.ts` - WordPress service with globalThis workaround
- `app/api/revalidate/route.ts` - Webhook endpoint for cache invalidation

## Future: When Next.js Fixes Bug

When Next.js fixes issue #78864:

1. Remove globalThis writes from `lib/wordpressService.ts`
2. Tags will propagate natively through cache handlers
3. Custom server will still work (reads from globalThis populated by cache handler)
4. No breaking changes needed

## Production Deployment

### Pantheon

The custom server works on Pantheon's Node.js hosting:

```json
// package.json
{
  "scripts": {
    "start": "tsx server.ts"
  }
}
```

Pantheon will run `npm start` which uses the custom server.

### Vercel/Serverless

**Not compatible.** This approach requires a long-running Node.js process to intercept responses. Use API routes with `withSurrogateKey()` wrapper instead (see package docs).

## Troubleshooting

### No Surrogate-Key header

1. Check server is using `server.ts` not `next start`:
   ```bash
   ps aux | grep server.ts
   ```

2. Enable debug logging:
   ```bash
   SURROGATE_KEY_DEBUG=true npm start
   ```

3. Check WordPress service is writing to globalThis:
   ```bash
   # Should see in logs:
   [WordPress] Written {N} tags to globalThis for custom server
   ```

### Tags not clearing between requests

Check the custom server is clearing globalThis:
```typescript
// server.ts line ~75
(globalThis as any).__pantheonSurrogateKeyTags = [];
```

### Build errors

Make sure `tsx` is installed:
```bash
npm install --save-dev tsx
```

## More Information

See `docs/plans/2026-02-16-surrogate-key-header-propagation-issue.md` for detailed technical analysis.
