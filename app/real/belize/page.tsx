import PlacePage from "@/components/real/place/PlacePage";
import media from "@/content/real/belize/media.generated";
import content from "@/content/real/belize/page.json";

export default function BelizePage() {
  return <PlacePage content={content} media={media} />;
}
