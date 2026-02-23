import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Pantheon deployment
  output: 'standalone',

  // Configure Turbopack to resolve linked packages from parent directory
  // Required for npm link to work with local @pantheon-systems/nextjs-cache-handler
  turbopack: {
    root: path.join(__dirname, '..'),
  },

  // Transpile the local cache handler package
  transpilePackages: ['@pantheon-systems/nextjs-cache-handler'],

  // Legacy cache handler for ISR, route handlers, fetch cache
  cacheHandler: path.resolve(__dirname, './cache-handler.mjs'),

  cacheMaxMemorySize: 0, // disable default in-memory caching
};

export default nextConfig;
