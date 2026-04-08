import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: !!process.env.DOCKER_BUILD,
  },
};

export default nextConfig;
