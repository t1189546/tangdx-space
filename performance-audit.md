# Tangdx Space Performance Audit

## Torres del Paine media refactor — 2026-08-17

- The page references 47 photographs and 4 Cloudflare R2 videos. The source folder also contained 2 currently unused photographs and 4 local video posters.
- Before the reusable pipeline, the 49 high-resolution JPG photographs in `public/` totaled 431.40 MiB; the largest was 15.68 MiB. Long edges ranged from roughly 3,000px to 6,528px.
- The generated set contains 49 photo WebP masters plus 4 WebP posters, totaling 49.34 MiB. No generated file exceeds 3 MiB or 3,200px on its long edge; the largest is 2.68 MiB.
- Original JPG bytes are preserved under `media-originals/real/chile/torres-del-paine/`. They are no longer in the public static directory.
- Production HTML contains one Hero image preload, 17 lazy image elements, no eager gallery images, no `<video>` elements, and no legacy Torres JPG references. The 18 initial image elements are the Hero, 15 collapsed-gallery previews, and 2 video posters.
- In a fresh 1280px browser session at scroll position 0, only the Hero had a `currentSrc`/resource request; all 17 lazy elements remained unfetched. The Hero selected a 1600px optimized response (640px at a 390px mobile viewport).
- Hidden gallery entries are sliced before rendering, so they have no image elements until expansion. Videos are mounted only after activation. The dynamically imported Lightbox mounts one responsive WebP image only after it opens.
- `npm run media:optimize` produces one 3,200px-or-smaller WebP master and blur metadata per source. A source hash and processing settings make subsequent runs incremental.

The historical source audit below records the pre-pipeline repository state.

Audit date: 2026-07-23

Scope: Next.js application source, `public/images`, and the shared Real Place components. File sizes are binary MiB (`bytes / 1024^2`). The media files themselves were not changed.

## Executive summary

- `public/images` contains 101 image files, all JPG, totaling 761.02 MB.
- 89 images exceed 1 MB; the same 89 also exceed 3 MB; 86 exceed 5 MB.
- The largest image is 15.68 MB. Most source images are roughly 4,000 px wide and 5-13 MB, so image transfer and decode work are the primary remaining page-speed risk.
- Two video files also sit under `public/images` (`real/belize/blz-002.mp4`, 132.69 MB, and `real/chile/santiago/VID_20260509_170152_DOLBY.mp4`, 204.60 MB). They are not counted as images below, are not referenced by application source, and were left untouched.
- Before optimization, Real Place Hero images were CSS backgrounds and gallery cards used raw `<img>` elements. Large/wide cards did not declare lazy loading.
- `VisualSection` already slices image and video arrays before mapping, so collapsed media is not mounted or downloaded until expanded.
- The whole `PlacePage` is a Client Component. A full server/client split would require a broader interaction-boundary refactor, so this audit keeps it unchanged.

## Largest 30 images

