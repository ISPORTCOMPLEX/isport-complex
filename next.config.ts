import type { NextConfig } from 'next';
import { securityHeaders } from './lib/securityHeaders';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/.well-known/security.txt', destination: '/api/security-txt' }];
  },
  async redirects() {
    return [{ source: '/hala', destination: '/ladova-plocha', permanent: true }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
