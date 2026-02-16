# Surrogate Key Generation Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix surrogate key generation to use WordPress API response data instead of non-existent response headers.

**Architecture:** Replace header-based `extractSurrogateKeys()` function with data-based `generateSurrogateKeys()` that creates keys from WPPost object (post ID, categories, tags) matching the WordPress PHP pattern.

**Tech Stack:** TypeScript, Next.js 16, WordPress REST API

---

## Task 1: Update generateSurrogateKeys Function

**Files:**
- Modify: `lib/wordpressService.ts:85-100`

**Step 1: Replace extractSurrogateKeys with generateSurrogateKeys**

Replace the `extractSurrogateKeys` function (lines 85-100) with:

```typescript
/**
 * Generate surrogate keys from WordPress post data
 */
function generateSurrogateKeys(wpPost: WPPost): string[] {
  const keys: string[] = [];

  // Post-specific key
  keys.push(`post-${wpPost.id}`);

  // Post list key (for invalidating archives)
  keys.push('post-list');

  // Category keys
  if (wpPost.categories && Array.isArray(wpPost.categories)) {
    wpPost.categories.forEach(categoryId => {
      keys.push(`term-${categoryId}`);
    });
  }

  // Tag keys
  if (wpPost.tags && Array.isArray(wpPost.tags)) {
    wpPost.tags.forEach(tagId => {
      keys.push(`term-${tagId}`);
    });
  }

  // Deduplicate and return
  const uniqueKeys = [...new Set(keys)];

  console.log(`[WordPress] Generated surrogate keys for post ${wpPost.id}:`, uniqueKeys.join(', '));

  return uniqueKeys;
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds (function not called yet, so no runtime errors)

**Step 3: Commit function update**

```bash
git add lib/wordpressService.ts
git commit -m "refactor: replace extractSurrogateKeys with generateSurrogateKeys

Replace header-based surrogate key extraction with data-based generation
from WordPress post object. Generates post-{id}, post-list, and term-{id}
keys matching WordPress PHP pattern.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update fetchWordPressPosts to Use New Function

**Files:**
- Modify: `lib/wordpressService.ts:152-186`

**Step 1: Update surrogate key generation in fetchWordPressPosts**

Replace lines 171-173 in `fetchWordPressPosts` function:

**Old code (lines 171-173):**
```typescript
    // Extract and apply surrogate keys
    const surrogateKeys = extractSurrogateKeys(response.headers);
    surrogateKeys.forEach(key => cacheTag(key));
```

**New code:**
```typescript
    // Generate and apply surrogate keys from all posts
    const wpPosts: WPPost[] = await response.json();

    const allKeys = wpPosts.flatMap(post => generateSurrogateKeys(post));
    const uniqueKeys = [...new Set(allKeys)];

    console.log(`[WordPress] Applying ${uniqueKeys.length} unique cache tags for ${wpPosts.length} posts`);
    uniqueKeys.forEach(key => cacheTag(key));
```

**Step 2: Remove duplicate response.json() call**

The existing code has `const wpPosts: WPPost[] = await response.json();` on line 175. Remove that line since we moved it up in Step 1.

**After the changes, the function should look like:**

```typescript
export async function fetchWordPressPosts(): Promise<BlogPost[]> {
  'use cache';
  cacheLife('blog');

  try {
    console.log('[WordPress] Fetching all posts...');

    const url = `${WORDPRESS_API_URL}/posts?_embed&per_page=100&status=publish&orderby=date&order=desc`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    // Generate and apply surrogate keys from all posts
    const wpPosts: WPPost[] = await response.json();

    const allKeys = wpPosts.flatMap(post => generateSurrogateKeys(post));
    const uniqueKeys = [...new Set(allKeys)];

    console.log(`[WordPress] Applying ${uniqueKeys.length} unique cache tags for ${wpPosts.length} posts`);
    uniqueKeys.forEach(key => cacheTag(key));

    console.log(`[WordPress] Successfully fetched ${wpPosts.length} posts`);

    return wpPosts.map(transformWordPressPost);

  } catch (error) {
    console.error('[WordPress] Error fetching posts:', error);
    return [];
  }
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Commit fetchWordPressPosts update**

```bash
git add lib/wordpressService.ts
git commit -m "refactor: update fetchWordPressPosts to generate surrogate keys

Replace header extraction with data-based key generation. Generate keys
for all fetched posts and apply combined unique set to cache.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update fetchWordPressPost to Use New Function

**Files:**
- Modify: `lib/wordpressService.ts:191-230`

**Step 1: Update surrogate key generation in fetchWordPressPost**

Replace lines 210-212 in `fetchWordPressPost` function:

**Old code (lines 210-212):**
```typescript
    // Extract and apply surrogate keys
    const surrogateKeys = extractSurrogateKeys(response.headers);
    surrogateKeys.forEach(key => cacheTag(key));
```

