import type { RealPlaceEntry } from "@/components/real/place/types";
import torresDelPaineMedia from "./chile/torres-del-paine/media.generated";
import torresDelPainePage from "./chile/torres-del-paine/page.json";

export const realPlaces = {
  "chile/torres-del-paine": {
    page: torresDelPainePage,
    media: torresDelPaineMedia,
  },
} satisfies Record<string, RealPlaceEntry>;

export function getRealPlace(country: string, place: string) {
  const key = `${country}/${place}`;

  if (!Object.hasOwn(realPlaces, key)) {
    return undefined;
  }

  return realPlaces[key as keyof typeof realPlaces];
}

export function getRealPlaceStaticParams() {
  return Object.keys(realPlaces).map((key) => {
    const [country, place] = key.split("/");

    return {
      country,
      place,
    };
  });
}
