import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Fail builds when there are type errors so we catch issues early.
    ignoreBuildErrors: false,
  },
  eslint: {
    // Run ESLint during builds; adjust .eslintrc if false positives appear.
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
