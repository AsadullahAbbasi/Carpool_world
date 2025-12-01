/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude src directory from webpack compilation (old Vite files)
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
  // Exclude src directory from page compilation
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA(nextConfig);
