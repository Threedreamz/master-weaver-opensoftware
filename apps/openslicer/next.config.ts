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
    // Raise Next 16's default 10MB body cap for /api/models/upload.
    // STL/3MF models routinely exceed 10MB; 500MB matches the hub proxy
    // and MAX_UPLOAD_BYTES. Next 16.2 renamed this from
    // `middlewareClientMaxBodySize` → `proxyClientMaxBodySize`.
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default withNextIntl(nextConfig);
