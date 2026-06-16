import { notFound } from "next/navigation";
import PlacePage from "@/components/real/place/PlacePage";
import { getRealPlace } from "@/content/real/places";

type RealPlaceRouteProps = {
  params: Promise<{
    country: string;
    place: string;
  }>;
};

export default async function RealPlaceRoute({ params }: RealPlaceRouteProps) {
  const { country, place } = await params;
  const entry = getRealPlace(country, place);

  if (!entry) {
    notFound();
  }

  return <PlacePage content={entry.page} media={entry.media} />;
}
