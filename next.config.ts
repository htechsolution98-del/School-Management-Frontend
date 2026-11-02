import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,

  experimental: {
    // Tree-shake heavy icon and component packages across all 213 routes
    optimizePackageImports: [
      "lucide-react",
      "@hugeicons/react",
      "react-icons",
      "@mui/material",
      "date-fns",
      "framer-motion",
    ],
  },
};

export default nextConfig;
