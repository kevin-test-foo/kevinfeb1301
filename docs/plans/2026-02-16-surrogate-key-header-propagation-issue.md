# Surrogate-Key Header Propagation Issue

**Date:** 2026-02-16 (Updated: 2026-02-17)
**Package:** @pantheon-systems/nextjs-cache-handler v0.2.0
**Context:** WordPress headless CMS integration with cache tag-based invalidation

## 🚨 CRITICAL UPDATE (2026-02-17): Root Cause Identified

**The issue is a Next.js bug, not an architecture problem.**

Attempted to implement delayed header write pattern (Option 2) to work around middleware timing. **Result: FAILED**

### Root Cause: Next.js Bug #78864

`cacheTag()` values **are never passed to cache handlers** by Next.js 16. This is a confirmed bug:

- **Issue:** https://github.com/vercel/next.js/issues/78864
- **Status:** OPEN (not fixed as of 2026-02-17)
- **Symptom:** Cache handler always receives `tags: []` (empty array)

**Evidence from runtime logs:**
```
[UseCacheFileHandler] [EMPTY_TAGS_BUG] SET [...]: Next.js passed empty tags array.
This is a known Next.js bug - cacheTag() values are not propagated to
cacheHandlers.set(). See: https://github.com/vercel/next.js/issues/78864
```

### What This Means

**ALL middleware-based approaches are impossible** until Next.js fixes this bug:
- ❌ Delayed header write with polling (attempted - failed)
- ❌ AsyncLocalStorage context sharing
- ❌ Symbol.for global context
- ❌ Any middleware timing tricks

**The only viable solution is Option 1: Custom Node.js Server** (server.ts) because it can intercept responses after page execution AND it doesn't rely on cache handlers to store tags - it can capture them directly from the execution context.

### Timeline
- **2025-05-06:** Next.js issue #78864 reported
- **2026-02-16:** Document created analyzing middleware timing
- **2026-02-17:** Attempted delayed header write - discovered Next.js bug
- **Status:** Waiting for Next.js fix OR implement custom server

---

## Problem Statement

Pages using Next.js 16's `'use cache'` directive with dynamic `cacheTag()` calls **cannot automatically propagate cache tags to Surrogate-Key HTTP response headers**.

This breaks CDN-level cache invalidation for Pantheon Advanced Page Cache integration.

## What Currently Works

✅ **Cache tag generation**: Tags are correctly generated from WordPress post data
```typescript
// lib/wordpressService.ts
export async function fetchWordPressPosts() {
  'use cache';
  cacheLife('blog');

  const wpPosts = await response.json();
  wpPosts.forEach(post => {
    cacheTag(`post-${post.id}`, 'post-list', `term-${categoryId}`);
  });
}
```

Build logs confirm tags are generated:
```
[WordPress] Generated surrogate keys for post 17: post-17, post-list, term-3, term-4, term-2
[WordPress] Applying 14 unique cache tags for 10 posts
```

✅ **Origin cache invalidation**: `/api/revalidate` endpoint + `revalidateTag()` works
```typescript
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { surrogate_keys } = await request.json();
  surrogate_keys.forEach(key => revalidateTag(key));
  return Response.json({ revalidated: true });
}
```

## What Doesn't Work

❌ **Surrogate-Key headers in HTTP responses**: Always shows fallback value
```bash
curl -I http://localhost:3000/blogs
# Surrogate-Key: nextjs-app  ← Fallback, not actual tags
```

Expected:
```
Surrogate-Key: post-17 post-list term-3 term-4 term-2
```

❌ **CDN-level cache invalidation**: Pantheon's Fastly CDN cannot purge pages by surrogate key

## Technical Root Cause

### Next.js Request Pipeline Timing

```
1. Middleware runs (Edge Runtime)
   ↓ Can set headers, but tags not captured yet
   ↓
2. Routing resolution
   ↓
3. Page execution (Node.js Runtime)
   ↓ 'use cache' directive runs
   ↓ fetchWordPressPosts() executes
   ↓ Cache HIT occurs
   ↓ cacheTag() captures tags to CacheTagContext
   ↓
4. Response streaming starts
   ↓ Headers already sent, cannot modify
   ↓
5. Response sent
```

**Problem:** Middleware runs BEFORE tags are captured, response headers sent AFTER tags are captured.

### Two Separate Caching Systems in Package

The @pantheon-systems/nextjs-cache-handler has two systems that don't integrate:

