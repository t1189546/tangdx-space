export const DEFAULT_R2_REMOTE = process.env.R2_REMOTE ?? "r2";
export const DEFAULT_R2_BUCKET = process.env.R2_BUCKET ?? "tangdx-media";
export const DEFAULT_PUBLIC_MEDIA_BASE =
  process.env.R2_PUBLIC_URL ?? "https://media.tangdx.space";
export const IMMUTABLE_MEDIA_CACHE_CONTROL =
  "public, max-age=31536000, immutable";
