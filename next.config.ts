import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Receipt photos are shrunk to under 1 MB; allow a little extra room.
    serverActions: { bodySizeLimit: "2mb" },
  },
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
