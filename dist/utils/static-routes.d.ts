/**
 * Gets static routes from prerender-manifest.json.
 * Static routes have initialRevalidateSeconds: false (never revalidate).
 * These should not be cleared as they are built during build time.
 */
export declare function getStaticRoutes(): Set<string>;
//# sourceMappingURL=static-routes.d.ts.map