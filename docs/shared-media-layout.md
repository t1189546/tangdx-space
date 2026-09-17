# Width-first shared media layout (2026-09-17)

Current alignment uses the unchanged SiteHeader brand and section-index card
outer edge as the reference. The lower headings/media no longer add the trial's
extra 25% gutter. SiteHeader and the index cards themselves were not edited.
Mobile matches their 24px gutter; desktop matches their centered 80rem container.
Zoom behavior is unchanged; delivery sizes and regression expectations match.

The preceding spacing follows the user's section-heading alignment request: heading,
gallery and video share the existing heading's 80rem content width, with minimum
3rem desktop / 1.5rem mobile gutters. `VisualSection` uses the same content class
for heading and media; the zoom reference calculation uses this same geometry.
This supersedes the earlier 75–128px media-only gutter trial. Image delivery-size
fallbacks and regression assertions were updated; crops and playback are unchanged.
The measurements/screenshots below are historical, preceding this alignment change.
Desktop page zoom still preserves the opening CSS layout dimensions so the browser
can shrink/enlarge headings and media together.

## Desktop zoom follow-up

- `useMediaZoomLayout` records the opening device-pixel ratio and scrollbar width.
  On resize, `mediaZoomLayout` expresses the viewport width in those reference
  CSS units, publishing one width/gutter pair for the media and measurement rail.
  It never uses viewport height, video metadata, CSS scale, or inverse zoom.
- At unchanged page zoom, dragging the window still updates media width normally.
  During zoom-out, media no longer expands to refill the enlarged CSS viewport.
  Zoom-in can require horizontal scrolling; no content is clipped to conceal it.
- Touch input/pinch zoom stays native. No keyboard, wheel, or gesture is blocked.
- The reference is the **opening** zoom, not an inferred absolute 100%. For the
  intended trial, use Ctrl+0 and reload before trying 80%/67%. A reload at another
  zoom re-establishes the reference. OS-scale changes / moving between mixed-DPI
  displays also affect devicePixelRatio; these are not distinguished from zoom.
  See [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).
- Tests cover opening sizes, zoom calculations with non-1 Windows display scale,
  zoom return, and actual window resizing. Local browser DOM checks preserve
  1366/1440/1920/2560/390-width geometry. Native browser-chrome zoom controls were
  not available through the in-app automation API; actual zoom remains a manual
  preview check, not a claimed end-to-end test.

This revision supersedes the earlier height-first fitter. The user approved this
template for publication on 2026-09-17; durable rules are recorded in `AGENTS.md`.
Layout work did not generate posters or transcode videos. The separately reviewed
posters have now been published to immutable R2 paths (see `video-posters.md`).
The historical measurements below are not the final alignment measurements.

## Earlier width-first implementation (historical baseline)

Priority: use available horizontal space, preserve aligned media/composition,
then allow natural scrolling when a complete video card exceeds the viewport.

- `MediaContentLayout` shares a CSS gutter, not a computed content width.
  Desktop: `clamp(20px, 2vw, 40px)` each side.
  Mobile: `clamp(12px, 4vw, 16px)` each side.
- `VisualSection` places the media container outside the old heading-only
  `max-w-7xl` wrapper. Navigation, hero, section headings, intro/outro keep their
  existing layouts. Media has no fixed maximum width.
- Gallery rows and video lists fill this same container. Video articles are
  `width:100%`, frame is 16:9, poster/video use `contain`. No height cap.
- Deleted the obsolete `fitMediaContent.ts` solver and replaced
  `useMediaContentFit` with `useVideoCaptionHeight`. There is no viewport-height
  probe, height-to-width conversion, minimum-fit width or per-card width.
- The remaining observer measures all text captions at the actual CSS rail width,
  including collapsed entries, and sets only common caption height. It never
  writes gallery/card width. Header measurement affects scroll margin only.
- Caption typography remains bounded at 24–30px (normal root font), with compact
  18–28px padding, desktop 1:2 columns and mobile stacking. Longer text reserves
  height for the whole group, without narrowing any media.
- Updated lazy image `sizes` fallbacks to the uncapped gutters/mosaic widths.
  Supporting browsers use `auto` to select against actual rendered width.

## Photo gaps

Before this revision, the stretched large photo buttons had a fixed-ratio child
shorter than their grid row. Native button layout centered it vertically, leaving
beige strips (measured ~59px on each side for Base Torres and ~97px for Routes at
the old 1235×673 preview size). Photos were still `object-fit:cover`, not contain.

Large photo buttons are now flex columns and their image frames flex to fill the
stretched card. Existing aspect-ratio preference, cover behavior, object-position,
manual zoom/shift, mosaic spans and captions are retained. Small photo text panels
remain intact; their legitimate beige background is not removed. No image pixels,
photo files or lightbox implementation were modified.

## Browser acceptance

In-app Chromium, 100% zoom, all 22 expanded TDP photo rows / five videos and all
13 expanded Belize rows / one video. Both pages have these actual widths:

| Viewport | Available content width | Media width | Left margin | Right margin | Edge difference |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1366×768 | 1351 | 1296.375 | 27.3125 | 27.3125 | 0 |
| 1440×900 | 1425 | 1367.40625 | 28.796875 | 28.796875 | 0 |
| 1920×1080 | 1905 | 1828.21875 | 38.390625 | 38.390625 | 0 |
| 2560×1440 | 2545 | 2465 | 40 | 40 | 0 |
| 390×844 | 375 | 343.8125 | 15.59375 | 15.59375 | 0 |

This browser reserves 15px for a scrollbar. Margins are relative to actual content
width, excluding that scrollbar. Overlay-scrollbar browsers have more usable width.

- Gallery rows, video frames and black captions align; all same-page video frames
  and caption heights are equal. Aspect ratio is 16:9 with contain.
- All inspected large photo frame top/bottom gaps are 0px at every tested size.
- Mixed 2:1:1 / 1:1:2 column spans and editorial ordering remain unchanged.
- Expansion and poster-to-video activation leave existing card width/height stable.
- At 1440px width, changing height to 500, 900 or 1200 leaves media width exactly
  1367.40625px. Tall cards scroll normally; fitting one screen is not an assertion.
- No document horizontal overflow; captions are complete. No physical phone test.
- Poster/URL/pipeline/volume/user-volume/offscreen-pause logic is unchanged.

## Checks and artifacts

- Production build and TypeScript pass.
- Targeted ESLint passes. Full lint still has 13 pre-existing
  `no-html-link-for-pages` navigation errors, not new layout errors.
- Five updated source-contract regression tests pass:
  `node --test scripts/tests/media-layout.test.mjs`.
  They guard CSS-owned uncapped width, no height-to-width solver, text-only
  measurement, video/frame rules, and photo-frame/crop preservation.
  Actual dimensions are verified separately in the browser as above.
- Read-only poster audit: nine existing WebPs, none oversized.
- `git diff --check` passes.
- Local evidence: `media-review/width-first-media/measurements.json`,
  `wide-grid-video.png` (1366×768), `complete-wide-video.png` (1440×1200,
  the height-only independence test; not a claim that this card fits 900px height).

Use the running local preview:
- http://127.0.0.1:3005/real/chile/torres-del-paine
- http://127.0.0.1:3005/real/belize

Restart if needed with the existing `npm run media:preview` command.
