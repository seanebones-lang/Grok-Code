import type { NextConfig } from "next";

// Bundle analyzer (only when ANALYZE env var is set)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// Validate environment on startup (in production builds only)
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  try {
    require('./src/app/startup')
  } catch (error) {
    // Environment validation failed - config will still be created but error is logged
    console.error('Environment validation error during config:', error)
  }
}

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // ESLint - enabled for production quality
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src', 'app'],
  },
  
  // TypeScript - enabled for production quality
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimize production builds
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Optimize images for Lighthouse
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // Cache static assets
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Redirects for common paths
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Experimental features
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-slot',
      '@radix-ui/react-tooltip',
      '@tanstack/react-query',
      'react-markdown',
    ],
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimize CSS
    optimizeCss: true,
  },
  
  // Webpack optimizations
  webpack: (config, { isServer, webpack }) => {
    // Optimize bundle size
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk - large dependencies
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Framer Motion chunk (can be large)
            framerMotion: {
              name: 'framer-motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // React Markdown chunk
            reactMarkdown: {
              name: 'react-markdown',
              test: /[\\/]node_modules[\\/](react-markdown|remark-gfm)[\\/]/,
              chunks: 'all',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Monaco Editor chunk (already lazy loaded, but ensure it's separate)
            monaco: {
              name: 'monaco-editor',
              test: /[\\/]node_modules[\\/]@monaco-editor[\\/]/,
              chunks: 'async',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Common chunk - shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
      
      // Tree-shake unused exports
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }
    return config
  },
  
  // Output configuration for deployment
  // Note: Vercel doesn't need 'standalone' output, it handles Next.js automatically
  // output: 'standalone', // Commented for Vercel deployment
  
  // Powered by header (disable for security)
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
  
  // Production source maps (enable for better debugging, but increases bundle size)
  // Note: Lighthouse flags missing source maps, but they increase bundle size
  // Set to true if you need production debugging, false for smaller bundles
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === 'true',
};

// Export with bundle analyzer wrapper
export default withBundleAnalyzer(nextConfig);
