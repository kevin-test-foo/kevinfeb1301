import { cacheTag, cacheLife } from 'next/cache';
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

/**
 * Fetch all published posts from WordPress (uncached helper)
 */
async function fetchAllWPPosts(): Promise<{ posts: BlogPost[]; surrogateKeys: string[] }> {
  try {
    console.log('[WordPress] Fetching all posts...');

    const url = `${WORDPRESS_API_URL}/posts?_embed&per_page=100&status=publish&orderby=date&order=desc`;

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    console.log('[WordPress] Successfully fetched posts from API, processing data...');
    console.log(`[DEBUG] Response headers:`, Array.from(response.headers.entries()));
    console.log(`[DEBUG] Response status: ${response.status}`);

    const wpPosts: WPPost[] = await response.json();
    console.log(`[DEBUG] Response content:`, wpPosts);

    const allKeys = wpPosts.flatMap(post => generateSurrogateKeys(post));
    const uniqueKeys = [...new Set(allKeys)];

    console.log(`[WordPress] Applying ${uniqueKeys.length} unique cache tags for ${wpPosts.length} posts:`, uniqueKeys);
    console.log(`[WordPress] Successfully fetched ${wpPosts.length} posts`);

    return { posts: wpPosts.map(transformWordPressPost), surrogateKeys: uniqueKeys };

  } catch (error) {
    console.error('[WordPress] Error fetching posts:', error);
    return { posts: [], surrogateKeys: ['post-list'] };
  }
}

/**
 * Fetch single post by slug from WordPress (uncached helper)
 */
async function fetchSingleWPPost(slug: string): Promise<{ post: BlogPost | null; surrogateKeys: string[] }> {
  try {
    console.log(`[WordPress] Fetching post: ${slug}`);

    const url = `${WORDPRESS_API_URL}/posts?_embed&slug=${encodeURIComponent(slug)}&status=publish`;

    const response = await fetch(url, {
      cache: 'no-store',
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
      return { post: null, surrogateKeys: [] };
    }

    const surrogateKeys = generateSurrogateKeys(wpPosts[0]);

    console.log(`[WordPress] Successfully fetched post: ${wpPosts[0].id}`);

    return { post: transformWordPressPost(wpPosts[0]), surrogateKeys };

  } catch (error) {
    console.error(`[WordPress] Error fetching post ${slug}:`, error);
    return { post: null, surrogateKeys: [] };
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
  cacheLife('short');

  const { posts, surrogateKeys } = await fetchAllWPPosts();

  console.log(`[WordPress] Applying ${surrogateKeys.length} unique cache tags`);
  surrogateKeys.forEach(key => cacheTag(key));

  const cachedAt = new Date().toISOString();
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
  cacheLife('short');

  const { post, surrogateKeys } = await fetchSingleWPPost(slug);

  surrogateKeys.forEach(key => cacheTag(key));

  const cachedAt = new Date().toISOString();
  return { post, cachedAt };
}
