import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // La extracción con IA envía PDFs en base64 dentro de una Server Action.
      // Vercel limita el cuerpo de la función a 4,5 MB; 5 MB cubre el archivo
      // de 3 MB más el sobrecosto de base64 y del formulario.
      bodySizeLimit: '5mb',
    },
  },
  typescript: {
    // Fail builds when there are type errors so we catch issues early.
    ignoreBuildErrors: false,
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
