/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    optimizeCss: true,
  },
  optimizeFonts: true,
};

export default nextConfig;
