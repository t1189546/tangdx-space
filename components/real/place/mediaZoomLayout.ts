export type MediaZoomBaseline = {
  pixelRatio: number;
  scrollbar: number;
  rootFontSize?: number;
};

/** Keep CSS media geometry stable during page zoom, not its on-screen size. */
export function mediaZoomLayout(
  viewportWidth: number,
  pixelRatio: number,
  baseline: MediaZoomBaseline,
) {
  const width = viewportWidth * pixelRatio / baseline.pixelRatio;
  const availableWidth = Math.max(0, width - baseline.scrollbar);
  const rem = baseline.rootFontSize ?? 16;
  // Match the unchanged SiteHeader and section-index card container.
  const gutter = width >= 768
    ? Math.max(3 * rem, (availableWidth - 80 * rem) / 2)
    : 1.5 * rem;
  return { width: availableWidth, gutter };
}
