import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    qualities: [80, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2560, 3200],
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/media/**", search: "" },
    ],
  },
};

export default nextConfig;
