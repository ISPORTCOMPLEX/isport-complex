import type { NextConfig } from 'next';
import { securityHeaders } from './lib/securityHeaders';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/.well-known/security.txt', destination: '/api/security-txt' },
      { source: '/robots.txt', destination: '/api/robots' },
      { source: '/humans.txt', destination: '/api/humans' },
      { source: '/aktuality/rss.xml', destination: '/api/rss' },
    ];
  },
  async redirects() {
    return [{ source: '/hala', destination: '/ladova-plocha', permanent: true }];
  },
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    return [
      { source: '/:path*', headers: securityHeaders },
      // neverejné časti nikdy do vyhľadávačov (namiesto vypisovania v robots.txt)
      ...['/admin/:path*', '/admin', '/ucet/:path*', '/ucet', '/api/:path*', '/rezervacia/:path+', '/prihlasenie/:path*', '/registracia', '/obnova-hesla', '/zabudnute-heslo', '/overenie-emailu', '/platba/:path*'].map((source) => ({ source, headers: noindex })),
    ];
  },
};

export default nextConfig;
