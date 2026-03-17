/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Disable static optimization - all pages will be server-side rendered
  output: 'standalone',
  trailingSlash: false,
  env: { GROK_API_KEY: process.env.GROK_API_KEY ?? 'build-dummy' },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.runtimeChunk = false;
      // Prevent Node.js modules from being bundled in client code.
      // persistence.ts uses 'fs' and 'path' but is only called server-side.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;