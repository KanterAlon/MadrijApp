/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // Enable Node.js runtime support for middleware
    nodeMiddleware: true,
  },
};

module.exports = nextConfig;
