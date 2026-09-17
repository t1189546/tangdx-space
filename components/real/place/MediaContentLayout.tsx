"use client";

import type { ReactNode } from "react";
import type { VisualVideo } from "./types";
import VideoCaption from "./VideoCaption";
import { useVideoCaptionHeight } from "./useVideoCaptionHeight";
import { useMediaZoomLayout } from "./useMediaZoomLayout";
import styles from "./FieldVideo.module.css";

/** One media width per page, including captions of videos still behind View more. */
export default function MediaContentLayout({ videos, children }: { videos: VisualVideo[]; children: ReactNode }) {
  const { groupRef, railRef, captionsRef } = useVideoCaptionHeight(videos);
  useMediaZoomLayout(groupRef);
  return (
    <div ref={groupRef} className={styles.group} data-media-layout>
      <div className={`${styles.rail} ${styles.content}`} aria-hidden="true">
        <div ref={railRef} />
      </div>
      <div ref={captionsRef} className={styles.measurements} aria-hidden="true" inert>
        {videos.map((item) => <VideoCaption key={item.src} item={item} measure />)}
      </div>
      {children}
    </div>
  );
}
