"use client";

/* eslint-disable @next/next/no-img-element -- Legacy pages still provide string-only posters. */

import { useState } from "react";
import OptimizedPhoto from "@/components/media/OptimizedPhoto";
import type { VisualVideo } from "./types";

export default function FieldVideo({ item }: { item: VisualVideo }) {
  return <FieldVideoCard key={item.src} item={item} />;
}

function FieldVideoCard({ item }: { item: VisualVideo }) {
  const [isActivated, setIsActivated] = useState(false);

  return (
    <article
      className={`overflow-hidden bg-[#1f1a17] text-[#f4f0e8] ${
        item.shape === "video-wide" ? "md:col-span-4" : "md:col-span-2"
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {isActivated ? (
          <video
            src={item.src}
            poster={item.poster}
            controls
            autoPlay
            playsInline
            preload="none"
            aria-label={item.title}
            className="h-full w-full object-cover"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="absolute inset-0 bg-[#171310]">
            {item.poster && item.posterMetadata ? (
              <OptimizedPhoto
                photo={item.posterMetadata}
                alt=""
                fill
                sizes={
                  item.shape === "video-wide"
                    ? "(min-width: 1280px) 1280px, calc(100vw - 48px)"
                    : "(min-width: 1280px) 632px, (min-width: 768px) calc(50vw - 26px), calc(100vw - 48px)"
                }
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : item.poster ? (
              <img
                src={item.poster}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            <div className="absolute inset-0 bg-black/25" />

            {!item.poster && (
              <p className="absolute inset-x-6 bottom-6 font-serif text-2xl text-white/70">
                {item.title}
              </p>
            )}

            <button
              type="button"
              onClick={() => setIsActivated(true)}
              aria-label={`Play video: ${item.title}`}
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/35 text-white transition hover:scale-105 hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span
                aria-hidden="true"
                className="ml-1 block h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-white"
              />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-8 p-7 md:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/35">
            Field Video
          </p>
          <h3 className="font-serif text-3xl leading-tight text-white">
            {item.title}
          </h3>
        </div>

        <div>
          {item.subtitle && (
            <p className="text-lg leading-8 text-white/65">{item.subtitle}</p>
          )}
          {item.note && (
            <p className="mt-5 text-sm leading-7 text-white/45">
              {item.note}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
