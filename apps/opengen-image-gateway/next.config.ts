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
    "@opensoftware/ui",
  ],
  serverExternalPackages: ["better-sqlite3", "@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"],
  typescript: { ignoreBuildErrors: !!process.env.DOCKER_BUILD },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL ?? "";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}${umamiUrl ? ` ${umamiUrl}` : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              `connect-src 'self' https://fal.run https://queue.fal.run https://api.replicate.com${umamiUrl ? ` ${umamiUrl}` : ""}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
