import type { BlogPost } from '../app/blogs/page';
import { cacheLife, cacheTag } from 'next/cache';
import { getPosts, getUsers } from './data-source';
import type { MockPost } from './mock-data';

// Types for JSONPlaceholder API responses
interface ApiPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

interface ApiUser {
  id: number;
  name: string;
  username: string;
  email: string;
  website: string;
  phone: string;
}

// Utility function to create slug from title
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

// Utility function to generate excerpt from body
function createExcerpt(body: string, maxLength: number = 150): string {
  return body.length > maxLength ? body.substring(0, maxLength) + '...' : body;
}

// Utility function to estimate reading time
function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Sample tags for variety
const sampleTags = [
  ['Technology', 'Web Development'],
  ['JavaScript', 'Programming'],
  ['Design', 'User Experience'],
  ['Tutorial', 'Guide'],
  ['Best Practices', 'Tips'],
  ['React', 'Frontend'],
  ['Backend', 'API'],
  ['Performance', 'Optimization'],
  ['Security', 'Authentication'],
  ['Database', 'SQL']
];

/**
 * Transform API data to our BlogPost structure
 */
function transformApiData(posts: ApiPost[], users: ApiUser[]): BlogPost[] {
  return posts.map((post, index) => {
    const user = users.find(u => u.id === post.userId);
    const baseDate = new Date('2024-01-01');
    const publishDate = new Date(baseDate.getTime() + (index * 24 * 60 * 60 * 1000));

    return {
      id: post.id,
      userId: post.userId,
      title: post.title.charAt(0).toUpperCase() + post.title.slice(1),
      body: post.body,
      slug: createSlug(post.title),
      excerpt: createExcerpt(post.body),
      author: {
        name: user?.name || 'Anonymous',
        email: user?.email || '',
        website: user?.website || ''
      },
      publishedAt: publishDate.toISOString(),
      readingTime: calculateReadingTime(post.body),
      tags: sampleTags[index % sampleTags.length] || ['General']
    };
  });
}

// Result type that includes cache metadata
export interface BlogPostsResult {
  posts: BlogPost[];
  cachedAt: string;
}

/**
 * Get all blog posts using Next.js 16 'use cache' directive
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const result = await getBlogPostsWithMetadata();
  return result.posts;
}

/**
 * Get all blog posts with cache metadata
 */
export async function getBlogPostsWithMetadata(): Promise<BlogPostsResult> {
  'use cache';
  cacheLife('blog'); // Uses custom profile: 60s stale, 300s revalidate, 3600s expire

  try {
    console.log('[API] Fetching blog posts...');

    // Capture the cache time inside the cached function
    const cachedAt = new Date().toISOString();

    // Fetch posts and users in parallel
    const [posts, users] = await Promise.all([
      fetchPostsWithTags(),
      getUsers()
    ]);

    console.log(`[API] Successfully fetched ${posts.length} posts and ${users.length} users`);

    // Transform and return only first 10 posts for better UX
    return {
      posts: transformApiData(posts.slice(0, 10), users),
      cachedAt,
    };

  } catch (error) {
    console.error('[API] Error fetching blog posts:', error);
    // Return empty array on error - in production you might want to throw
    return { posts: [], cachedAt: new Date().toISOString() };
  }
}

// Result type for single blog post with cache metadata
export interface BlogPostResult {
  post: BlogPost | null;
  cachedAt: string;
}

/**
 * Get a single blog post by slug using Next.js fetch caching
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const result = await getBlogPostWithMetadata(slug);
  return result.post;
}

/**
 * Get a single blog post by slug with cache metadata
 */
