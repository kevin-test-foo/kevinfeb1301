/**
 * Mock Data Module
 *
 * Provides static mock data matching JSONPlaceholder API structure.
 * Used when E2E_MOCK_DATA=true to eliminate external API dependencies.
 *
 * This ensures:
 * - 100% reliable E2E tests (no JSONPlaceholder downtime)
 * - Deterministic data for assertions
 * - Fast execution (no network latency)
 */

// ============================================================================
// Types
// ============================================================================

export interface MockPost {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface MockUser {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

export interface MockBlog {
  slug: string;
  title: string;
  author: string;
  excerpt: string;
  content: string;
  tags: string[];
  publishedAt: string;
}

// ============================================================================
// Mock Posts (matching JSONPlaceholder structure)
// ============================================================================

export const MOCK_POSTS: MockPost[] = [
  {
    id: 1,
    userId: 1,
    title: "Understanding Next.js Caching",
    body: "This post explores the caching mechanisms in Next.js 14 and how they work with custom cache handlers. We'll dive deep into ISR, SSG, and fetch caching patterns."
  },
  {
    id: 2,
    userId: 1,
    title: "Incremental Static Regeneration Explained",
    body: "ISR allows you to update static pages after build time. This guide covers revalidation strategies and timing considerations for production deployments."
  },
  {
    id: 3,
    userId: 2,
    title: "Tag-Based Cache Invalidation Patterns",
    body: "Learn how to use cache tags to selectively invalidate cached content. Perfect for managing complex dependencies and multi-page updates."
  },
  {
    id: 4,
    userId: 2,
    title: "Performance Optimization with Pantheon AGCDN",
    body: "Discover how Pantheon's Advanced Global CDN integrates with Next.js caching for maximum performance. Includes edge cache clearing patterns."
  },
  {
    id: 5,
    userId: 3,
    title: "Deploying Next.js to Pantheon: Best Practices",
    body: "A comprehensive guide to deploying Next.js applications on Pantheon. Covers build optimization, environment variables, and caching configuration."
  },
  {
    id: 6,
    userId: 3,
    title: "Cache Handler Deep Dive: File vs GCS",
    body: "Compare file-based and Google Cloud Storage cache handlers. Learn when to use each and how they affect application performance."
  },
  {
    id: 7,
    userId: 1,
    title: "Testing Cache Behavior in E2E Tests",
    body: "How to write reliable end-to-end tests for caching behavior. Covers timestamp assertions, state management, and cross-run validation."
  },
  {
    id: 8,
    userId: 2,
    title: "Debugging Cache Issues in Production",
    body: "Troubleshooting guide for common caching problems. Learn to use debug logging and cache stats APIs to diagnose issues."
  },
  {
    id: 9,
    userId: 3,
    title: "The Future of Next.js Caching (2024 Edition)",
    body: "Upcoming changes to Next.js caching architecture. What developers need to know about partial prerendering and cache evolution."
  },
  {
    id: 10,
    userId: 1,
    title: "Edge Case: Handling Very Long Titles That Exceed Typical Character Limits And Test Rendering Edge Cases In UI Components",
    body: "This post specifically tests how the application handles unusually long titles. It includes unicode characters: 你好世界 🚀, special chars: <>&\"', and ensures robust handling of edge cases."
  },
  {
    id: 11,
    userId: 2,
    title: "Cache Headers and CDN Configuration",
    body: "Understanding Cache-Control, Surrogate-Key, and other caching headers. How they interact with CDN layers and affect cache behavior."
  },
  {
    id: 12,
    userId: 3,
    title: "Monitoring Cache Performance Metrics",
    body: "Key metrics to track for cache effectiveness. Learn about cache hit ratios, TTL optimization, and performance monitoring strategies."
  },
  {
    id: 13,
    userId: 1,
    title: "Multi-Region Caching Strategies",
    body: "Deploying cached Next.js apps across multiple regions. Covers replication, invalidation propagation, and consistency patterns."
  },
  {
    id: 14,
    userId: 2,
    title: "Cache Warming Techniques",
    body: "Proactive cache population strategies to ensure optimal performance from the first request. Includes automation patterns."
  },
  {
    id: 15,
    userId: 3,
    title: "Security Considerations for Cached Content",
    body: "Important security patterns when caching authenticated or sensitive data. Learn about cache keys, headers, and isolation strategies."
  },
];

// ============================================================================
// Mock Users (matching JSONPlaceholder structure)
// ============================================================================

export const MOCK_USERS: MockUser[] = [
  {
    id: 1,
    name: "Leanne Graham",
    username: "Bret",
    email: "Sincere@april.biz",
    address: {
      street: "Kulas Light",
      suite: "Apt. 556",
      city: "Gwenborough",
      zipcode: "92998-3874",
      geo: {
        lat: "-37.3159",
        lng: "81.1496"
      }
    },
    phone: "1-770-736-8031 x56442",
    website: "hildegard.org",
    company: {
      name: "Romaguera-Crona",
      catchPhrase: "Multi-layered client-server neural-net",
      bs: "harness real-time e-markets"
    }
  },
  {
    id: 2,
    name: "Ervin Howell",
    username: "Antonette",
    email: "Shanna@melissa.tv",
    address: {
      street: "Victor Plains",
      suite: "Suite 879",
      city: "Wisokyburgh",
      zipcode: "90566-7771",
      geo: {
        lat: "-43.9509",
        lng: "-34.4618"
      }
    },
    phone: "010-692-6593 x09125",
    website: "anastasia.net",
    company: {
      name: "Deckow-Crist",
      catchPhrase: "Proactive didactic contingency",
      bs: "synergize scalable supply-chains"
    }
  },
  {
    id: 3,
    name: "Clementine Bauch",
    username: "Samantha",
    email: "Nathan@yesenia.net",
    address: {
      street: "Douglas Extension",
      suite: "Suite 847",
      city: "McKenziehaven",
      zipcode: "59590-4157",
      geo: {
        lat: "-68.6102",
        lng: "-47.0653"
      }
    },
    phone: "1-463-123-4447",
    website: "ramiro.info",
    company: {
      name: "Romaguera-Jacobson",
      catchPhrase: "Face to face bifurcated interface",
      bs: "e-enable strategic applications"
    }
  },
];

// ============================================================================
// Mock Blogs (derived from posts + users)
// ============================================================================

export const MOCK_BLOGS: MockBlog[] = MOCK_POSTS.slice(0, 10).map((post, index) => {
  const user = MOCK_USERS.find(u => u.id === post.userId) || MOCK_USERS[0];
  const tags = [
    index % 3 === 0 ? 'nextjs' : null,
    index % 2 === 0 ? 'caching' : null,
    index % 5 === 0 ? 'pantheon' : null,
    index % 4 === 0 ? 'performance' : null,
  ].filter((tag): tag is string => tag !== null);

  return {
    slug: post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    title: post.title,
    author: user.name,
    excerpt: post.body.substring(0, 150) + '...',
    content: post.body,
    tags,
    publishedAt: new Date(2024, 0, index + 1).toISOString(),
  };
});
