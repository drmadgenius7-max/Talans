import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  serverExternalPackages: ["bcryptjs"],
};

export default nextConfig;
