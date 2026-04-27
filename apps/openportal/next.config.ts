import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@opensoftware/openportal-core",
    "@opensoftware/openportal-db",
    "@opensoftware/openportal-ui",
  ],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/call/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: [
              'camera=(self "https://meet.jit.si")',
              'microphone=(self "https://meet.jit.si")',
              'display-capture=(self "https://meet.jit.si")',
              'autoplay=(self "https://meet.jit.si")',
              'fullscreen=(self "https://meet.jit.si")',
            ].join(", "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
