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
  // better-sqlite3 is a native module; Replicad's WASM kernel is a large
  // dynamic import — both must be externalised from the server bundle.
  serverExternalPackages: ["better-sqlite3", "replicad", "replicad-opencascadejs"],
  typescript: { ignoreBuildErrors: !!process.env.DOCKER_BUILD },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Raise Next 16's default 10MB body cap for STEP/STL imports.
    // 500MB matches the hub proxy and upstream openslicer.
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