#### System 1: Legacy Cache Handler (Works with middleware)
- **For:** ISR, route handlers, fetch cache
- **Context:** `RequestContext` (AsyncLocalStorage)
- **Middleware reads:** `RequestContext.getTags()`
- **Status:** ✅ Surrogate-Key headers work

#### System 2: Use-Cache Handlers (Doesn't work with middleware)
- **For:** Pages with `'use cache'` directive
- **Context:** `CacheTagContext` (Symbol.for pattern)
- **Requires:** `withSurrogateKey()` wrapper (API routes only)
- **Status:** ❌ No middleware support

### Why globalThis Fallback Doesn't Help

The package has `globalThis.__pantheonSurrogateKeyTags` as a fallback, but:

1. Use-cache handlers prefer `CacheTagContext` (Symbol.for pattern)
2. Symbol.for works in production, so fallback never used
3. Even if fallback was used, middleware runs too early to read it

## Current Implementation Status

**Files modified:**
- `middleware.ts` - Custom middleware attempting to read tags
- `lib/surrogate-key-middleware.ts` - Custom middleware implementation
- `lib/wordpressService.ts` - WordPress service with cacheTag() calls

**Current behavior:**
- Middleware runs with debug logging
- Always shows: "Tags from globalThis: 0"
- Always falls back to: "nextjs-app"

**Git commit:** `b4cf467` (wip: add custom middleware for surrogate key propagation)

## Solution Alternatives

### Option 1: Custom Node.js Server (RECOMMENDED)

Ship a custom server as part of the package that intercepts responses AFTER page execution.

**Implementation:**

```typescript
// @pantheon-systems/nextjs-cache-handler/server/index.ts
import { createServer } from 'http';
import next from 'next';

export function createPantheonServer(options = {}) {
  const { port = 3000 } = options;
  const dev = process.env.NODE_ENV !== 'production';
  const app = next({ dev });
  const handle = app.getRequestHandler();

  return app.prepare().then(() => {
    return createServer((req, res) => {
      // Intercept response BEFORE headers are sent
      const originalWriteHead = res.writeHead;
      res.writeHead = function(statusCode, ...args) {
        // At this point, page has executed and tags are captured
        const tags = globalThis.__pantheonSurrogateKeyTags || [];
        if (tags.length > 0 && !res.headersSent) {
          this.setHeader('Surrogate-Key', tags.join(' '));
          globalThis.__pantheonSurrogateKeyTags = [];
        }
        return originalWriteHead.call(this, statusCode, ...args);
      };

      return handle(req, res);
    }).listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
  });
}
```

**User setup:**

```typescript
// server.ts (user creates)
import { createPantheonServer } from '@pantheon-systems/nextjs-cache-handler/server';
createPantheonServer({ port: 3000 });
```

```json
// package.json
{
  "scripts": {
    "start": "node server.ts"
  }
}
```

**Pros:**
- ✅ Works with all Next.js features (layouts, streaming, metadata, etc.)
- ✅ Intercepts response AFTER page execution when tags are available
- ✅ Simple user setup (one file + script change)
- ✅ Works on Pantheon (Node.js hosting)
- ✅ globalThis shared between Next.js and custom server

**Cons:**
- ❌ Doesn't work on Vercel/serverless platforms
- ❌ Users must run custom server instead of `next start`
- ❌ Slightly more complex deployment

**Verdict:** Best option for Pantheon-specific package. Pantheon uses Node.js hosting, not serverless.

### Option 2: Modify Use-Cache Handlers to Use globalThis

Change use-cache handlers to ALWAYS write to globalThis fallback:

```typescript
// In use-cache/gcs-handler.ts (package code)
function captureTags(tags) {
  // Try CacheTagContext first
  const context = getCacheTagContext();
  if (context) {
    context.tags.push(...tags);
  }

  // ALWAYS also write to globalThis for middleware
  if (!globalThis.__pantheonSurrogateKeyTags) {
    globalThis.__pantheonSurrogateKeyTags = [];
  }
  globalThis.__pantheonSurrogateKeyTags.push(...tags);
}
```

