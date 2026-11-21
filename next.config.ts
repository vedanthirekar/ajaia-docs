import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents / partialPrefetching are intentionally off: every page in
  // this app is per-user and request-time, so caching adds constraints without
  // benefit. See decisions.md (D-011).
  serverExternalPackages: ["mammoth", "@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
