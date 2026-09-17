"use client";

/* eslint-disable @next/next/no-img-element -- Legacy pages still provide string-only posters. */

import { useCallback, useEffect, useRef, useState } from "react";
import OptimizedPhoto from "@/components/media/OptimizedPhoto";
import { videoPreview } from "@/components/media/videoPreview";
import VideoCaption from "./VideoCaption";
import styles from "./FieldVideo.module.css";
import type { VisualVideo } from "./types";

const DEFAULT_VIDEO_VOLUME = 0.3;

export default function FieldVideo({ item }: { item: VisualVideo }) {
  return <FieldVideoCard key={item.src} item={videoPreview(item)} />;
}

function FieldVideoCard({ item }: { item: VisualVideo }) {
  const [isActivated, setIsActivated] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasPlayed = useRef(false);
  const userChangedVolume = useRef(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const applyDefaultVolume = useCallback((video: HTMLVideoElement) => {
    if (hasPlayed.current || userChangedVolume.current || video.dataset.volumeControl === "system") return;
    try {
      video.volume = DEFAULT_VIDEO_VOLUME;
    } catch {
      // Some iOS browsers leave volume controlled by the system.
    } finally {
      const supported = Math.abs(video.volume - DEFAULT_VIDEO_VOLUME) < 0.001;
      video.dataset.volumeControl = supported ? "supported" : "system";
      if (!supported) video.muted = true; // No surprise full-volume audio.
      video.dataset.effectiveVolume = String(video.volume);
    }
  }, []);

  const activateVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;

      if (!video) return;

      applyDefaultVolume(video);
      void video.play().catch(() => {
        // Native controls remain available if browser autoplay policy blocks play.
      });
    },
    [applyDefaultVolume],
  );

  useEffect(() => {
    if (!isActivated || !slotRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) videoRef.current?.pause();
    });
    observer.observe(slotRef.current);
    return () => observer.disconnect();
  }, [isActivated, slotRef]);

  return (
    <div ref={slotRef} className={styles.slot}>
    <article data-video-id={item.id} className={`${styles.card} bg-[#1f1a17] text-[#f4f0e8]`}>
      <div className={`${styles.frame} relative w-full overflow-hidden bg-black`}>
        {isActivated ? (
          <video
            ref={activateVideo}
            src={item.src}
            poster={item.poster}
            controls
            playsInline
            preload="none"
            aria-label={item.title}
            className="absolute inset-0 h-full w-full object-contain"
            onLoadedMetadata={(event) => {
              applyDefaultVolume(event.currentTarget);
            }}
            onPlay={(event) => {
              applyDefaultVolume(event.currentTarget);
              hasPlayed.current = true;
            }}
            onVolumeChange={(event) => {
              if (hasPlayed.current || Math.abs(event.currentTarget.volume - DEFAULT_VIDEO_VOLUME) > 0.001) userChangedVolume.current = true;
            }}
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
                loading="lazy"
                sizes="auto, (min-width: 1376px) 1280px, (min-width: 768px) calc(100vw - 96px), calc(100vw - 48px)"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : item.poster ? (
              <img
                src={item.poster}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : null}

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

      <VideoCaption item={item} />
    </article>
    </div>
  );
}
