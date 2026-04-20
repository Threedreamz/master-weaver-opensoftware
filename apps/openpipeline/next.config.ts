import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@opensoftware/ui", "@opensoftware/db", "@opensoftware/config"],
  serverExternalPackages: ["better-sqlite3"],
  typescript: { ignoreBuildErrors: !!process.env.DOCKER_BUILD },
};

export default nextConfig;