export async function getBlogPostWithMetadata(slug: string): Promise<BlogPostResult> {
  try {
    console.log(`[API] Fetching blog post: ${slug}`);

    // Get all posts to find the one with matching slug
    const { posts: allPosts, cachedAt } = await getBlogPostsWithMetadata();
    const post = allPosts.find(p => p.slug === slug);

    if (!post) {
      console.log(`[API] Post not found: ${slug}`);
      return { post: null, cachedAt };
    }

    console.log(`[API] Successfully found blog post: ${post.id}`);
    return { post, cachedAt };

  } catch (error) {
    console.error(`[API] Error fetching blog post ${slug}:`, error);
    return { post: null, cachedAt: new Date().toISOString() };
  }
}

// ==================== API ROUTE CACHE TESTING FUNCTIONS ====================

// Result type for cache testing functions that includes timing metadata
export interface CachedPostsResult {
  posts: ApiPost[];
  cachedAt: string;
}

/**
 * Fetch posts with no-store cache strategy
 * This bypasses all caching and fetches fresh data on every request
 */
export async function fetchPostsWithNoCache(): Promise<ApiPost[]> {
  console.log('[BlogService] Fetching posts with no-store cache...');

  const posts = await getPosts({ cache: 'no-store' });
  const limitedPosts = posts.slice(0, 3);

  console.log(`[BlogService] Fetched ${limitedPosts.length} posts with no-store`);
  return limitedPosts;
}

/**
 * Fetch posts with no-store cache strategy (with metadata)
 * Returns timestamp for cache validation testing
 */
export async function fetchPostsWithNoCacheAndMetadata(): Promise<CachedPostsResult> {
  console.log('[BlogService] Fetching posts with no-store cache...');

  const posts = await getPosts({ cache: 'no-store' });
  const limitedPosts = posts.slice(0, 3);
  const cachedAt = new Date().toISOString();

  console.log(`[BlogService] Fetched ${limitedPosts.length} posts with no-store at ${cachedAt}`);
  return { posts: limitedPosts, cachedAt };
}

/**
 * Fetch posts with force-cache strategy
 * This caches the response indefinitely until manually revalidated
 */
export async function fetchPostsWithForceCache(): Promise<ApiPost[]> {
  console.log('[BlogService] Fetching posts with force-cache...');

  const posts = await getPosts({ cache: 'force-cache' });
  const limitedPosts = posts.slice(0, 3);

  console.log(`[BlogService] Fetched ${limitedPosts.length} posts with force-cache`);
  return limitedPosts;
}

/**
 * Fetch posts with force-cache strategy (with metadata)
 * Uses 'use cache' directive to capture when data was actually cached
 * The timestamp will remain stable across requests when cache is hit
 */
export async function fetchPostsWithForceCacheAndMetadata(): Promise<CachedPostsResult> {
  'use cache';
  cacheLife('hours'); // Long cache duration for force-cache semantics

  console.log('[BlogService] Fetching posts with force-cache (use cache)...');

  const posts = await getPosts({ cache: 'force-cache' });
  const limitedPosts = posts.slice(0, 3);
  const cachedAt = new Date().toISOString();

  console.log(`[BlogService] Cached ${limitedPosts.length} posts at ${cachedAt}`);
  return { posts: limitedPosts, cachedAt };
}

/**
 * Fetch posts with revalidate strategy
 * This caches the response for 60 seconds before revalidating
 */
export async function fetchPostsWithRevalidate(): Promise<ApiPost[]> {
  console.log('[BlogService] Fetching posts with 60s revalidation...');

  const posts = await getPosts({ revalidate: 60 });
  const limitedPosts = posts.slice(0, 3);

  console.log(`[BlogService] Fetched ${limitedPosts.length} posts with 60s revalidation`);
  return limitedPosts;
}

/**
 * Fetch posts with revalidate strategy (with metadata)
 * Uses 'use cache' with 'short' profile (60s) for testing
 */
export async function fetchPostsWithRevalidateAndMetadata(): Promise<CachedPostsResult> {
  'use cache';
  cacheLife('short'); // 60s revalidation from config

  console.log('[BlogService] Fetching posts with 60s revalidation (use cache)...');

  const posts = await getPosts({ revalidate: 60 });
  const limitedPosts = posts.slice(0, 3);
  const cachedAt = new Date().toISOString();

  console.log(`[BlogService] Cached ${limitedPosts.length} posts at ${cachedAt}`);
  return { posts: limitedPosts, cachedAt };
}

