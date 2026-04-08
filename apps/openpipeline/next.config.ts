import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@opensoftware/ui", "@opensoftware/db", "@opensoftware/config"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
