import Image from "next/image";
import type { ImageProps } from "next/image";

export type OptimizedPhotoSource = {
  src: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  blurDataURL?: string;
  originalSrc?: string;
  originalWidth?: number;
  originalHeight?: number;
};

type OptimizedPhotoProps = Omit<
  ImageProps,
  "src" | "width" | "height" | "blurDataURL" | "placeholder"
> & {
  photo: OptimizedPhotoSource;
};

/** Shared defaults for photographic content. Layout-specific wrappers provide sizes. */
export default function OptimizedPhoto({
  photo,
  alt,
  quality = 80,
  ...props
}: OptimizedPhotoProps) {
  const placeholderProps = photo.blurDataURL
    ? { placeholder: "blur" as const, blurDataURL: photo.blurDataURL }
    : { placeholder: "empty" as const };

  return (
    <Image
      {...props}
      {...placeholderProps}
      src={photo.src}
      alt={alt}
      quality={quality}
    />
  );
}
