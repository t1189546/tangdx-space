"use client";

import { useEffect, useRef } from "react";
import type { VisualVideo } from "./data";

export default function FieldVideo({ item }: { item: VisualVideo }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.volume = 0.18;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Some browsers may block autoplay. The controls still work.
          });
        } else {
          video.pause();
        }
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <article
      className={`overflow-hidden bg-[#1f1a17] text-[#f4f0e8] ${
        item.shape === "video-wide" ? "md:col-span-4" : "md:col-span-2"
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={item.src}
          muted
          loop
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            event.currentTarget.volume = 0.18;
          }}
          onPlay={(event) => {
            event.currentTarget.volume = 0.18;
          }}
          className="h-full w-full object-cover"
        />
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
          <p className="text-lg leading-8 text-white/65">{item.subtitle}</p>
          <p className="mt-5 text-sm leading-7 text-white/45">{item.note}</p>
        </div>
      </div>
    </article>
  );
}