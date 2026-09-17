"use client";

import type { CSSProperties } from "react";
import OptimizedPhoto from "@/components/media/OptimizedPhoto";
import type { VisualImage } from "./types";

type ImageCardProps = {
  image: VisualImage;
  onOpen: (src: string) => void;
};

export default function ImageCard({ image, onOpen }: ImageCardProps) {
  const isLarge = image.shape === "large";
  const isSmall = image.shape === "small";
  const isWide = image.shape === "wide";

  const objectPosition =
    image.cropPosition ?? (image.crop === "top" ? "50% 0%" : "50% 50%");
  const hasTransform =
    image.imageZoom !== undefined ||
    image.imageShiftX !== undefined ||
    image.imageShiftY !== undefined;
  const imageStyle: CSSProperties = {
    objectPosition,
    transform: hasTransform
      ? `translate(${image.imageShiftX ?? "0%"}, ${
          image.imageShiftY ?? "0%"
        }) scale(${image.imageZoom ?? 1})`
      : undefined,
    transformOrigin: objectPosition,
  };
  const coverImageClass =
    "absolute inset-0 block h-full w-full object-cover transition duration-700";
  // Match the heading-aligned media width and four-column mosaic (16px gaps).
  const imageSizes = isWide
    ? "auto, (min-width: 1376px) 1280px, (min-width: 768px) calc(100vw - 96px), calc(100vw - 48px)"
    : isSmall
      ? "auto, (min-width: 1376px) 308px, (min-width: 768px) calc(25vw - 36px), calc(100vw - 48px)"
      : "auto, (min-width: 1376px) 632px, (min-width: 768px) calc(50vw - 56px), calc(100vw - 48px)";

  if (isSmall) {
    return (
      <button
        type="button"
        onClick={() => onOpen(image.src)}
        className="group flex flex-col overflow-hidden bg-[#b8ad9a] text-left transition duration-500 hover:-translate-y-1"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <OptimizedPhoto
            photo={image}
            alt={image.title}
            fill
            loading="lazy"
            sizes={imageSizes}
            style={imageStyle}
            className={coverImageClass}
          />

          <div className="absolute inset-0 bg-black/12 transition duration-500 group-hover:bg-black/0" />
        </div>

        <div className="flex min-h-[210px] flex-col justify-between p-6">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-black/45">
              {image.title}
            </p>
            <h3 className="font-serif text-2xl leading-tight text-[#1f1a17]">
              {image.subtitle}
            </h3>
          </div>

          <div>
            {image.note && (
              <p className="mt-6 text-sm leading-6 text-black/55">
                {image.note}
              </p>
            )}
            <p className="mt-8 text-xs uppercase tracking-[0.25em] text-black/40 transition group-hover:text-black">
              Open image
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(image.src)}
      className={`group relative flex flex-col overflow-hidden bg-[#b8ad9a] text-left transition duration-500 hover:-translate-y-1 ${
        isWide ? "md:col-span-4" : isLarge ? "md:col-span-2" : ""
      }`}
    >
      <div
        className={`relative w-full flex-1 overflow-hidden ${
          isWide ? "aspect-[16/9]" : "aspect-[4/3]"
        }`}
      >
        <OptimizedPhoto
          photo={image}
          alt={image.title}
          fill
          loading="lazy"
          sizes={imageSizes}
          style={imageStyle}
          className={`${coverImageClass} ${
            hasTransform ? "" : "group-hover:scale-105"
          }`}
        />

        <div className="absolute inset-0 bg-black/30 transition duration-500 group-hover:bg-black/18" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-white/70">
            {image.title}
          </p>

          <h3 className="font-serif text-2xl md:text-3xl">
            {image.subtitle}
          </h3>

          {image.note && (
            <p className="mt-6 max-w-xl text-sm leading-6 text-white/70">
              {image.note}
            </p>
          )}

          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-white/60 transition group-hover:text-white">
            Open image
          </p>
        </div>
      </div>
    </button>
  );
}
