import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  turbopack: {
    root: path.join(__dirname, "../../"),
  },
  transpilePackages: [
    "@opensoftware/shared",
    "@opensoftware/config",
    "@opensoftware/db",
    "@opensoftware/ui",
  ],
  // better-sqlite3 is a native module — must be externalised from the server
  // bundle. Numeric solver libs (if any land later) should be added here too.
  serverExternalPackages: ["better-sqlite3"],
  typescript: { ignoreBuildErrors: !!process.env.DOCKER_BUILD },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Raise Next 16's default 10MB body cap for mesh/FEA payloads.
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
