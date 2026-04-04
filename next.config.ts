import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Ensure API routes are included in production build
  output: 'standalone',
  // In standalone mode, Next.js will copy public folder to .next/standalone/public
  // But we upload to project root/public/images so files persist across builds
  // Next.js will serve from project root/public, not from standalone
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ];
  },
  async redirects() {
    return [
      {
        source: '/booking',
        destination: '/bookings',
        permanent: false,
      },
      {
        source: '/booking/:path*',
        destination: '/bookings/:path*',
        permanent: false,
      },
      {
        source: '/history',
        destination: '/historys',
        permanent: false,
      },
      {
        source: '/history/:path*',
        destination: '/historys/:path*',
        permanent: false,
      },
    ];
  },
};

// TEAM_007: Export Next.js config for App Router + src structure
export default nextConfig;
