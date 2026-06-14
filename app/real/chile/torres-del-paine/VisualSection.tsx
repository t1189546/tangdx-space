"use client";

import { useState } from "react";
import type {
  VisualItem,
  VisualSection as VisualSectionData,
} from "./data";
import FieldVideo from "./FieldVideo";
import ImageCard from "./ImageCard";

type VisualSectionProps = {
  section: VisualSectionData;
  onOpenImage: (src: string) => void;
};

const IMAGE_PREVIEW_LIMIT = 6;
const VIDEO_PREVIEW_LIMIT = 1;

export default function VisualSectionComponent({
  section,
  onOpenImage,
}: VisualSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const sectionId = section.title
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/\s+/g, "-");

  const totalImages = section.items.filter((item) => item.kind === "image").length;
  const totalVideos = section.items.filter((item) => item.kind === "video").length;

  const visibleItems = showAll
    ? section.items
    : section.items.filter((item) => {
        let visibleImageCount = 0;
        let visibleVideoCount = 0;

        for (const currentItem of section.items) {
          if (currentItem === item) {
            if (currentItem.kind === "image") {
              return visibleImageCount < IMAGE_PREVIEW_LIMIT;
            }

            return visibleVideoCount < VIDEO_PREVIEW_LIMIT;
          }

          if (currentItem.kind === "image") {
            visibleImageCount += 1;
          }

          if (currentItem.kind === "video") {
            visibleVideoCount += 1;
          }
        }

        return false;
      });

  const hiddenImages = Math.max(totalImages - IMAGE_PREVIEW_LIMIT, 0);
  const hiddenVideos = Math.max(totalVideos - VIDEO_PREVIEW_LIMIT, 0);
  const hasHiddenItems = hiddenImages > 0 || hiddenVideos > 0;

  function getHiddenText() {
    const parts = [];

    if (hiddenImages > 0) {
      parts.push(`${hiddenImages} more image${hiddenImages > 1 ? "s" : ""}`);
    }

    if (hiddenVideos > 0) {
      parts.push(`${hiddenVideos} more video${hiddenVideos > 1 ? "s" : ""}`);
    }

    return parts.join(" / ");
  }

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

          <div>
            <p className="max-w-2xl text-lg leading-9 text-black/60">
              {section.description}
            </p>

            
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-4">
          {visibleItems.map((item: VisualItem) => {
            if (item.kind === "video") {
              return <FieldVideo key={item.src} item={item} />;
            }

            return (
              <ImageCard
                key={item.src}
                image={item}
                onOpen={onOpenImage}
              />
            );
          })}
        </div>

        {hasHiddenItems && (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="border border-black/15 px-8 py-4 text-xs uppercase tracking-[0.25em] text-black/50 transition hover:bg-black hover:text-white"
            >
              {showAll ? "Collapse section" : `View more / ${getHiddenText()}`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}