| # | Path under `public/images` | Size (MB) | Dimensions | Format |
|---:|---|---:|---:|---|
| 1 | `real/chile/torres-del-paine/tdp-029.jpg` | 15.68 | 4096 x 3528 | JPG |
| 2 | `real/belize/blz-012.jpg` | 15.59 | 4096 x 3528 | JPG |
| 3 | `real/canada/hamilton/IMG_20260505_172257.jpg` | 14.22 | 4096 x 3528 | JPG |
| 4 | `real/canada/hamilton/IMG_20260505_171734.jpg` | 13.39 | 4096 x 3528 | JPG |
| 5 | `real/chile/torres-del-paine/tdp-024.jpg` | 12.98 | 4896 x 6528 | JPG |
| 6 | `real/belize/blz-011.jpg` | 12.92 | 4096 x 3528 | JPG |
| 7 | `real/chile/torres-del-paine/tdp-045.jpg` | 12.81 | 4080 x 3528 | JPG |
| 8 | `real/belize/blz-025.jpg` | 12.46 | 4080 x 3528 | JPG |
| 9 | `real/chile/santiago/IMG_20260509_170229.jpg` | 12.42 | 4080 x 3528 | JPG |
| 10 | `real/belize/blz-020.jpg` | 12.07 | 3072 x 4536 | JPG |
| 11 | `real/chile/torres-del-paine/tdp-019.jpg` | 11.82 | 4096 x 3528 | JPG |
| 12 | `real/chile/torres-del-paine/tdp-011.jpg` | 11.44 | 4096 x 3528 | JPG |
| 13 | `real/chile/torres-del-paine/tdp-038.jpg` | 11.21 | 4080 x 3528 | JPG |
| 14 | `real/chile/torres-del-paine/tdp-007.jpg` | 11.17 | 4096 x 3528 | JPG |
| 15 | `real/chile/torres-del-paine/tdp-003.jpg` | 10.99 | 4096 x 3528 | JPG |
| 16 | `real/chile/torres-del-paine/tdp-028.jpg` | 10.98 | 3072 x 4552 | JPG |
| 17 | `real/chile/torres-del-paine/tdp-008.jpg` | 10.97 | 4096 x 3528 | JPG |
| 18 | `real/chile/torres-del-paine/tdp-010.jpg` | 10.92 | 4080 x 3528 | JPG |
| 19 | `real/belize/blz-013.jpg` | 10.83 | 4096 x 2985 | JPG |
| 20 | `real/chile/torres-del-paine/tdp-026.jpg` | 10.80 | 4080 x 3528 | JPG |
| 21 | `real/chile/torres-del-paine/tdp-012.jpg` | 10.47 | 4080 x 3528 | JPG |
| 22 | `real/chile/torres-del-paine/tdp-017.jpg` | 10.15 | 3072 x 3844 | JPG |
| 23 | `real/belize/blz-007.jpg` | 10.13 | 4091 x 3523 | JPG |
| 24 | `real/chile/torres-del-paine/tdp-020.jpg` | 9.96 | 3072 x 4552 | JPG |
| 25 | `real/belize/blz-023.jpg` | 9.88 | 4096 x 3528 | JPG |
| 26 | `real/chile/torres-del-paine/tdp-022.jpg` | 9.81 | 4096 x 3528 | JPG |
| 27 | `real/belize/blz-009.jpg` | 9.77 | 4096 x 3528 | JPG |
| 28 | `real/chile/santiago/IMG_20260509_152724.jpg` | 9.48 | 4096 x 3528 | JPG |
| 29 | `real/chile/torres-del-paine/tdp-000.jpg` | 9.38 | 4091 x 3523 | JPG |
| 30 | `real/canada/hamilton/IMG_20260530_124840.jpg` | 9.35 | 4080 x 3528 | JPG |

## Size thresholds

The sets are nested. All 89 images over 1 MB are also over 3 MB. Of those, 86 are over 5 MB.

### Over 5 MB (86)

- `real/chile/torres-del-paine`: `tdp-029.jpg` (15.68), `tdp-024.jpg` (12.98), `tdp-045.jpg` (12.81), `tdp-019.jpg` (11.82), `tdp-011.jpg` (11.44), `tdp-038.jpg` (11.21), `tdp-007.jpg` (11.17), `tdp-003.jpg` (10.99), `tdp-028.jpg` (10.98), `tdp-008.jpg` (10.97), `tdp-010.jpg` (10.92), `tdp-026.jpg` (10.80), `tdp-012.jpg` (10.47), `tdp-017.jpg` (10.15), `tdp-020.jpg` (9.96), `tdp-022.jpg` (9.81), `tdp-000.jpg` (9.38), `tdp-018.jpg` (9.35), `tdp-044.jpg` (9.20), `tdp-016.jpg` (9.13), `tdp-005.jpg` (9.04), `tdp-015.jpg` (8.86), `tdp-033.jpg` (8.82), `tdp-014.jpg` (8.81), `tdp-013.jpg` (8.78), `tdp-032.jpg` (8.75), `tdp-025.jpg` (8.67), `tdp-004.jpg` (8.57), `tdp-009.jpg` (8.31), `tdp-046.jpg` (8.20), `tdp-002.jpg` (7.88), `tdp-030.jpg` (7.87), `tdp-021.jpg` (7.80), `tdp-001.jpg` (7.77), `tdp-006.jpg` (7.70), `tdp-047.jpg` (7.32), `tdp-023.jpg` (7.30), `tdp-039.jpg` (7.12), `tdp-041.jpg` (6.89), `tdp-043.jpg` (6.45), `tdp-031.jpg` (6.27), `tdp-040.jpg` (6.22), `tdp-035.jpg` (6.15), `tdp-027.jpg` (6.15), `tdp-034.jpg` (5.52), `tdp-048.jpg` (5.42), `tdp-037.jpg` (5.40), `tdp-042.jpg` (5.21).
- `real/belize`: `blz-012.jpg` (15.59), `blz-011.jpg` (12.92), `blz-025.jpg` (12.46), `blz-020.jpg` (12.07), `blz-013.jpg` (10.83), `blz-007.jpg` (10.13), `blz-023.jpg` (9.88), `blz-009.jpg` (9.77), `blz-001.jpg` (9.08), `blz-015.jpg` (9.04), `blz-010.jpg` (8.39), `blz-026.jpg` (7.42), `blz-019.jpg` (7.39), `blz-021.jpg` (7.00), `blz-027.jpg` (6.90), `blz-018.jpg` (6.27), `blz-024.jpg` (5.56), `blz-014.jpg` (5.35), `blz-005.jpg` (5.26), `blz-017.jpg` (5.26), `blz-016.jpg` (5.26).
- `real/canada/hamilton`: `IMG_20260505_172257.jpg` (14.22), `IMG_20260505_171734.jpg` (13.39), `IMG_20260530_124840.jpg` (9.35), `IMG_20260530_125242.jpg` (7.22), `IMG_20260604_203844.jpg` (6.99), `IMG_20260505_204010.jpg` (5.51), `IMG_20260504_194240.jpg` (5.11).
- `real/chile/santiago`: `IMG_20260509_170229.jpg` (12.42), `IMG_20260509_152724.jpg` (9.48), `IMG_20260508_162219.jpg` (7.10), `IMG_20260509_172550.jpg` (6.86), `IMG_20260509_194424.jpg` (6.81), `IMG_20260509_201256.jpg` (6.70), `IMG_20260508_011659.jpg` (6.13), `IMG_20260510_071914.jpg` (5.93), `IMG_20260509_192910.jpg` (5.68), `IMG_20260508_175746.jpg` (5.44).

