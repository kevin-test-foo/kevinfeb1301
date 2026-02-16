# Surrogate Key Generation Fix Design

## Overview

Fix the surrogate key generation in the WordPress service to generate keys from API response data instead of trying to extract them from non-existent response headers. This matches the WordPress-side key generation pattern.

## Problem

Currently, `extractSurrogateKeys(headers: Headers)` tries to extract surrogate keys from WordPress REST API response headers, but these headers don't exist. The function falls back to `['wordpress-posts']` which doesn't provide granular cache invalidation.

## Solution

Replace header-based extraction with data-based generation that creates surrogate keys from the WordPress post data itself, matching the PHP `get_post_keys()` pattern.

## Architecture

### Key Generation Logic

Generate surrogate keys from WordPress post data following this pattern:

1. **Post-specific key**: `post-{id}` - for invalidating individual post pages
2. **Post list key**: `post-list` - for invalidating post archives/listing pages
3. **Term keys**: `term-{id}` - for each category and tag (from `categories` and `tags` arrays)

The function will:
- Take a `WPPost` object as input
- Build array of keys based on post data
- Return deduplicated array using `Set`

### Integration Points

**For list endpoint** (`fetchWordPressPosts`):
- Generate keys for ALL fetched posts
- Combine all keys from all posts
- Apply combined set to cache tags
- Result: Updating any post invalidates both list and individual pages

**For single post endpoint** (`fetchWordPressPost`):
- Generate keys only for the requested post
- Apply to cache tags
- Result: Updating a post invalidates its detail page and the list

## Implementation Details

### Function Signature Change

**Before:**
```typescript
function extractSurrogateKeys(headers: Headers): string[]
```

**After:**
```typescript
function generateSurrogateKeys(wpPost: WPPost): string[]
```

### Key Generation Algorithm

```typescript
function generateSurrogateKeys(wpPost: WPPost): string[] {
  const keys: string[] = [];

  // Post-specific key
  keys.push(`post-${wpPost.id}`);

  // Post list key
  keys.push('post-list');

  // Category keys
  wpPost.categories.forEach(categoryId => {
    keys.push(`term-${categoryId}`);
  });

  // Tag keys
  wpPost.tags.forEach(tagId => {
    keys.push(`term-${tagId}`);
  });

  // Deduplicate and return
  return [...new Set(keys)];
}
```

### Usage in fetchWordPressPosts

```typescript
// After fetching posts
const wpPosts: WPPost[] = await response.json();

// Generate keys for all posts
const allKeys = wpPosts.flatMap(post => generateSurrogateKeys(post));
const uniqueKeys = [...new Set(allKeys)];

// Apply to cache
uniqueKeys.forEach(key => cacheTag(key));
```

### Usage in fetchWordPressPost

```typescript
// After fetching single post
const wpPosts: WPPost[] = await response.json();
const post = wpPosts[0];

// Generate keys for this post
const surrogateKeys = generateSurrogateKeys(post);

// Apply to cache
surrogateKeys.forEach(key => cacheTag(key));
```

## Error Handling

- If `categories` or `tags` arrays are undefined/null, treat as empty arrays
- Always include `post-{id}` and `post-list` keys (core keys)
- Invalid/zero IDs will create `post-0` or `term-0` keys (harmless, won't match real content)

## Testing

Manual testing will verify:
1. Keys are generated correctly for posts with categories and tags
2. Keys are generated for posts without categories/tags
3. Duplicate keys are removed
4. Cache invalidation works when WordPress webhook sends keys
5. Both list and detail pages are properly tagged

## Migration Notes

- Function is renamed from `extractSurrogateKeys` to `generateSurrogateKeys`
- Headers parameter is removed, WPPost parameter added
- No changes to caller function signatures (both functions are internal)
- Logging updated to reflect generation instead of extraction
