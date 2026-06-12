import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external domain tunnel proxy to load without cross-origin issues
  serverExternalPackages: ['googleapis'],
  // Build optimizations: skip TS checks to reduce RAM usage on server
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    // Default to local backend if no env is provided
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
