import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@opensoftware/openportal-core",
    "@opensoftware/openportal-db",
    "@opensoftware/openportal-ui",
  ],
  poweredByHeader: false,
};

export default nextConfig;
