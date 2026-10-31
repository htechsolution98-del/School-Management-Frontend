import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Keep Next's build worker count low on memory-limited environments.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
