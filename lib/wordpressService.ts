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
