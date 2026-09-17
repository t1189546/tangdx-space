This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Photography media workflow

Large travel media follows three separate storage roles:

- `media-inbox/`: temporary local downloads; never committed or deployed.
- `media-originals/`: untouched local archival masters; never committed, deployed, or uploaded.
- Cloudflare R2 `tangdx-media`: public web-ready image and video derivatives.

Start a new batch under `media-inbox/<short-name>/photos/` and
`media-inbox/<short-name>/videos/`. Preview canonical numbering and collision
checks with the fail-closed batch command. The dry run changes nothing:

```bash
npm run media:batch -- --input "media-inbox/new-place" --location "real/chile/new-place" --prefix "new" --slug "new-place"
```

For local preparation without contacting R2, use `--prepare-only`. This also
refreshes configured video posters, including previously imported videos:

```bash
npm run media:batch -- --input "media-inbox/new-place" --location "real/chile/new-place" --prefix "new" --slug "new-place" --prepare-only --execute
```

After reviewing the plan, the existing publishing mode remains explicit (it **uploads**):

```bash
npm run media:batch -- --input "media-inbox/new-place" --location "real/chile/new-place" --prefix "new" --slug "new-place" --execute
```

The batch command archives originals, optimizes only newly copied photos,
stages reviewed browser-ready videos, generates opening-frame WebP posters from
those final playback MP4s, uploads with immutable R2 semantics,
verifies public URLs, and merges technical metadata. It stops before writing if
it finds a canonical-ID collision, a different existing R2 object, or a new
video without a matching H.264/yuv420p + AAC `.mp4` under
`media-output/video-ready/new-place/`. It never deletes the inbox.

The individual commands remain available for inspection or advanced use. To
run only the archive stage:

```bash
npm run media:archive -- --input "media-inbox/new-place" --location "real/chile/new-place" --prefix "new"
npm run media:archive -- --input "media-inbox/new-place" --location "real/chile/new-place" --prefix "new" --execute
```

The archive command never removes inbox files and never overwrites a destination.
It scans existing originals, public filenames, staged output, and content metadata
before assigning a number. Exact duplicate files are skipped by SHA-256.

Generate high-quality, privacy-stripped WebP derivatives in ignored local staging:

```bash
npm run media:optimize -- --input "media-originals/real/chile/new-place" --location "real/chile/new-place" --slug "new-place"
```

This writes maximum-3200px WebP masters to
`media-output/r2/images/web/real/chile/new-place/` and a staging manifest under
`media-output/manifests/`. Re-running it skips unchanged source files. It does
not upload, edit the originals, or update the live website.

Video encoding is intentionally separate because HDR, Dolby Vision, codec, and
audio decisions need review. Create a browser playback copy under
`media-output/video-ready/` without changing the archival video, then stage it.
Staging automatically selects the first valid opening frame (starting at 0),
preserves configured `posterTime` selections, and creates an uncropped,
color-managed WebP poster under `media-output/video-posters/`:

```bash
npm run media:stage-video -- --input "media-output/video-ready/new-place/new-v001.mp4" --location "real/chile/new-place" --slug "new-place"
npm run media:stage-video -- --input "media-output/video-ready/new-place/new-v001.mp4" --location "real/chile/new-place" --slug "new-place" --execute
```

Finally, preview and explicitly publish only the staged web derivatives:

```bash
npm run media:upload -- --location "real/chile/new-place" --slug "new-place"
npm run media:upload -- --location "real/chile/new-place" --slug "new-place" --execute
```

The upload uses the existing local `r2` rclone remote and `tangdx-media` bucket,
uses immutable copy semantics, publishes with
`Cache-Control: public, max-age=31536000, immutable`, verifies remote sizes,
cache headers, and public URLs, and only then merges generated technical metadata into
`content/media/new-place.generated.json`. It never uploads from
`media-originals/`. R2 paths follow the established bucket layout:

```text
images/web/real/<country>/<place>/<photo>.webp
images/video-posters/real/<country>/<place>/<video>-poster.<content-hash>.webp
videos/real/<country>/<place>/<video>.mp4
```

The canonical production hostname is `https://media.tangdx.space`.
`R2_PUBLIC_URL`, `R2_REMOTE`, and `R2_BUCKET` may override non-secret routing
settings. Credentials remain in the local rclone configuration, never in Git.
Keep titles, captions, ordering, and crop controls in the page's editorial media
file rather than editing generated technical metadata.

To audit and safely backfill immutable cache metadata for an existing location,
first run the identity-checking dry run and then execute it explicitly:

```bash
npm run media:cache:backfill -- --location "real/chile/torres-del-paine" --kind images
npm run media:cache:backfill -- --location "real/chile/torres-del-paine" --kind images --execute
```

The command refuses to write unless every target has a byte-identical local web
derivative. It verifies object size, MD5, public URL, and cache headers after the
metadata update and never deletes an object.

Audit the largest public media assets at any time:

```bash
npm run media:audit
```

Use `--dir` and `--limit` to narrow the report, for example `npm run media:audit -- --dir "public/media/new-place" --limit 20`.

### Local video poster preparation and preview

Put reviewed playback MP4s in the collection's `media-output/video-ready/` folder.
Collections and optional per-video frame/color settings live in
`content/media/video-posters.config.json`. One collection entry discovers all
MP4s recursively; do not manually maintain poster paths. Existing import and
`media:stage-video` commands call the same generator automatically.

```bash
# Inspect, then prepare every configured new/changed poster locally (NO uploads):
npm run media:batch -- --posters --dry-run
npm run media:batch -- --posters --execute

# Rebuild one; --force without --only rebuilds all configured posters:
npm run media:batch -- --posters --only tdp-v003 --force --execute

# Keep running to watch for stable file/config changes (NO uploads):
npm run media:batch -- --posters --watch --execute

# Preview unpublished posters; stop/restart after regenerating:
npm run media:preview

# Pipeline regressions (requires local FFmpeg + FFprobe):
npm run test:media
```

Preview is at `http://localhost:3005`. It serves only allowlisted WebP derivatives
over loopback; never originals. Normal `npm run dev` / build continues to use
verified published metadata, not unpublished R2 URLs. No poster generation runs
during `npm run build` or a visitor request.

See [video poster workflow and verification](docs/video-posters.md) for color
policies, Windows/Unicode inputs, watch safety, current results and publication gates.

### Existing legacy media (unchanged)

Older Torres del Paine entries still use local `public/media/` WebP files and
legacy R2 `originalSrc` objects through the custom media domain; newer entries
use R2 web masters. Keep both working object-path sets until a separate legacy
migration is explicitly requested.
The former original-upload script is deliberately disabled, and no new
archival original should be published to R2.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