Then modify middleware to wait/poll for tags:

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Terrible hack: wait for page to execute
  await new Promise(resolve => setTimeout(resolve, 50));

  const tags = globalThis.__pantheonSurrogateKeyTags || [];
  if (tags.length > 0) {
    response.headers.set('Surrogate-Key', tags.join(' '));
    globalThis.__pantheonSurrogateKeyTags = [];
  }

  return response;
}
```

**Pros:**
- ✅ No custom server needed
- ✅ Works with standard `next start`

**Cons:**
- ❌ Race condition - timing is unpredictable
- ❌ Adding delay to every request is terrible for performance
- ❌ Tags might not be captured yet when timeout expires
- ❌ Very fragile, will break randomly

**Verdict:** Not recommended. Race conditions are unacceptable.

### Option 3: Convert Pages to API Routes

Change page architecture from React Server Components to API routes:

```typescript
// app/blogs/route.ts (instead of page.tsx)
import { withSurrogateKey } from '@pantheon-systems/nextjs-cache-handler';
import { renderToString } from 'react-dom/server';

async function handler(request: NextRequest) {
  const posts = await fetchWordPressPosts(); // cacheTag() called
  const html = renderToString(<BlogsPageContent posts={posts} />);

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

export const GET = withSurrogateKey(handler);
```

**Pros:**
- ✅ Works with existing `withSurrogateKey()` wrapper
- ✅ No custom server needed

**Cons:**
- ❌ Loses Next.js page features (layouts, metadata, streaming, nested layouts)
- ❌ Manual HTML rendering is ugly
- ❌ Not how Next.js App Router is meant to be used
- ❌ Significant refactoring required

**Verdict:** Not recommended. Defeats purpose of using Next.js App Router.

### Option 4: Use Static Tags Only

Change from dynamic per-post tags to static cache tags:

```typescript
// lib/wordpressService.ts
export async function fetchWordPressPosts() {
  const response = await fetch(url, {
    next: {
      revalidate: 300,
      tags: ['wordpress-posts'] // Static tag
    }
  });

  return response.json();
}
```

**Pros:**
- ✅ Works with existing middleware
- ✅ No custom server needed

**Cons:**
- ❌ Loses granular cache invalidation
- ❌ Invalidating one post invalidates ALL posts
- ❌ Defeats entire purpose of surrogate key system

**Verdict:** Not acceptable. Granular invalidation is the core requirement.

### Option 5: Document Limitation

Add clear documentation that 'use cache' pages don't support Surrogate-Key headers:

```markdown
## Limitations

Surrogate-Key headers **cannot be automatically set** for pages using `'use cache'`
directive due to Next.js architecture (middleware runs before tag capture).

Users must either:
- Accept origin-only cache invalidation (no CDN purging)
- Use API routes with `withSurrogateKey()` wrapper
- Wait for Next.js to add response finalization hooks
```

**Pros:**
- ✅ Simple, no code changes
- ✅ Sets correct expectations

**Cons:**
- ❌ Feature doesn't work
- ❌ Users can't use modern Next.js patterns

**Verdict:** Only acceptable as last resort.

## Recommended Path Forward

1. **Implement Option 1 (Custom Server)** in @pantheon-systems/nextjs-cache-handler:
   - Add `server/index.ts` export with `createPantheonServer()`
   - Add CLI wrapper: `@pantheon-systems/nextjs-cache-handler/bin/start`
   - Update README with setup instructions

2. **Update documentation** to explain:
   - Why custom server is needed
   - How to set it up (one file + script change)
   - That it only works on Node.js hosting (not Vercel)

3. **Test thoroughly:**
   - Verify globalThis sharing works between custom server and Next.js
   - Verify tags are captured before response.writeHead()
   - Test with production builds

4. **Consider hybrid approach:**
   - Ship custom server for full feature support
   - Also document API route workaround for users who can't use custom server

## Next Steps for Implementation

If pursuing Option 1 (Custom Server):

1. Create `packages/nextjs-cache-handler/server/index.ts`
2. Export `createPantheonServer()` function
3. Add integration tests
4. Update main package exports in `package.json`
5. Write setup guide in README
6. Test with this WordPress blog integration

## Files to Reference

- Current middleware attempt: `middleware.ts`, `lib/surrogate-key-middleware.ts`
- WordPress service with cacheTag(): `lib/wordpressService.ts`
- Use-cache handler: `use-cache-handler.mjs`
- Package source: `node_modules/@pantheon-systems/nextjs-cache-handler/dist/`

## Key Insight

**The fundamental issue is architectural:** Next.js middleware cannot access data generated during page rendering. Any solution must either:

1. Run AFTER page rendering (custom server)
2. Change when tags are captured (breaks 'use cache' model)
3. Change page architecture (API routes)
4. Accept limitation (no CDN invalidation)

Custom server is the only option that preserves all Next.js features while solving the problem.
