/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],

  turbopack: {
    resolveAlias: {
      // Use real package in browser; fall back to empty stub on server (avoids WebSocket crash)
      '@digitalpersona/devices': {
        browser: '@digitalpersona/devices',
        default: './src/app/utils/dp-stub.js',
      },
      '@digitalpersona/websdk': {
        browser: '@digitalpersona/websdk',
        default: './src/app/utils/dp-stub.js',
      },
    },
  },
};

export default nextConfig;
