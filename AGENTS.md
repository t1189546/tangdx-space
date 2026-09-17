<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Media performance rules

- Use the shared optimized photo components and generated media metadata for new photography pages.
- Keep `media-inbox/`, `media-originals/`, `media-output/`, and `media-review/` local-only and ignored by Git. Never delete or alter an archival master as part of website processing.
- Never reference giant camera/phone originals from a page. Archive with `npm run media:archive`, generate web derivatives with `npm run media:optimize`, and publish only those derivatives with `npm run media:upload`.
- Preserve editorial order, captions, crop/object-position, zoom, and shift metadata exactly.
- Preload only the true LCP/Hero image. Gallery photos must lazy load with layout-accurate `sizes`.
- Collapsed galleries must not render hidden media before expansion. Lightboxes must fetch only the opened large image, never the full gallery eagerly.
- Cloudflare R2 `tangdx-media`, served through `https://media.tangdx.space`, is the public store for high-quality web image/video derivatives. Archival originals remain local-only; never upload a new original or introduce Vercel Blob. Existing legacy R2 original object paths must remain intact until a separately verified migration replaces them.
- Published `images/web/**` and `videos/**` objects use `Cache-Control: public, max-age=31536000, immutable`; never silently overwrite a canonical media ID.
- Generate every video poster from its final reviewed playback MP4 under `media-output/video-ready/`, never from an HDR/HLG/Dolby Vision archival original. Posters are uncropped WebP derivatives under `images/video-posters/**`; a missing playback derivative must fail closed.
- R2 writes must be dry-run first, use immutable copy semantics, verify the object and public URL, and only then update tracked technical metadata. Never delete remote objects during routine media work.
- Performance work must not redesign existing pages.
- Run media audit, lint/type checks, and the production build after media changes.

## Approved travel-page template (2026-09-17)

- Reuse `PlacePage`, `MediaContentLayout`, `VisualSection`, `ImageCard` and `FieldVideo` for future countries and places; do not introduce page-specific width patches.
- Align section headings, the outer photo grid, video frames and black captions with the unchanged header brand / section-index card outer edge. Keep the shared centered 80rem geometry, minimum 3rem desktop and 1.5rem mobile gutters; no extra gutter multiplier.
- Preserve the approved large/small mosaic (LSS / SSL), editorial crops and order. Never promote an incomplete final row to full-width automatically.
- Video frames share 16:9 geometry with `contain`; captions reserve a common group height. Caption height and viewport height must never shrink media width. Allow natural scrolling.
- Preserve opening-reference browser zoom behavior and native touch zoom; do not refill the viewport to counteract zoom-out. See `docs/shared-media-layout.md` for limitations and preview instructions.
- Preserve lazy playback, initial 0.3 volume without overriding later user adjustments, corrected posters, photo Lightbox and collapsed-media behavior. Use the existing batch/preview/upload workflow for new media.
