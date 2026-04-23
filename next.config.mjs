import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const webSdkShim = path.resolve(__dirname, "src/lib/websdk-shim.js");
// Turbopack (Next 16 default) only supports project-relative aliasing, not
// absolute Windows paths — see "windows imports are not implemented yet".
const webSdkShimTurbopack = "./src/lib/websdk-shim.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client'],
  // Next 16+ uses Turbopack by default for `next dev` / `next build`; webpack
  // aliases do not apply unless you pass `--webpack`.
  turbopack: {
    resolveAlias: {
      // @digitalpersona/devices does `require('WebSdk')`; real script is /public/websdk.client.js
      WebSdk: webSdkShimTurbopack,
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      WebSdk: webSdkShim,
    };
    return config;
  },
};

export default nextConfig;
