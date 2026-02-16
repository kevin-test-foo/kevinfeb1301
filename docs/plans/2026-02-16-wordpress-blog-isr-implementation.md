# WordPress Blog ISR Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate WordPress as headless CMS for Next.js blog using Pantheon surrogate key system with webhook-driven cache invalidation.

**Architecture:** Replace JSONPlaceholder with WordPress REST API, extract surrogate keys from response headers, tag Next.js cache entries, and implement secure webhook endpoint for targeted revalidation.

**Tech Stack:** Next.js 16, WordPress REST API, Pantheon Advanced Page Cache, @pantheon-systems/nextjs-cache-handler, isomorphic-dompurify

---

## Task 1: Install HTML Sanitization Library

**Files:**
- Modify: `package.json`

**Step 1: Install isomorphic-dompurify for HTML sanitization**

Run:
```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

Expected: Packages installed successfully

**Step 2: Commit dependency**

```bash
git add package.json package-lock.json
git commit -m "chore: add isomorphic-dompurify for HTML sanitization

Add HTML sanitizer for WordPress content to prevent XSS vulnerabilities.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create WordPress Service Foundation

**Files:**
- Create: `lib/wordpressService.ts`

**Step 1: Create WordPress types and utility functions**

Create `lib/wordpressService.ts` with TypeScript interfaces for WordPress API:

```typescript
import { cacheLife, cacheTag } from 'next/cache';
import DOMPurify from 'isomorphic-dompurify';
import type { BlogPost } from '../app/blogs/page';

// WordPress REST API response types
interface WPPost {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  _embedded?: {
    author?: WPAuthor[];
    'wp:featuredmedia'?: WPMedia[];
    'wp:term'?: WPTerm[][];
  };
}

interface WPAuthor {
  id: number;
  name: string;
  description: string;
  avatar_urls: {
    [key: string]: string;
  };
  url: string;
}

interface WPMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
  };
}

interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: 'category' | 'post_tag';
}

// Get WordPress API URL from environment
const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL;

if (!WORDPRESS_API_URL) {
  throw new Error('WORDPRESS_API_URL environment variable is required');
}

/**
 * Sanitize HTML content from WordPress to prevent XSS attacks
 */
function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
  });
}

/**
 * Extract surrogate keys from WordPress response headers
 */
function extractSurrogateKeys(headers: Headers): string[] {
  const surrogateKey = headers.get('Surrogate-Key') || headers.get('surrogate-key');

  if (!surrogateKey) {
    console.warn('[WordPress] No Surrogate-Key header found in response');
    return ['wordpress-posts']; // Fallback tag
  }

  // Surrogate keys are space-separated
  const keys = surrogateKey.split(' ').filter(key => key.trim().length > 0);

  console.log(`[WordPress] Extracted surrogate keys: ${keys.join(', ')}`);

  // Always include fallback tag
  return [...new Set([...keys, 'wordpress-posts'])];
}

/**
 * Calculate reading time from HTML content
 */
function calculateReadingTime(html: string): number {
  // Strip HTML tags and count words
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const wordsPerMinute = 200;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Transform WordPress post to BlogPost interface
 */
function transformWordPressPost(wpPost: WPPost): BlogPost {
  const author = wpPost._embedded?.author?.[0];
  const featuredMedia = wpPost._embedded?.['wp:featuredmedia']?.[0];
  const terms = wpPost._embedded?.['wp:term'] || [];

  // Extract categories and tags
  const categories = terms
    .flat()
    .filter(term => term.taxonomy === 'category')
    .map(term => term.name);

  const tags = terms
    .flat()
    .filter(term => term.taxonomy === 'post_tag')
    .map(term => term.name);

  return {
    id: wpPost.id,
    userId: wpPost.author,
    title: sanitizeHTML(wpPost.title.rendered),
    body: sanitizeHTML(wpPost.content.rendered),
    slug: wpPost.slug,
    excerpt: sanitizeHTML(wpPost.excerpt.rendered).replace(/<[^>]*>/g, '').trim(),
    author: {
      name: author?.name || 'Anonymous',
      email: '', // WordPress doesn't expose email in public API
      website: author?.url || '',
    },
    publishedAt: wpPost.date,
    readingTime: calculateReadingTime(wpPost.content.rendered),
    tags: tags.length > 0 ? tags : categories, // Use categories as tags if no tags
  };
}
```

