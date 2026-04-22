/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],

  webpack(config, { isServer }) {
    if (isServer) {
      // @digitalpersona packages use WebSocket/window at module init — exclude from server bundle
      config.resolve.alias['@digitalpersona/devices'] = false;
      config.resolve.alias['@digitalpersona/websdk'] = false;
    }
    return config;
  },
};

export default nextConfig;
