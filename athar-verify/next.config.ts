import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This app lives in a subdirectory of a repo that has its own lockfile at the
  // root; without this, Next infers the wrong workspace root and warns on boot.
  outputFileTracingRoot: __dirname,
  output: 'standalone',
  poweredByHeader: false,
  serverExternalPackages: ['bullmq', 'ioredis', '@prisma/client', 'bcryptjs'],
  experimental: {
    serverActions: {
      // Admin video uploads may be proxied through the server when
      // presigned direct-to-storage uploads are disabled.
      bodySizeLimit: '16mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
