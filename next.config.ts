import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

const localPreview = !process.env.VERCEL && /^\d+$/.test(process.env.MEDIA_PREVIEW_PORT ?? "");
const previewRecords: Record<string, Record<string, unknown>> = localPreview
  ? JSON.parse(readFileSync("media-output/poster-preview.json", "utf8")) : {};
const previewData = Object.fromEntries(Object.entries(previewRecords).map(([src, record]) => {
  return [src, { poster: record.poster, width: record.width, height: record.height, posterMetadata: record.posterMetadata }];
}));

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VIDEO_POSTER_PREVIEW: JSON.stringify(previewData),
  },
  async rewrites() {
    return localPreview ? [{ source: "/local-media-preview/:asset", destination: `http://127.0.0.1:${process.env.MEDIA_PREVIEW_PORT}/:asset` }] : [];
  },
  images: {
    formats: ["image/webp"],
    qualities: [80, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2560, 3200],
    localPatterns: [
      { pathname: "/images/**", search: "" },
      { pathname: "/media/**", search: "" },
      ...(localPreview ? [{ pathname: "/local-media-preview/**", search: "" }] : []),
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.tangdx.space",
        port: "",
        pathname: "/images/web/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "media.tangdx.space",
        port: "",
        pathname: "/images/video-posters/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
