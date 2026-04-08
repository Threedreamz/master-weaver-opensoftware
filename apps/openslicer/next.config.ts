import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@opensoftware/slicer-core",
    "@opensoftware/shared",
    "@opensoftware/config",
    "@opensoftware/db",
    "@opensoftware/ui",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withNextIntl(nextConfig);