**New code:**
```typescript
    const wpPosts: WPPost[] = await response.json();

    if (wpPosts.length === 0) {
      console.log(`[WordPress] Post not found: ${slug}`);
      return null;
    }

    // Generate and apply surrogate keys for this post
    const surrogateKeys = generateSurrogateKeys(wpPosts[0]);
    surrogateKeys.forEach(key => cacheTag(key));
```

**Step 2: Remove duplicate response.json() and post not found check**

The existing code has these lines after the surrogate key code (lines 214-223). Remove those duplicate lines since we moved them up in Step 1.

**After the changes, the function should look like:**

```typescript
export async function fetchWordPressPost(slug: string): Promise<BlogPost | null> {
  'use cache';
  cacheLife('blog');

  try {
    console.log(`[WordPress] Fetching post: ${slug}`);

    const url = `${WORDPRESS_API_URL}/posts?_embed&slug=${encodeURIComponent(slug)}&status=publish`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    const wpPosts: WPPost[] = await response.json();

    if (wpPosts.length === 0) {
      console.log(`[WordPress] Post not found: ${slug}`);
      return null;
    }

    // Generate and apply surrogate keys for this post
    const surrogateKeys = generateSurrogateKeys(wpPosts[0]);
    surrogateKeys.forEach(key => cacheTag(key));

    console.log(`[WordPress] Successfully fetched post: ${wpPosts[0].id}`);

    return transformWordPressPost(wpPosts[0]);

  } catch (error) {
    console.error(`[WordPress] Error fetching post ${slug}:`, error);
    return null;
  }
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 4: Commit fetchWordPressPost update**

```bash
git add lib/wordpressService.ts
git commit -m "refactor: update fetchWordPressPost to generate surrogate keys

Replace header extraction with data-based key generation for single post
fetches. Generate keys from post data and apply to cache.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Manual Testing and Verification

**Files:**
- Test: WordPress service integration

**Step 1: Build and start the application**

Run:
```bash
npm run build
npm run start
```

Expected: Build succeeds, server starts on port 3000

**Step 2: Check build output for surrogate keys**

Look for log output during build:
```
[WordPress] Generated surrogate keys for post 1: post-1, post-list, term-2, term-3
[WordPress] Applying 15 unique cache tags for 10 posts
```

Expected: Logs show generated keys with post IDs and term IDs

**Step 3: Test blog listing page**

1. Visit: `http://localhost:3000/blogs`
2. Check browser dev tools console or server logs
3. Verify: Logs show generated surrogate keys for all posts

**Step 4: Test blog detail page**

1. Click on a blog post
2. Check server logs
3. Verify: Logs show generated surrogate keys for that specific post

**Step 5: Test webhook with generated keys**

Simulate a WordPress webhook with the generated keys:

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret","surrogate_keys":["post-1","post-list","term-2"]}'
```

Expected: 200 response confirming cache invalidation

**Step 6: Verify cache invalidation works**

1. Trigger webhook as in Step 5
2. Reload `/blogs` page
3. Check ISR timestamp updates

**Step 7: Document test results**

Note: Manual testing completed, all surrogate keys generating correctly

---

## Task 5: Final Verification and Commit

**Files:**
- All modified files

**Step 1: Run final build**

Run:
```bash
npm run build
npm run lint
```

Expected: Clean build and lint with no errors

**Step 2: Verify all changes are committed**

Run:
```bash
git status
```

Expected: Working tree clean (all changes from Tasks 1-3 committed)

**Step 3: Final verification**

Confirm:
- `extractSurrogateKeys` function replaced with `generateSurrogateKeys`
- Both fetch functions use new key generation
- Build succeeds
- Surrogate keys logged showing post IDs and term IDs

---

## Success Criteria

- [ ] `generateSurrogateKeys` function generates keys from WPPost data
- [ ] Keys include: `post-{id}`, `post-list`, `term-{categoryId}`, `term-{tagId}`
- [ ] `fetchWordPressPosts` generates keys for all posts and applies unique set
- [ ] `fetchWordPressPost` generates keys for single post
- [ ] TypeScript compilation succeeds
- [ ] Build logs show generated surrogate keys
- [ ] Webhook endpoint can invalidate with generated keys
- [ ] All commits follow conventional format

## WordPress Webhook Configuration

After deployment, configure WordPress webhook to send these keys on post update:

```json
{
  "secret": "YOUR_WEBHOOK_SECRET",
  "surrogate_keys": [
    "post-{post_id}",
    "post-list",
    "term-{category_id_1}",
    "term-{category_id_2}",
    "term-{tag_id_1}",
    "term-{tag_id_2}"
  ]
}
```

Replace `{post_id}`, `{category_id_*}`, and `{tag_id_*}` with actual IDs from the WordPress post being updated.
