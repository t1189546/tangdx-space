import type { VisualVideo } from "@/components/real/place/types";

// Empty in every normal build. Populated only by the loopback-only preview command.
const preview: Record<string, Partial<VisualVideo>> = JSON.parse(
  process.env.NEXT_PUBLIC_VIDEO_POSTER_PREVIEW ?? "{}",
);

export function videoPreview(item: VisualVideo): VisualVideo {
  return { ...item, ...preview[item.src] };
}
