import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typedRoutes: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