### Over 3 MB and at most 5 MB (3)

- `real/chile/torres-del-paine/tdp-036.jpg` - 4.94 MB, 3072 x 4552, JPG.
- `real/belize/blz-022.jpg` - 4.92 MB, 4096 x 3528, JPG.
- `real/canada/hamilton/IMG_20260603_045208.jpg` - 4.73 MB, 4096 x 3528, JPG.

### Over 1 MB and at most 3 MB

None. Therefore the complete over-1-MB and over-3-MB sets are the 89 files in the two lists above.

## Source search baseline

| Pattern | Findings before optimization |
|---|---|
| `<img>` | 4: `FieldVideo.tsx` poster, two `ImageCard.tsx` card branches, and `Lightbox.tsx` full-resolution viewer. |
| `next/image` | No matches. |
| `loading="eager"` | No matches. Large/wide raw gallery images still used the browser's eager default because they omitted `loading`. |
| `preload` | One video attribute: `preload="none"` in `FieldVideo.tsx`. No image preload existed. |
| `priority` | Only sitemap ranking fields in `app/sitemap.ts`; no image priority prop. |
| `"use client"` | All five shared Real Place components: `PlacePage`, `VisualSection`, `ImageCard`, `Lightbox`, and `FieldVideo`. |
| `backdrop-blur` | Shared fixed `SiteHeader` (`backdrop-blur-md`), the `/real` fixed header, and Lightbox-only blur layers. |
| `backdrop-filter` | No handwritten CSS declaration. Tailwind blur utilities compile to backdrop filtering. |
| `filter: blur` | Homepage `softFadeUp` animates from 4px blur to 0 for four hero text elements. |
| `background-attachment: fixed` / `bg-fixed` | No matches. |

No bundle analyzer dependency or analyzer script is installed, so none is introduced for this audit.

## Shared Real Place component findings

### `PlacePage.tsx`

- The whole page is currently a Client Component because it owns the selected Lightbox index and passes open callbacks into gallery sections.
- Before optimization, the Hero used a CSS `background-image`, so it had no responsive `srcset` and no explicit LCP preload.
- Before optimization, Lightbox was statically imported, so its interaction code entered the initial PlacePage client module graph even while closed.
- Splitting all static markup back into a Server Component would require a larger interaction-boundary redesign. It is intentionally deferred to avoid layout or behavior regressions.

### `VisualSection.tsx`

