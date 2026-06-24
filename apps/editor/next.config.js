/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@cms-ai/types'],
  output: 'standalone',
};

module.exports = nextConfig;
