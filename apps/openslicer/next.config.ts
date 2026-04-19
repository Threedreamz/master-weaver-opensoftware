import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@opensoftware/slicer-core",
    "@opensoftware/shared",
    "@opensoftware/config",
    "@opensoftware/db",
    "@opensoftware/ui",
  ],
  serverExternalPackages: ["better-sqlite3"],
  typescript: { ignoreBuildErrors: !!process.env.DOCKER_BUILD },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default withNextIntl(nextConfig);
