import type { OptimizedPhotoSource } from "./OptimizedPhoto";

type GeneratedPhoto = Required<
  Pick<OptimizedPhotoSource, "src" | "width" | "height" | "aspectRatio" | "blurDataURL">
> &
  Pick<OptimizedPhotoSource, "originalSrc" | "originalWidth" | "originalHeight">;

type GeneratedManifest = {
  images: Record<string, GeneratedPhoto>;
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
    getBySrc(src: string) {
      return bySrc.get(src);
    },
    src(fileName: string) {
      return images[fileName]?.src ??
        (fallbackBase ? `${fallbackBase}/${fileName}` : get(fileName).src);
    },
  };
}
