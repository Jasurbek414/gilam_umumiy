import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external domain tunnel proxy to load without cross-origin issues
  serverExternalPackages: [],
  async redirects() {
    return [];
  },
  async rewrites() {
    // Default to global domain if no env is provided
    const BACKEND_URL = process.env.BACKEND_URL || 'https://gilam-api.ecos.uz';
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
