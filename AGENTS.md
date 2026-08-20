<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Media performance rules

- Use the shared optimized photo components and generated media metadata for new photography pages.
- Never reference giant camera/phone originals from a page. Keep archival sources outside `public/` and run `npm run media:optimize` for each new batch.
- Preserve editorial order, captions, crop/object-position, zoom, and shift metadata exactly.
- Preload only the true LCP/Hero image. Gallery photos must lazy load with layout-accurate `sizes`.
- Collapsed galleries must not render hidden media before expansion. Lightboxes must fetch only the opened large image, never the full gallery eagerly.
- Keep full-resolution lightbox originals outside `public/` and Git. Publish them only to the existing Cloudflare R2 `tangdx-media` bucket with the explicit `media:upload-originals -- --execute` workflow; never introduce Vercel Blob. Preserve `originalSrc` in generated metadata and warn that exact originals retain EXIF/GPS.
- Performance work must not redesign existing pages.
- Run media audit, lint/type checks, and the production build after media changes.