**Step 2: Commit types and utilities**

```bash
git add lib/wordpressService.ts
git commit -m "feat: add WordPress service types and utilities

Add TypeScript interfaces for WordPress REST API responses, HTML
sanitization, surrogate key extraction, and post transformation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Implement WordPress Data Fetching

**Files:**
- Modify: `lib/wordpressService.ts`

**Step 1: Add fetch functions with surrogate key tagging**

Add to `lib/wordpressService.ts`:

```typescript
/**
 * Fetch all published posts from WordPress
 */
export async function fetchWordPressPosts(): Promise<BlogPost[]> {
  'use cache';
  cacheLife('blog'); // Uses custom profile: 60s stale, 300s revalidate, 3600s expire

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

    // Extract and apply surrogate keys
    const surrogateKeys = extractSurrogateKeys(response.headers);
    surrogateKeys.forEach(key => cacheTag(key));

    const wpPosts: WPPost[] = await response.json();

    console.log(`[WordPress] Successfully fetched ${wpPosts.length} posts`);

    return wpPosts.map(transformWordPressPost);

  } catch (error) {
    console.error('[WordPress] Error fetching posts:', error);
    // Return empty array - Next.js will serve stale cache if available
    return [];
  }
}

/**
 * Fetch single post by slug from WordPress
 */
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

    // Extract and apply surrogate keys
    const surrogateKeys = extractSurrogateKeys(response.headers);
    surrogateKeys.forEach(key => cacheTag(key));

    const wpPosts: WPPost[] = await response.json();

    if (wpPosts.length === 0) {
      console.log(`[WordPress] Post not found: ${slug}`);
      return null;
    }

    console.log(`[WordPress] Successfully fetched post: ${wpPosts[0].id}`);

    return transformWordPressPost(wpPosts[0]);

  } catch (error) {
    console.error(`[WordPress] Error fetching post ${slug}:`, error);
    // Return null - Next.js will serve stale cache if available
    return null;
  }
}

/**
 * Fetch all posts with cache metadata (for displaying cache timestamp)
 */
export async function fetchWordPressPostsWithMetadata(): Promise<{
  posts: BlogPost[];
  cachedAt: string;
}> {
  'use cache';
  cacheLife('blog');

  const cachedAt = new Date().toISOString();
  const posts = await fetchWordPressPosts();

  return { posts, cachedAt };
}

/**
 * Fetch single post with cache metadata
 */
export async function fetchWordPressPostWithMetadata(slug: string): Promise<{
  post: BlogPost | null;
  cachedAt: string;
}> {
  'use cache';
  cacheLife('blog');

  const cachedAt = new Date().toISOString();
  const post = await fetchWordPressPost(slug);

  return { post, cachedAt };
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds without TypeScript errors

**Step 3: Commit WordPress fetch functions**

```bash
git add lib/wordpressService.ts
git commit -m "feat: implement WordPress data fetching with surrogate keys

Add functions to fetch posts from WordPress REST API with surrogate key
extraction and cache tagging using Next.js 16 'use cache' directive.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Webhook Endpoint for Security

**Files:**
- Modify: `app/api/revalidate/route.ts`

**Step 1: Add webhook secret validation**

Replace contents of `app/api/revalidate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.warn('[Revalidate] WARNING: WEBHOOK_SECRET not set - webhook endpoint is insecure!');
}

/**
 * Validate webhook secret from request
 */
