# WordPress Blog ISR Integration Design

## Overview

Integrate WordPress as a headless CMS for the Next.js blog using Pantheon's surrogate key system for precise cache invalidation. Replace the current JSONPlaceholder integration with WordPress REST API, implementing webhook-driven revalidation for instant content updates.

## Architecture

The WordPress integration will use Pantheon's surrogate key system for precise cache invalidation. The Next.js app will fetch from WordPress REST API (`/wp-json/wp/v2/posts`), extract `Surrogate-Key` headers, and tag cached responses. When content changes in WordPress, a webhook fires to Next.js with the affected surrogate keys, triggering targeted revalidation.

**Configuration:**
- Environment variable: `WORDPRESS_API_URL` (e.g., `https://dev-devx6473wp.pantheonsite.io/wp-json/wp/v2`)
- Required - application will fail if not set (no fallback)

**Caching strategy:**
- Use Next.js 16 `'use cache'` directive with `cacheTag()` for surrogate keys
- Stale-while-revalidate: serve stale content if WordPress is down
- No time-based revalidation - purely webhook-driven

**Data fetching:**
- Use `?_embed` parameter to get authors, featured media, categories, tags in single request
- Extract surrogate keys from response headers
- Transform WordPress data to existing `BlogPost` TypeScript interface

## Components & Data Flow

**New WordPress Service (`lib/wordpressService.ts`):**
- `fetchWordPressPosts()` - Fetches all published posts with `_embed`, extracts surrogate keys from headers
- `fetchWordPressPost(slug)` - Fetches single post by slug with `_embed`
- `transformWordPressPost()` - Maps WordPress API response to `BlogPost` interface
- `extractSurrogateKeys()` - Parses `Surrogate-Key` header into array of cache tags

**Updated Blog Pages:**
- `/app/blogs/page.tsx` - Calls `wordpressService.fetchWordPressPosts()`, applies cache tags
- `/app/blogs/[slug]/page.tsx` - Calls `wordpressService.fetchWordPressPost(slug)`, applies cache tags
- Both use `'use cache'` + `cacheTag()` for surrogate key tagging

**Webhook Endpoint (`/app/api/revalidate/route.ts`):**
- Modify existing endpoint to accept WordPress webhook payload
- WordPress sends: `{ "secret": "...", "surrogate_keys": ["post-123", "post-list", "author-5"] }`
- Validates secret against `WEBHOOK_SECRET` env var
- Calls `revalidateTag()` for each surrogate key received

**Environment Variables:**
- `WORDPRESS_API_URL` - Required, must be set (e.g., `https://dev-devx6473wp.pantheonsite.io/wp-json/wp/v2`)
- `WEBHOOK_SECRET` - Required secret token for webhook authentication

**Migration:**
- Replace `lib/blogService.ts` calls with `lib/wordpressService.ts`
- Keep existing `BlogPost` interface (add fields if WordPress provides more)
- Remove JSONPlaceholder dependencies (`lib/data-source.ts`, `lib/mock-data.ts`) can stay for other demos

## Content Structure

All content from WordPress REST API with full metadata:

**Basic content:**
- Title
- Content (HTML)
- Excerpt
- Slug
- Publish date

**Author info:**
- Author name
- Author bio
- Author avatar

**Media & taxonomy:**
- Featured image (via `_embed`)
- Categories (via `_embed`)
- Tags (via `_embed`)
- Custom fields (if needed)

All fetched in single request using `?_embed` parameter.

## Error Handling

**WordPress API failures:**
- Wrap all fetch calls in try-catch blocks
- Log errors to console for debugging
- Return cached data using Next.js stale-while-revalidate semantics
- Cache remains valid even if WordPress is unreachable

**Missing content scenarios:**
- Post not found by slug → return `null`, trigger Next.js 404 via `notFound()`
- Empty post list → return empty array, show "No posts yet" UI message
- Missing featured image/author → gracefully degrade, show placeholder or omit section

**Surrogate key extraction:**
- If `Surrogate-Key` header missing → log warning, cache without tags (still functional)
- If header malformed → parse what's possible, ignore invalid keys
- Fallback tag strategy: always include generic `'wordpress-posts'` tag as safety net

**Webhook validation:**
- Verify webhook secret matches `WEBHOOK_SECRET` env var
- Return 401 Unauthorized if secret missing or doesn't match
- Verify webhook payload has `surrogate_keys` array
- Return 400 if payload invalid
- Return 200 even if revalidation partially fails (log errors)

**Network timeouts:**
- Rely on Next.js default fetch timeout behavior
- Stale cache serves if WordPress response is too slow

## Webhook Security

**Environment variable:**
- `WEBHOOK_SECRET` - Required secret token for webhook authentication

**Webhook endpoint validation (`/app/api/revalidate/route.ts`):**
- Expect secret in request body: `{ "secret": "...", "surrogate_keys": [...] }`
- Or as header: `X-Webhook-Secret: ...`
- Compare against `process.env.WEBHOOK_SECRET`
- Return 401 Unauthorized if secret missing or doesn't match
- Only proceed with revalidation if authenticated

**WordPress webhook configuration:**
- Configure webhook plugin to include secret in payload or header
- Secret should match `WEBHOOK_SECRET` env var in Next.js
- Example payload: `{ "secret": "your-secret-here", "surrogate_keys": ["post-123"] }`

## Testing

**Manual testing steps:**
1. Set `WORDPRESS_API_URL` and `WEBHOOK_SECRET` environment variables
2. Build and run Next.js app, verify `/blogs` loads WordPress posts
3. Verify `/blogs/[slug]` renders individual posts with full metadata
4. Check featured images, categories, tags display correctly
5. Test webhook by updating a WordPress post, triggering revalidation
6. Verify cache invalidation: updated content appears without full rebuild
7. Test error scenarios: stop WordPress, verify stale content still serves

**WordPress setup requirements:**
- Install Pantheon Advanced Page Cache plugin
- Configure permalink structure to "Post name"
- Install webhook plugin (WP Webhooks or custom action)
- Configure webhook to POST to `https://your-nextjs-app.com/api/revalidate` on `save_post`/`publish_post`
- Webhook payload format: `{ "secret": "...", "surrogate_keys": ["post-{id}", "post-list", ...] }`

**Validation checks:**
- Response headers include `Surrogate-Key` header from WordPress
- Next.js logs show surrogate keys being extracted and applied
- Cache tags visible in Pantheon cache handler logs
- Revalidation endpoint returns 200 with revalidated timestamp
- Unauthorized requests return 401

**TypeScript validation:**
- Ensure WordPress API response maps correctly to `BlogPost` interface
- Add new fields if WordPress provides data not in current interface
- Verify featured image URLs are absolute paths

## Implementation Notes

- Follow patterns from architecture.md document
- Use Next.js 16 `'use cache'` directive throughout
- Leverage existing `@pantheon-systems/nextjs-cache-handler` infrastructure
- Maintain existing UI/UX on blog pages
- Keep ISR status indicators showing cache generation times
