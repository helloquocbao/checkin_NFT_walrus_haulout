/** @format */

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["leaflet"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "aggregator.walrus-testnet.walrus.space",
        pathname: "/v1/blobs/**",
      },
      {
        protocol: "https",
        hostname: "walrus.tusky.io",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    // dùng App Router
  },
};

export default withNextIntl(nextConfig);
