# Video posters and viewport-fit cards

The later [shared media layout follow-up](shared-media-layout.md) supersedes the
video-only sizing described below; media-processing/color findings are unchanged.

## Release preparation (2026-09-17)

After user approval, the four reviewed WebP posters were uploaded to new
content-hashed R2 paths using the existing immutable uploader, following dry runs.
Object sizes, public URLs and immutable cache headers passed verification before
the generated technical manifests were updated. No archival files, playback
videos or existing remote objects were uploaded, replaced or deleted.
This records resource publication, not a claim of production deployment; Git and
Vercel release status must be checked separately. Local preview remains available
with `npm run media:preview`.

## Findings

The existing poster file was already wrong for three clips; this was not merely
a browser stylesheet or stale-cache problem. The old FFmpeg paths did YUV→RGB
conversion/scaling without handling the HDR transfer function or BT.2020 gamut.
Additionally, `FieldVideo` applied `bg-black/25` over the entire poster. No other
card/ancestor filter or persistent loading veil was found in browser checks.

| Video | Actual playback | Existing frame | Finding |
| --- | --- | --- | --- |
| `tdp-v005` On the Trail | H.264, 8-bit 4:2:0, limited BT.709 SDR, 1920×1080 | 0.5s | Local archival source is DV/HLG, but reviewed web MP4 is already SDR. Do not tone-map again. |
| `tdp-v003` Towers and Falls | HEVC Main 10, limited BT.2020nc / HLG, DV 8.4, 1920×1080 | 0.5s | Old poster omitted color conversion. |
| `tdp-v004` Guanaco | Same HDR/DV format as above | 0.5s | Same omission. |
| `blz-v008` Blue Hole Flight | Same HDR/DV format; display rotation −180° | 0.2s | Same omission; autorotation must also be respected. |

DV files contain profile 8, compatibility ID 4, RPU + base layer, no enhancement
layer. FFprobe exposes decoded Dolby Vision metadata. The installed FFmpeg 8.1.2
full build successfully runs libplacebo on this machine. Web/local playback
identity was verified by size and MD5 (including R2 multipart objects' rclone
MD5 metadata). All four media URLs returned HTTP 200/video/mp4. Published TDP
posters returned HTTP 200/image/webp, immutable cache headers, and exactly matched
the inspected local old poster bytes. No video re-encoding was needed/performed.

