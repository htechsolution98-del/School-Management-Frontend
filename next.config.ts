import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  productionBrowserSourceMaps: false,

  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
    // Tree-shake heavy icon and component packages across all 213 routes
    optimizePackageImports: [
      "lucide-react",
      "@hugeicons/react",
      "react-icons",
      "date-fns",
      "framer-motion",
    ],
  },
};

export default nextConfig;
