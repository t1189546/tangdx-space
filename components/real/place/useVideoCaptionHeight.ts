"use client";

import { useLayoutEffect, useRef } from "react";
import type { VisualVideo } from "./types";

/** CSS owns media width. Measurement can only reserve common caption height. */
export function useVideoCaptionHeight(videos: VisualVideo[]) {
  const groupRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const captionsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const group = groupRef.current, rail = railRef.current, captions = captionsRef.current;
    if (!group || !rail || !captions || !videos.length) return;
    const header = document.querySelector("header");
    let frame = 0, disposed = false;
    const measure = () => {
      frame = 0;
      const width = rail.getBoundingClientRect().width;
      if (width <= 0) return;
      // This is the hidden text bank, never the visible gallery or video width.
      if (captions.style.width !== `${width}px`) captions.style.width = `${width}px`;
      const height = Math.ceil(Math.max(...Array.from(captions.children, el => el.getBoundingClientRect().height)));
      if (group.style.getPropertyValue("--video-caption-height") !== `${height}px`) {
        group.style.setProperty("--video-caption-height", `${height}px`);
      }
      // Header measurement affects anchor clearance only, not width or height.
      group.style.setProperty("--video-scroll-margin", `${(header?.getBoundingClientRect().height ?? 80) + 16}px`);
    };
    const schedule = () => { if (!frame && !disposed) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    // Visible card height is deliberately not observed: no measurement feedback loop.
    [rail, captions, ...(header ? [header] : [])].forEach(el => observer.observe(el));
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(schedule);
    measure();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, [videos]);

  return { groupRef, railRef, captionsRef };
}
