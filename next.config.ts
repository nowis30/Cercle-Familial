import type { NextConfig } from "next";

const disableImageOptimizerInDev =
  process.env.NODE_ENV === "development" && process.env.NEXT_DISABLE_IMAGE_OPTIMIZER_DEV === "1";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    // DEV-only escape hatch when a Node deprecation is emitted by Next image optimizer internals.
    unoptimized: disableImageOptimizerInDev,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