function validateWebhookSecret(request: NextRequest, bodySecret?: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[Revalidate] Skipping secret validation - WEBHOOK_SECRET not configured');
    return true; // Allow in dev without secret
  }

  // Check header first
  const headerSecret = request.headers.get('X-Webhook-Secret');
  if (headerSecret === WEBHOOK_SECRET) {
    return true;
  }

  // Check body secret
  if (bodySecret === WEBHOOK_SECRET) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, surrogate_keys } = body;

    // Validate secret
    if (!validateWebhookSecret(request, secret)) {
      console.error('[Revalidate] Unauthorized: Invalid webhook secret');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook secret' },
        { status: 401 }
      );
    }

    // Validate surrogate_keys array
    if (!surrogate_keys || !Array.isArray(surrogate_keys) || surrogate_keys.length === 0) {
      console.error('[Revalidate] Bad request: surrogate_keys array required');
      return NextResponse.json(
        { error: 'surrogate_keys array is required' },
        { status: 400 }
      );
    }

    console.log(`[Revalidate] Revalidating ${surrogate_keys.length} cache tags:`, surrogate_keys);

    // Revalidate each surrogate key
    const results = [];
    for (const key of surrogate_keys) {
      try {
        revalidateTag(key, 'max');
        results.push({ key, status: 'success' });
        console.log(`[Revalidate] ✓ Revalidated: ${key}`);
      } catch (error) {
        results.push({ key, status: 'error', message: String(error) });
        console.error(`[Revalidate] ✗ Failed to revalidate ${key}:`, error);
      }
    }

    return NextResponse.json({
      message: `Revalidated ${surrogate_keys.length} cache tags`,
      revalidated_at: new Date().toISOString(),
      results,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[Revalidate] Error processing webhook:', error);

    return NextResponse.json(
      { error: 'Failed to process webhook', message: String(error) },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        }
      }
    );
  }
}

// Keep GET method for manual testing
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tag = url.searchParams.get('tag');
  const secret = url.searchParams.get('secret');

  // Validate secret
  if (!validateWebhookSecret(request, secret || undefined)) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid webhook secret' },
      { status: 401 }
    );
  }

  if (!tag) {
    return NextResponse.json(
      {
        error: 'Cache tag is required. Use ?tag=your-tag-name&secret=your-secret',
        available_tags: ['wordpress-posts', 'post-123', 'author-5']
      },
      { status: 400 }
    );
  }

  console.log(`[Revalidate] Manual revalidation of tag: ${tag}`);

  try {
    revalidateTag(tag, 'max');

    return NextResponse.json({
      message: `Cache tag '${tag}' has been revalidated`,
      revalidated_at: new Date().toISOString(),
      tag
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
      }
    });

  } catch (error) {
    console.error('[Revalidate] Error:', error);

    return NextResponse.json(
      { error: 'Failed to revalidate cache', message: String(error) },
      {
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        }
      }
    );
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 3: Commit webhook security**

```bash
git add app/api/revalidate/route.ts
git commit -m "feat: add webhook secret validation to revalidate endpoint

Add WEBHOOK_SECRET validation for WordPress webhooks. Support secret in
both header (X-Webhook-Secret) and body. Handle surrogate_keys array.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update Blog Listing Page

**Files:**
- Modify: `app/blogs/page.tsx`

**Step 1: Update imports and use WordPress service**

Modify `app/blogs/page.tsx`:

```typescript
import Link from 'next/link';
import { fetchWordPressPostsWithMetadata } from '../../lib/wordpressService';

export interface BlogPost {
  id: number;
  userId: number;
  title: string;
  body: string;
  // Enhanced fields from API transformation
  slug: string;
  excerpt: string;
  author: {
    name: string;
    email: string;
    website: string;
  };
  publishedAt: string;
  readingTime: number;
  tags: string[];
}