/**
 * Fetch posts with tagged cache strategy
 *
 * Next.js 15 approach: Uses fetch() with next.tags option
 * This tests the cacheHandler (singular) system for on-demand revalidation.
 *
 * NOTE: This intentionally does NOT use 'use cache' directive to keep
 * the Next.js 15 and Next.js 16 caching approaches separate for testing.
 * - Next.js 15: fetch() with next.tags → uses cacheHandler (singular)
 * - Next.js 16: 'use cache' + cacheTag() → uses cacheHandlers (plural)
 */
export async function fetchPostsWithTags(): Promise<ApiPost[]> {
  console.log('[BlogService] Fetching posts with fetch next.tags (Next.js 15 approach)...');

  const posts = await getPosts({
    tags: ['api-posts', 'external-data'],
    revalidate: 300, // 5 minutes
  });
  const limitedPosts = posts.slice(0, 3);

  console.log(`[BlogService] Fetched ${limitedPosts.length} posts with fetch tags`);
  return limitedPosts;
}

/**
 * Fetch posts with tagged cache strategy (with metadata) - Next.js 15 compatible
 *
 * This tests the COMBINED tag revalidation flow:
 * - Tags on fetch() via next.tags → tests cacheHandler (singular)
 * - Tags on function via cacheTag() → tests cacheHandlers (plural)
 *
 * When revalidateTag('api-posts') is called, BOTH cache layers are invalidated:
 * 1. The fetch Data Cache entry (cacheHandler)
 * 2. The function cache entry (cacheHandlers)
 *
 * This represents the recommended pattern for Next.js apps that need
 * tag-based revalidation to work reliably across all cache layers.
 *
 * For pure Next.js 16 approach (cacheTag only), see /api/cache-components/tagged
 */
export async function fetchPostsWithTagsNext15(): Promise<CachedPostsResult> {
  'use cache';
  cacheLife('blog');
  cacheTag('api-posts', 'external-data'); // Tags at function level for revalidation

  console.log('[BlogService] Fetching posts (combined fetch + function tags)...');

  // Tags also at fetch level for comprehensive cache coverage
  const posts = await getPosts({
    tags: ['api-posts', 'external-data'],
    revalidate: 300,
  });
  const limitedPosts = posts.slice(0, 3);
  const cachedAt = new Date().toISOString();

  console.log(`[BlogService] Cached ${limitedPosts.length} posts at ${cachedAt}`);
  return { posts: limitedPosts, cachedAt };
}

/**
 * Fetch posts with tagged cache strategy (with metadata)
 *
 * Next.js 16 approach: Uses 'use cache' directive with cacheTag()
 * This tests the cacheHandlers (plural) system for on-demand revalidation.
 *
 * NOTE: This intentionally does NOT use fetch's next.tags option to keep
 * the Next.js 15 and Next.js 16 caching approaches separate for testing.
 * - Next.js 15: fetch() with next.tags → uses cacheHandler (singular)
 * - Next.js 16: 'use cache' + cacheTag() → uses cacheHandlers (plural)
 */
export async function fetchPostsWithTagsAndMetadata(): Promise<CachedPostsResult> {
  'use cache';
  cacheLife('blog'); // 5min revalidation from config
  cacheTag('api-posts', 'external-data'); // All tags at 'use cache' level

  console.log('[BlogService] Fetching posts with use cache + cacheTag (Next.js 16 approach)...');

  // No tags/revalidate here - the outer 'use cache' block handles caching
  const posts = await getPosts();
  const limitedPosts = posts.slice(0, 3);
  const cachedAt = new Date().toISOString();

  console.log(`[BlogService] Cached ${limitedPosts.length} posts with cacheTag at ${cachedAt}`);
  return { posts: limitedPosts, cachedAt };
}