- Images and videos are filtered separately and rendered images-first.
- Collapsed images use `images.slice(0, imagePreviewLimit)` before `chunkImages()` and before `.map()`.
- Collapsed videos use `videos.slice(0, videoPreviewLimit)` before `.map()`.
- Therefore hidden media is not created in the DOM and cannot start an image/video request until expanded. Its URL strings still exist in serialized page data, which does not initiate a download.
- Lightbox order remains based on the full content order, independent of the visible subset.

### `ImageCard.tsx`

- Both shape branches use absolute, full-width/full-height, `object-cover` images inside `overflow-hidden` containers.
- `cropPosition`, `imageZoom`, and shifts are expressed through `object-position` and `transform`, so they can be preserved on the underlying `<img>` emitted by `next/image`.
- Small images explicitly requested lazy loading; large/wide images did not.

### `Lightbox.tsx`

- The full image intentionally uses a raw `<img>` with `object-contain`, zoom, drag, and transforms. This should remain unoptimized so Lightbox can show the original source and preserve its existing controls.
- Backdrop blur only exists while the modal is open, not during normal page scrolling.

### `FieldVideo.tsx`

- Before activation, the rendered branch contains no `<video>` element and therefore no video `src` or metadata request.
- After a user click, it mounts `<video src=... controls autoPlay preload="none" playsInline>`.
- The poster may load before video activation. It can safely use native lazy loading while retaining support for arbitrary local or external poster URLs.

## Direct answers

- **Are collapsed images rendered in the DOM before expansion?** No. The current implementation slices before mapping.
- **Can collapsed images be downloaded before expansion?** Not through image elements, because no corresponding DOM nodes exist. Merely serializing their URLs does not download them.
- **Are images outside the Hero forced eager/preload?** Before optimization there was no explicit eager/preload, but large/wide raw card images used the browser's eager default. After optimization, gallery images use `next/image` default lazy loading and only the Hero preloads.
- **Is the entire PlacePage a Client Component?** Yes. This remains the main JavaScript architecture limitation.
- **Does Lightbox code enter the initial JavaScript bundle?** Before optimization, yes, through a static import. The low-risk change below makes it a conditional dynamic import so it is requested only when opened.
- **Is there no video src before click?** Yes. The inactive branch has no `<video>` at all.
- **Are there clearly expensive fixed blur or animation effects?** No full-screen fixed background blur was found. The fixed header blur is limited to an approximately 80px-high strip. Lightbox blur runs only while open. The homepage has a short 4px entry blur on four text elements; it is not a persistent scrolling cost.

## Low-risk changes selected

1. Render the Hero with `next/image`, `fill`, `sizes="100vw"`, and the only image `preload` on the page.
2. Render gallery cards with `next/image`, `fill`, shape-specific `sizes`, and default lazy loading while preserving existing object position and transforms.
3. Keep the Lightbox full-resolution raw `<img>` unchanged.
4. Load Lightbox with `next/dynamic` only when `selectedIndex` is non-null.
5. Add native lazy loading to video posters without changing video activation behavior.
6. Remove the unused Geist Mono font registration; retain the variable Geist sans font through `next/font`.
7. Add a `prefers-reduced-motion` override for smooth scrolling, animations, and transitions.

## Deferred changes

- No source image is compressed, resized, converted, deleted, or overwritten. A later media pipeline could create non-destructive WebP/AVIF derivatives, but it requires visual review.
- The fixed Header blur is not reduced because its area is small and changing it would be visibly detectable.
- PlacePage is not broadly split into Server and Client subtrees during this low-risk pass.
- The two unreferenced video files inside `public/images` are reported but not moved or deleted.

## Verification

- `npm run build`: passed with Next.js 16.2.9. Compilation, TypeScript checking, and static generation all completed successfully.
- Generated Belize HTML: 1 image preload (Hero), 10 lazy images, 0 eager images, 0 `<video>` elements, and 0 `<video src>` elements.
- Generated Torres del Paine HTML: 1 image preload (Hero), 17 lazy images, 0 eager images, 0 `<video>` elements, and 0 `<video src>` elements.
- The built Lightbox chunk was identified separately and is not referenced by either page's initial static HTML.
- Final source contains two intentional raw `<img>` tags: the lazy video poster and the full-resolution Lightbox image.
- No image uses `loading="eager"` or the deprecated Next.js image `priority` prop. The only image `preload` is the Real Place Hero.
- No bundle analyzer is installed, so no analyzer dependency or report was added.
