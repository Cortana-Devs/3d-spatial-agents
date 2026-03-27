import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['127.0.2.2', '*.127.0.2.2'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
