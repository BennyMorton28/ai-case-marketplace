/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Create a standalone build that doesn't require the full Node.js runtime
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  // Handle environment variables for API keys in a production environment
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    AWS_S3_REGION: process.env.AWS_S3_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  },
  images: {
    dangerouslyAllowSVG: true, // Enable SVG support
    contentDispositionType: 'attachment', // Recommended security setting when allowing SVGs
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Strict CSP for SVGs
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.AWS_S3_BUCKET_NAME + '.s3.' + process.env.AWS_S3_REGION + '.amazonaws.com'
      }
    ],
  },
  // Add headers for better caching and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  // Increase the timeout for serverless functions if needed
  serverRuntimeConfig: {
    // Will only be available on the server side
    timeoutSeconds: 60,
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize static file generation
  generateBuildId: async () => {
    return process.env.NEXT_PUBLIC_BUILD_TIME || 'development'
  },
  // Ensure CSS is properly handled
  webpack: (config, { dev, isServer }) => {
    // Optimize CSS handling
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss)$/,
        chunks: 'all',
        enforce: true,
      };
    }
    return config;
  }
};

module.exports = nextConfig;