export default async function BlogsPage() {
  const { posts: blogs, cachedAt } = await fetchWordPressPostsWithMetadata();

  // Next.js 16: Use cached timestamp from the cache component
  const generatedAt = new Date(cachedAt);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
            Blog
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Thoughts, tutorials, and insights from WordPress
          </p>

          {/* ISR indicator - shows when the page was generated */}
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">ISR Status</span>
            </div>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Page generated at:{' '}
              <time className="font-mono font-semibold" dateTime={generatedAt.toISOString()}>
                {generatedAt.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </time>
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Webhook-driven revalidation. Content updates immediately when WordPress publishes.
            </p>
          </div>
        </header>

        {blogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-zinc-500 dark:text-zinc-400">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>{blog.author.name}</span>
                    <span>•</span>
                    <time dateTime={blog.publishedAt}>
                      {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <span>•</span>
                    <span>{blog.readingTime} min read</span>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      <Link
                        href={`/blogs/${blog.slug}`}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {blog.title}
                      </Link>
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {blog.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {blog.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/blogs/${blog.slug}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors"
                    >
                      Read more →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            About
          </Link>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit blog listing update**

```bash
git add app/blogs/page.tsx
git commit -m "feat: integrate WordPress service in blog listing page

Replace JSONPlaceholder with WordPress service. Update messaging to
reflect webhook-driven revalidation. Add empty state handling.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update Blog Detail Page

**Files:**
- Modify: `app/blogs/[slug]/page.tsx`

**Step 1: Update imports and use WordPress service**

Modify `app/blogs/[slug]/page.tsx` - use sanitized HTML via dangerouslySetInnerHTML (content is already sanitized in wordpressService):

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchWordPressPost, fetchWordPressPostWithMetadata, fetchWordPressPosts } from '../../../lib/wordpressService';
import type { BlogPost } from '../page';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  // Generate static params using WordPress service
  const blogs = await fetchWordPressPosts();
  return blogs.map((blog) => ({
    slug: blog.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const {slug} = await params
  const blog = await fetchWordPressPost(slug);

  if (!blog) {
    return {
      title: 'Blog Post Not Found',
    };
  }

  return {
    title: blog.title,
    description: blog.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const {slug} = await params
  const { post: blog, cachedAt } = await fetchWordPressPostWithMetadata(slug);

  if (!blog) {
    notFound();
  }

  // Next.js 16: Use cached timestamp from the cache component
  const generatedAt = new Date(cachedAt);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Back to Blog
          </Link>

          {/* ISR indicator */}
          <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
            <span className="font-medium">ISR:</span>{' '}
            <time className="font-mono" dateTime={generatedAt.toISOString()}>
              {generatedAt.toLocaleString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </time>
            <span className="text-amber-500 dark:text-amber-500 ml-1">(webhook)</span>
          </div>
        </nav>

        <article className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
                {blog.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                <span className="font-medium">{blog.author.name}</span>
                <span>•</span>
                <time dateTime={blog.publishedAt}>
                  {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span>•</span>
                <span>{blog.readingTime} min read</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {blog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {blog.excerpt}
              </p>
            </header>

            {/* Content is sanitized in wordpressService.ts using DOMPurify */}
            <div
              className="prose prose-zinc dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: blog.body }}
            />
          </div>

          <footer className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                  Written by {blog.author.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Published on {new Date(blog.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Read More Posts
              </Link>
            </div>
          </footer>
        </article>

        <nav className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Back to Home
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            About
          </Link>
        </nav>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit blog detail update**

```bash
git add app/blogs/[slug]/page.tsx
git commit -m "feat: integrate WordPress service in blog detail page

Replace JSONPlaceholder with WordPress service. Render sanitized HTML
content from WordPress. Update ISR indicator for webhook revalidation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Environment Configuration

**Files:**
- Create: `.env.local.example`
- Modify: `README.md` (if exists) or create docs

**Step 1: Create environment template**

Create `.env.local.example`:

```bash
# WordPress Headless CMS Configuration
WORDPRESS_API_URL=https://dev-devx6473wp.pantheonsite.io/wp-json/wp/v2

# Webhook Security
WEBHOOK_SECRET=your-secure-random-secret-here

# Note: Copy this file to .env.local and update with your actual values
```

**Step 2: Document environment setup**

Create or update `README.md` with WordPress setup section:

```markdown
## WordPress Integration

This Next.js app uses WordPress as a headless CMS with Pantheon's surrogate key system for cache invalidation.

### Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

- `WORDPRESS_API_URL`: Your WordPress REST API endpoint (required)
  - Example: `https://dev-devx6473wp.pantheonsite.io/wp-json/wp/v2`
- `WEBHOOK_SECRET`: Secret token for webhook authentication (required)
  - Generate with: `openssl rand -base64 32`

### WordPress Setup

1. Install required plugins:
   - Pantheon Advanced Page Cache (for surrogate keys)
   - WP Webhooks or custom webhook solution

2. Configure permalinks:
   - Go to Settings → Permalinks
   - Set to "Post name" structure

3. Configure webhook:
   - Trigger on: `save_post`, `publish_post`
   - URL: `https://your-nextjs-app.com/api/revalidate`
   - Method: POST
   - Headers: `X-Webhook-Secret: your-webhook-secret`
   - Body (JSON):
     ```json
     {
       "secret": "your-webhook-secret",
       "surrogate_keys": ["post-{post_id}", "wordpress-posts"]
     }
     ```

### Security

WordPress content is sanitized using DOMPurify to prevent XSS attacks. Only safe HTML tags and attributes are allowed in rendered content.

### Testing Revalidation

Manual cache invalidation:
```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"secret":"your-secret","surrogate_keys":["wordpress-posts"]}'
```

Or via GET:
```bash
curl "http://localhost:3000/api/revalidate?tag=wordpress-posts&secret=your-secret"
```
```

**Step 3: Commit environment configuration**

```bash
git add .env.local.example README.md
git commit -m "docs: add WordPress environment configuration

Add environment template and WordPress setup documentation including
webhook configuration, security notes, and testing instructions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Manual Testing and Verification

**Files:**
- Test: All WordPress integration features

**Step 1: Set up environment**

Create `.env.local`:
```bash
WORDPRESS_API_URL=https://dev-devx6473wp.pantheonsite.io/wp-json/wp/v2
WEBHOOK_SECRET=test-secret-123
```

**Step 2: Build and run application**

Run:
```bash
npm run build
npm run start
```

Expected: Build succeeds, server starts on port 3000

**Step 3: Test blog listing page**

1. Open: `http://localhost:3000/blogs`
2. Verify:
   - WordPress posts load and display
   - ISR timestamp shows
   - Post metadata (author, date, tags) displays correctly
   - "No posts yet" shows if WordPress has no posts

**Step 4: Test blog detail page**

1. Click on a blog post
2. Verify:
   - Full post content displays with HTML formatting
   - Featured image shows (if available)
   - Tags and categories display
   - ISR timestamp shows with "(webhook)" indicator
   - HTML content is properly sanitized (no scripts execute)

**Step 5: Test webhook endpoint**

Test with curl:
```bash
# Valid secret
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"secret":"test-secret-123","surrogate_keys":["wordpress-posts"]}'
```

Expected: 200 response with revalidation confirmation

```bash
# Invalid secret
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"secret":"wrong","surrogate_keys":["wordpress-posts"]}'
```

Expected: 401 Unauthorized

**Step 6: Verify surrogate key extraction**

Check server logs for:
```
[WordPress] Extracted surrogate keys: post-123, wordpress-posts, ...
```

**Step 7: Test error handling**

1. Stop WordPress (or use invalid URL)
2. Reload `/blogs`
3. Verify: Stale cached content still displays (if cache exists)

**Step 8: Document test results**

Create test results file or update plan with findings.

---

## Task 9: Final Commit and Cleanup

**Step 1: Remove old blog service (optional)**

If no longer needed:
```bash
# Keep for reference or remove if not used elsewhere
# git rm lib/blogService.ts lib/data-source.ts lib/mock-data.ts
```

**Step 2: Final verification build**

Run:
```bash
npm run build
npm run lint
```

Expected: Clean build and lint with no errors

**Step 3: Create final commit**

```bash
git add -A
git commit -m "chore: finalize WordPress blog ISR integration

Complete WordPress headless CMS integration with Pantheon surrogate key
system. All tests passing, documentation complete.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

- [ ] WordPress posts load on `/blogs` page
- [ ] Individual posts load on `/blogs/[slug]` pages
- [ ] HTML content is sanitized with DOMPurify
- [ ] Surrogate keys extracted from WordPress headers
- [ ] Cache tagged with surrogate keys
- [ ] Webhook endpoint validates secret
- [ ] Webhook revalidates cache tags
- [ ] Stale content serves when WordPress unavailable
- [ ] TypeScript compiles without errors
- [ ] All commits follow conventional format
- [ ] Environment documentation complete

## WordPress Plugin Configuration

After deployment, configure WordPress webhook with this payload structure:

```json
{
  "secret": "YOUR_WEBHOOK_SECRET",
  "surrogate_keys": [
    "post-{post_id}",
    "wordpress-posts",
    "author-{author_id}"
  ]
}
```

Replace `{post_id}` and `{author_id}` with actual values from WordPress hooks.
