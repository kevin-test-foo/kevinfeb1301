import { NextRequest, NextResponse } from 'next/server';
export interface SurrogateKeyMiddlewareConfig {
    /** Enable debug logging for middleware operations */
    debug?: boolean;
    /** Fallback Surrogate-Key when no tags are captured */
    fallbackKey?: string;
    /** Custom matcher pattern for middleware */
    matcher?: string[];
}
/**
 * Creates middleware that propagates cache tags to Surrogate-Key headers.
 *
 * @param config - Optional configuration
 * @returns Next.js middleware function
 */
export declare function createSurrogateKeyMiddleware(config?: SurrogateKeyMiddlewareConfig): (request: NextRequest) => NextResponse<unknown>;
/**
 * Default middleware instance with standard configuration.
 * Import and re-export from your app's middleware.ts for zero-config setup.
 */
export declare const middleware: (request: NextRequest) => NextResponse<unknown>;
/**
 * Default matcher that excludes static assets and Next.js internals.
 * Can be customized by passing config to createSurrogateKeyMiddleware.
 */
export declare const config: {
    matcher: string[];
};
//# sourceMappingURL=surrogate-key.d.ts.map