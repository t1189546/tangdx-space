import type { OptimizedPhotoSource } from "./OptimizedPhoto";

type GeneratedPhoto = Required<
  Pick<OptimizedPhotoSource, "src" | "width" | "height" | "aspectRatio" | "blurDataURL">
> &
  Pick<OptimizedPhotoSource, "originalSrc" | "originalWidth" | "originalHeight">;

type GeneratedManifest = {
  images: Record<string, GeneratedPhoto>;
  videos?: Record<string, {
    src: string;
    poster?: string;
    posterKey?: string;
    width?: number;
    height?: number;
    aspectRatio?: number;
  }>;
};

/** Joins generated technical metadata to separately maintained editorial data. */
export function createMediaResolver(
  manifest: GeneratedManifest,
  fallbackBase?: string,
) {
  const images = manifest.images;
  const bySrc = new Map(
    Object.values(images).map((photo) => [photo.src, photo] as const),
  );

  function get(fileName: string): OptimizedPhotoSource {
    const photo = images[fileName];

    if (!photo) {
      throw new Error(`Missing generated media metadata for ${fileName}`);
    }

    return photo;
  }

  return {
    get,
    video(fileName: string) {
      const video = manifest.videos?.[fileName];
      if (!video) return {};
      const poster = video.posterKey ? images[video.posterKey] : undefined;
      return {
        src: video.src,
        ...(video.poster ? { poster: video.poster } : {}),
        ...(poster ? { posterMetadata: poster } : {}),
        ...(video.width && video.height ? { width: video.width, height: video.height, aspectRatio: video.width / video.height } : {}),
      };
    },
    getBySrc(src: string) {
      return bySrc.get(src);
    },
    src(fileName: string) {
      return images[fileName]?.src ??
        (fallbackBase ? `${fallbackBase}/${fileName}` : get(fileName).src);
    },
  };
}
