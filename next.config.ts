import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const internalHost = process.env.TAURI_DEV_HOST || "localhost";

const nextConfig: NextConfig = {
  // Required for static site generation (SSG) in Tauri
  output: "export",
  // Note: This feature is required to use the Next.js Image component in SSG mode.
  // See https://nextjs.org/docs/messages/export-image-api for different workarounds.
  images: {
    unoptimized: true,
  },
  // Configure assetPrefix or else the server won't properly resolve your assets.
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  typescript: {
    // Skip type checking during `next build`
    ignoreBuildErrors: true,
  },
  experimental: {
    cssChunking: "strict",
    optimizeCss: true,
    inlineCss: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-dialog",
      "motion/react",
      "dotted-map",
      "three",
      "@react-three/fiber",
    ],
  },
};

export default nextConfig;
