"use client";

import { useState } from "react";
import type {
  VisualImage,
  VisualSection as VisualSectionData,
} from "./types";
import FieldVideo from "./FieldVideo";
import ImageCard from "./ImageCard";

type VisualSectionProps = {
  section: VisualSectionData;
  onOpenImage: (src: string) => void;
};

const IMAGE_PREVIEW_LIMIT = 3;
const VIDEO_PREVIEW_LIMIT = 1;

type ImageShape = VisualImage["shape"];

function chunkImages(images: VisualImage[], preserveImageShapes = false) {
  const chunks: VisualImage[][] = [];

  if (preserveImageShapes) {
    let currentChunk: VisualImage[] = [];

    for (const image of images) {
      if (image.shape === "wide") {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
        }

        chunks.push([image]);
        continue;
      }

      currentChunk.push(image);

      if (currentChunk.length === 3) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  for (let i = 0; i < images.length; i += 3) {
    chunks.push(images.slice(i, i + 3));
  }

  return chunks;
}

function getMosaicPattern(rowIndex: number): ImageShape[] {
  return rowIndex % 2 === 0
    ? ["large", "small", "small"]
    : ["small", "small", "large"];
}

function getDisplayImage(
  image: VisualImage,
  index: number,
  pattern: ImageShape[],
  preserveImageShapes = false,
): VisualImage {
  if (preserveImageShapes) {
    return image;
  }

  return {
    ...image,
    shape: pattern[index] ?? image.shape,
  };
}

export default function VisualSectionComponent({
  section,
  onOpenImage,
}: VisualSectionProps) {
  const [showAllImages, setShowAllImages] = useState(false);
  const [showAllVideos, setShowAllVideos] = useState(false);

  const sectionId = section.id;

  const images = section.items.filter(
    (item): item is VisualImage => item.kind === "image",
  );
  const videos = section.items.filter((item) => item.kind === "video");

  const imagePreviewLimit = section.imagePreviewLimit ?? IMAGE_PREVIEW_LIMIT;
  const videoPreviewLimit = section.videoPreviewLimit ?? VIDEO_PREVIEW_LIMIT;

  const visibleImages = showAllImages
    ? images
    : images.slice(0, imagePreviewLimit);
  const visibleVideos = showAllVideos
    ? videos
    : videos.slice(0, videoPreviewLimit);

  const hasHiddenImages = images.length > imagePreviewLimit;
  const hasHiddenVideos = videos.length > videoPreviewLimit;

  const visibleImageRows = chunkImages(
    visibleImages,
    section.preserveImageShapes,
  );

  return (
    <section
      id={sectionId}
      className="border-t border-black/10 px-6 py-28 md:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <p className="mb-5 text-xs uppercase tracking-[0.35em] text-black/45">
          {section.number} / {section.title}
        </p>

        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:items-start">
          <h2 className="font-serif text-4xl leading-tight md:text-6xl">
            {section.title}
          </h2>

          <p className="max-w-2xl text-lg leading-9 text-black/60">
            {section.description}
          </p>
        </div>

        {visibleImageRows.length > 0 && (
          <div className="mt-16 space-y-4">
            {visibleImageRows.map((row, rowIndex) => {
              const pattern = getMosaicPattern(rowIndex);

              return (
                <div
                  key={`${sectionId}-image-row-${rowIndex}`}
                  className="grid gap-4 md:grid-cols-4"
                >
                  {row.map((item, index) => (
                    <ImageCard
                      key={item.src}
                      image={getDisplayImage(
                        item,
                        index,
                        pattern,
                        section.preserveImageShapes,
                      )}
                      onOpen={onOpenImage}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {hasHiddenImages && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllImages((current) => !current)}
              className="border border-black/15 px-8 py-4 text-xs uppercase tracking-[0.25em] text-black/50 transition hover:bg-black hover:text-white"
            >
              {showAllImages ? "Hide images" : "View more images"}
            </button>
          </div>
        )}

        {visibleVideos.length > 0 && (
          <div className="mt-16 grid gap-4 md:grid-cols-4">
            {visibleVideos.map((item) => (
              <FieldVideo key={item.src} item={item} />
            ))}
          </div>
        )}

        {hasHiddenVideos && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAllVideos((current) => !current)}
              className="border border-black/15 px-8 py-4 text-xs uppercase tracking-[0.25em] text-black/50 transition hover:bg-black hover:text-white"
            >
              {showAllVideos ? "Hide videos" : "View more videos"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