The current HDR playback capability is preserved. A static sRGB poster is not an
HDR/Dolby Vision rendering and cannot match every display's dynamic-range mapping.
Dolby's [8.4 compatibility explanation](https://professionalsupport.dolby.com/s/article/Transcoding-Dolby-Vision-profile-8-4-to-HLG-on-Android)
and [FFmpeg libplacebo documentation](https://ffmpeg.org/ffmpeg-filters.html#libplacebo)
inform the explicitly checked paths; neither extension nor bit depth alone selects a policy.

## Processing policy

- Input: reviewed final playback in `media-output/video-ready/`. Explicitly listed
  `legacyPlayback` entries can use byte-verified existing `public/videos/` files.
  Never use an archival original/inbox video as poster input.
- SDR BT.709: explicit YUV matrix/range→RGB conversion, no HDR tone mapping. This
  preserves the reviewed browser SDR appearance of On the Trail.
- HLG/PQ: libplacebo transfer linearization, tone mapping, perceptual gamut mapping,
  and full-range sRGB output. No cosmetic brightness/saturation/contrast filters.
- Supported single-layer DV: check profile/compatibility and decoded metadata, then
  use libplacebo `apply_dolbyvision=true`. Hable was selected after same-time SDR
  browser comparisons; `spline`, `bt.2390`, `bt.2446a` are explicit reviewable options.
  BT.2390 on these samples was markedly too bright; it is not hardcoded for all HDR.
- Unsupported DV layers/profiles, missing tags, unavailable filters/Vulkan, bad
  timestamps and decode failures fail closed. Explicit 8.4 HLG-base fallback requires
  a documented reason; it is never silently substituted. Untagged sources can have
  a documented per-file `color.inputOverride`, not an untracked guess.
- First frame by default, then 0.1/0.25/0.5/0.75/1/1.5/2s if black. An entirely
  invalid opening fails and asks for `posterTime`. Existing manual times persist.
- No crop; rotation/SAR inform display dimensions. Maximum long edge 1920, no
  upscaling. Quality 84 WebP with sRGB ICC, no EXIF/GPS.

Source SHA-256 + frame/configuration + pipeline version determine incremental
reuse. **Bump `POSTER_PIPELINE_VERSION` when changing pixel-processing logic**;
use `--force` after changing the external FFmpeg toolchain. Output names contain
content hashes and full location paths, so changed posters never overwrite a
published canonical URL. Serial processing bounds concurrency. Each manifest has
an exclusive lock; immutable outputs are verified before the atomic manifest swap.
Failures retain the previous valid poster/reference and do not block other jobs.

## Adding future videos

1. Keep camera originals in the existing inbox/archive workflow. Create/review the
   final web playback derivative without changing the archival file.
2. Put the playback file in `media-output/video-ready/<collection>/trip-v001.mp4`.
   A collection in `content/media/video-posters.config.json` names the location,
   ready directory and optional overrides. New pages need one collection entry,
   not one manually maintained poster path for every video.
3. Run the existing preparation entry:

```sh
npm run media:batch -- --posters --dry-run
npm run media:batch -- --posters --execute
```

The original inbox batch command also refreshes posters automatically. Add
`--prepare-only --execute` for a strictly local import; ordinary `--execute`
retains its existing publish/upload behavior and should only be used with approval.
`media:stage-video` also invokes the same generator automatically.

Nested folders, spaces and Chinese filenames work. Canonically named files need
no sidecar. An arbitrary filename can have `相机 原文件.mp4.poster.json`:

```json
{
  "id": "trip-v001",
  "posterTime": 0.5
}
```

Optional collection `overrides["trip-v001"]` or a sidecar can also provide:

```json
{
  "color": {
    "inputOverride": { "color_range": "tv" },
    "reason": "Verified against the camera export settings and actual playback"
  }
}
```

Only override fields actually verified. Never relabel genuinely HDR pixels as SDR.
Canonical IDs must be unique inside a location. Use qualified `location/ID` when
selecting an ID that exists in multiple collections. Existing editorial titles,
captions, ordering and crops are not written by these scripts.

```sh
# One video; time can instead be kept in its persistent config/sidecar:
npm run media:batch -- --posters --only tdp-v003 --force --execute
npm run media:batch -- --posters --only tdp-v003 --poster-time 0.5 --execute
# Full rebuild of configured posters only (not all videos/originals):
npm run media:batch -- --posters --force --execute
# Watch must remain running. Ctrl+C stops it; it never uploads:
npm run media:batch -- --posters --watch --execute
```

Watch requires two stable 3-second file/config intervals, then verifies the source
again after processing. For slow/network copies, copy as `.mp4.part` and rename to
`.mp4` only when complete. A partially copied/invalid file must not be treated as
a reviewed playback derivative. Single-file failures appear in the final summary
and `media-output/poster-last-run.json`; successful entries remain usable.

Staging manifests: `media-output/manifests/<full-location>/posters.json`.
Preview index: `media-output/poster-preview.json`. Both remain local-only.
Generated posters: `media-output/video-posters/<full-location>/` with mirrored R2
staging in `media-output/r2/images/video-posters/<full-location>/`.

## Local preview vs publication

```sh
npm run media:preview
# http://localhost:3005/real/chile/torres-del-paine
# http://localhost:3005/real/belize
```

Restart preview after regenerating. This loopback-only development helper serves
only manifest-allowlisted WebP derivatives. No credentials, originals or MP4s are
served by it. It leaves the existing R2 playback URL intact. Normal builds have an
empty preview map and no preview rewrite; Vercel cannot enable it.

After explicit publication approval, the **existing** `media:upload` command can
dry-run and upload a poster-only staging manifest, e.g.:

```sh
npm run media:upload -- --location real/chile/torres-del-paine --slug torres-del-paine --manifest media-output/manifests/real/chile/torres-del-paine/posters.json
# Only after approval and review of the dry run: repeat with --execute.
```

It checks local poster hashes, uses immutable R2 copies, verifies object sizes and
public URLs/cache headers, then merges technical metadata. Shared media resolvers
pick up the published poster and video dimensions; no manual poster URL editing.
Belize now has an empty generated manifest/resolver ready for that verified merge;
until upload approval, its published poster reference stays unchanged.

## Verification

Independent reference: Edge 153's actual HTML video decoder, same local playback
bytes, same timestamps, forced sRGB/SDR output (`dynamic-range: high` was false).
The reference was **not** produced by the poster's FFmpeg conversion. Old/new
images were also rendered in that browser without webpage overlays. Screenshots,
raw comparisons and JSON evidence are local under `media-review/color-audit/`.

8-bit RGB mean absolute difference against browser video (lower is closer; this
is a diagnostic, not perceptual Delta-E or a promise of pixel identity):

| Video | Old file | New file | New WebP size |
| --- | ---: | ---: | ---: |
| On the Trail | 2.21 | 2.08 | 376,876 B |
| Towers and Falls | 19.31 | 7.63 | 360,598 B |
| Guanaco | 23.41 | 17.03 | 345,902 B |
| Blue Hole Flight | 41.32 | 15.97 | 181,156 B |

Visual review: the old pale/grey-green cast is removed, with foliage, sky and
water closer to playback. On the Trail retains its SDR colors. Remaining HDR
tone-map differences are real, especially Blue Hole/Guanaco; not claimed to be
pixel-identical. Removing the 25% card overlay makes *all* posters brighter than
the old darkened page, but does not alter their file pixels or add a color grade.

Layout-only follow-up: the original per-card fitter allowed caption wrapping to
produce different card widths/heights. `VideoCardLayout` now measures all of a
page's video captions (including collapsed entries) in a hidden **text-only** bank
and publishes one shared width and maximum caption height as CSS variables.
The shared frame is always 16:9; both poster and video use `contain`, independent
of source ratio or the legacy video shape. Video rows share a 16px gap. Captions,
media URLs and existing source-ratio metadata are unchanged. The measurement rail
uses the same responsive gutters/max-width as visual sections; observers do not
measure the visible cards or resize them individually.

Edge DOM measurements for **all five** Torres del Paine videos were identical:

| Viewport | Card width | Frame height | Caption height | Total height |
| --- | ---: | ---: | ---: | ---: |
| 1366×768 | 952 | 535.5 | 131 | 666.5 |
| 1440×900 | 1187 | 667.6875 | 131 | 798.6875 |
| 1920×1080 | 1280 | 720 | 131 | 851 |
| 390×844 | 342 | 192.375 | 234 | 426.375 |

All four sizes fit below the measured header with full text/frames and no
horizontal overflow. Belize uses the same page-level rules and passes at all four
sizes (its single caption needs less space). Expand/collapse and poster loading
leave existing card geometry unchanged. Desktop/mobile playback activation and
pause/play leave geometry unchanged, preserve initial 0.3/user-adjusted 0.65 volume,
and still pause offscreen. Initial video elements and R2 MP4/JPG requests are zero.
No browser console errors. A first offscreen check used a fixed short delay; the
final test waits for actual scroll/pause state rather than timing assumptions.

At 844×390 all TDP cards uniformly fall back to 748×589.75px with readable scrolling.
A 32px root-font test also retains equal dimensions and full text with scrolling.
Resize/font changes recalculate the whole group; `100svh` provides stable mobile
browser-chrome allowance with a `100vh` fallback. These are Edge viewport tests,
not physical mobile browser tests. Evidence and the repeatable browser check are
local-only under `media-review/uniform-video-layout/`. This follow-up generated no
posters, transcoded no videos, and performed no R2 write or Git publication.

Browser checks: initial video element count 0 and no R2 MP4/JPG requests; all tested
posters load; lazy activation, native controls, unchanged dimensions on activation,
0.3 volume before play, user-adjusted 0.65 survives pause/play, offscreen pause,
no new console errors. No photo gallery layout or lightbox code was changed.
Lightbox smoke checks also passed: open, 150% zoom, next/keyboard previous, Esc.
An unsupported-volume simulation (setter ignored, getter stays at 1) confirmed
that the first play is muted with native controls retained. This is not an iPhone
device test.

Pipeline tests exercise actual FFmpeg and the batch CLI: nested Chinese filenames,
dry-run/no writes, new file discovery, black-frame fallback, no upscale, ICC/no
EXIF, unchanged skip, timestamp/version rebuild, manual-time persistence,
invalid-file isolation, source hashes unchanged, atomic failure preservation and
watch stability. Test sources are synthetic and never uploaded or added to pages.

Engineering checks completed: production `npm run build`, `npx tsc --noEmit`,
targeted ESLint on all changed executable files, 5/5 `npm run test:media` tests,
media audit (9 old/new local posters, none oversized), and `git diff --check`.
Full `npm run lint` has the same **13 pre-existing** `no-html-link-for-pages`
errors found before changes, in SiteHeader and existing page navigation. No new
lint warning/error was introduced and unrelated navigation was not refactored.

## Changed source files

- `components/real/place/FieldVideo.tsx`, `FieldVideo.module.css`,
  `useVideoCardFit.ts`, `types.ts`: shared fit/caption/player behavior.
- Layout follow-up: `VideoCardLayout.tsx`, `VideoCaption.tsx`, `PlacePage.tsx`,
  `VisualSection.tsx`, the existing fitter/card/CSS, and this report only.
- `components/media/mediaManifest.ts`, `videoPreview.ts`: generated video metadata
  and opt-in local preview binding.
- `content/media/video-posters.config.json`, `belize.generated.json`, plus the
  TDP/Belize editorial modules' technical resolver wiring (no text/order changes).
- `scripts/generate-video-poster.mjs`, `video-color.mjs`,
  `prepare-video-posters.mjs`, `media-batch.mjs`, `stage-web-video.mjs`,
  `upload-web-media.mjs`, `preview-media.mjs`, `tests/video-posters.test.mjs`.
- `scripts/generate-video-posters.mjs`: old unsafe legacy extraction now delegates
  to the same color-managed configured pipeline, defaulting to dry-run.
- `next.config.ts`, `package.json`, `README.md`, this report: opt-in local preview,
  reusable commands and workflow documentation.

Limits: no physical iPhone/Safari/Android or HDR-monitor test was performed. On
browsers rejecting JS volume, the implementation starts safely muted and leaves
native controls in charge; it cannot set iPhone system volume. Native HDR output
can differ from the SDR poster by design. The existing HEVC-only legacy playback
sources were not re-encoded or replaced.
