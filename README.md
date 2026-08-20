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

Keep original photographs outside `public/`. Use `media-inbox/` only as an optional staging area, then copy the untouched archival files into `media-originals/real/<country>/<slug>/`. Generate web-ready masters and technical metadata from that archival folder with one command:

```bash
npm run media:optimize -- --input "media-originals/real/chile/new-place" --slug "new-place"
```

This writes high-quality, maximum-3200px WebP masters to `public/media/new-place/` and a generated metadata manifest to `content/media/new-place.generated.json`. Re-running the same command skips unchanged source files. Keep titles, captions, ordering, and crop controls in the page's editorial media file rather than editing the generated manifest.

Audit the largest public media assets at any time:

```bash
npm run media:audit
```

Use `--dir` and `--limit` to narrow the report, for example `npm run media:audit -- --dir "public/media/new-place" --limit 20`.

### Full-resolution lightbox originals on Cloudflare R2

Gallery images always use the generated WebP masters through `next/image`. A
lightbox uses `originalSrc` only after that image is opened and requests it
directly, without the Next.js image optimizer.

The deployed site stays on Vercel, while full-resolution originals use the
existing Cloudflare R2 `tangdx-media` bucket. Configure the local rclone remote
as `r2` with object read/write permission. Preview the upload plan (no network
writes) and then explicitly publish the exact originals:

```bash
npm run media:upload-originals -- --slug "new-place"
npm run media:upload-originals -- --slug "new-place" --execute
```

The upload command reads the original folder recorded in the generated
manifest, uses non-destructive `rclone copy --immutable`, verifies remote object
sizes, and writes each direct R2 `originalSrc` back to that manifest. It excludes
`-poster` files unless `--include-posters` is given. By default, paths follow
`images/originals/real/<country>/<slug>/<filename>.jpg`.

`--execute` uploads the original bytes unchanged. Embedded EXIF, GPS, capture
date, device details, and other metadata may therefore become public. If that
is not acceptable, do not run it; create a separate privacy-stripped public
full-resolution copy while keeping the archival file untouched.

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
