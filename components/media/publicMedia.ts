export const PUBLIC_MEDIA_BASE_URL =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "https://media.tangdx.space";

export function publicMediaUrl(objectPath: string) {
  const normalizedPath = objectPath.replace(/^\/+/, "");
  return `${PUBLIC_MEDIA_BASE_URL}/${normalizedPath}`;
}
