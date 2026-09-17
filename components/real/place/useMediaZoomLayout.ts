"use client";

import { useLayoutEffect, type RefObject } from "react";
import { mediaZoomLayout } from "./mediaZoomLayout";

/** The opening zoom level is the reference; do not guess OS display scaling. */
export function useMediaZoomLayout(groupRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    // Touch browsers already magnify the visual viewport without reflowing it.
    // Leave phone/tablet layouts and native pinch gestures entirely alone.
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)");
    let baseline = {
      pixelRatio: window.devicePixelRatio || 1,
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
    };
    let frame = 0;
    let resolution: MediaQueryList;
    const clear = () => {
      group.style.removeProperty("--media-layout-width");
      group.style.removeProperty("--media-gutter");
    };
    const measure = () => {
      frame = 0;
      if (!desktop.matches) { clear(); return; }
      const layout = mediaZoomLayout(window.innerWidth, window.devicePixelRatio || 1, {
        ...baseline,
        rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
      });
      group.style.setProperty("--media-layout-width", `${layout.width}px`);
      group.style.setProperty("--media-gutter", `${layout.gutter}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const watchResolution = () => {
      resolution?.removeEventListener("change", watchResolution);
      resolution = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      resolution.addEventListener("change", watchResolution);
      schedule();
    };
    const changeInput = () => {
      baseline = {
        pixelRatio: window.devicePixelRatio || 1,
        scrollbar: window.innerWidth - document.documentElement.clientWidth,
      };
      schedule();
    };
    window.addEventListener("resize", schedule);
    desktop.addEventListener("change", changeInput);
    measure();
    watchResolution();
    return () => {
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", changeInput);
      resolution.removeEventListener("change", watchResolution);
      cancelAnimationFrame(frame);
      clear();
    };
  }, [groupRef]);
}
