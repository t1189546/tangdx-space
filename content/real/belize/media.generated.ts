import type {
  LightboxImage,
  PlaceMedia,
  VisualImage,
  VisualSection,
  VisualVideo,
} from "@/components/real/place/types";
import { publicMediaUrl } from "@/components/media/publicMedia";

const imageBase = "/images/real/belize";

function localImage(fileName: string) {
  return `${imageBase}/${fileName}`;
}

function image(item: Omit<VisualImage, "kind">): VisualImage {
  return {
    kind: "image",
    ...item,
  };
}

function video(item: Omit<VisualVideo, "kind">): VisualVideo {
  return {
    kind: "video",
    ...item,
  };
}

export const heroImage: LightboxImage = {
  title: "Blue Hole",
  subtitle: "Reef and deep water from above.",
  src: localImage("blz-007.jpg"),
  cropPosition: "50% 38%",
  imageZoom: 1.00,
  imageShiftY: "0%",
};

export const visualSections: VisualSection[] = [
  {
    id: "Caribbean Sea",
    number: "01",
    title: "Caribbean Sea",
    description: "into blue water, coral shadows, and slow-moving creatures.",
    imagePreviewLimit: 3,
    videoPreviewLimit: 1,
    preserveImageShapes: true,
    items: [
      image({
  id: "blz-001",
  title: "Underwater",
  subtitle: "Selfie I took when scuba diving.",
  note: "The coral reef lies beneath me.",
  src: localImage("blz-001.jpg"),
  crop: "center",
  cropPosition: "55% 100%",
  imageZoom: 1.12,
  imageShiftY: "4%",
  shape: "large",
}),
 image({
  id: "blz-005",
  title: "Reef Boat",
  subtitle: "A boat crossing pale water.",
  note: "The sea opens in layers of blue.",
  src: localImage("blz-005.jpg"),
  crop: "center",
  cropPosition: "50% 35%",
  imageZoom: 1.08,
  imageShiftY: "0%",
  shape: "small",
}),
      image({
        id: "blz-006",
        title: "Underwater Wall",
        subtitle: "Dark rock and blue depth.",
        note: "Light thins as the wall drops away.",
        src: localImage("blz-006.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-007",
        title: "Blue Hole",
        subtitle: "Reef and deep water from above.",
        note: "A circle of darkness inside the reef.",
        src: localImage("blz-007.jpg"),
        crop: "center",
        cropPosition: "50% 0%",
  imageZoom: 1.1,
  imageShiftY: "0%",
        shape: "small",
      }),
      video({
        id: "blz-v008",
        title: "Blue Hole Flight",
        subtitle: "A slow pass over reef and open blue.",
        note: "The only Belize video currently used on this page.",
        src: publicMediaUrl("videos/real/belize/blz-v008.mp4"),
        poster: localImage("blz-v008-poster.jpg"),
        shape: "video-wide",
      }),
    ],
  },
  {
    id: "maya-ruins",
    number: "02",
    title: "Maya Ruins",
    description:
      "stone, jungle, and the remains of a vanished ceremonial world.",
    imagePreviewLimit: 3,
    preserveImageShapes: true,
    items: [
      image({
        id: "blz-009",
        title: "Lamanai Path",
        subtitle: "Stone, grass, and jungle edges.",
        note: "The path holds the ruins in green silence.",
        src: localImage("blz-009.jpg"),
        crop: "center",
        cropPosition: "50% 10%",
  imageZoom: 1.05,
  imageShiftY: "0%",
        shape: "large",
      }),
      image({
        id: "blz-010",
        title: "Temple Side",
        subtitle: "A face beside old stone.",
        note: "Heat and stone press close together.",
        src: localImage("blz-010.jpg"),
        crop: "top",
        cropPosition: "50% 50%",
  imageZoom: 1,
  imageShiftY: "0%",
        shape: "small",
      }),
      image({
        id: "blz-011",
        title: "Temple Front",
        subtitle: "Steps rising from the grass.",
        note: "The structure keeps its weight in the sun.",
        src: localImage("blz-011.jpg"),
        crop: "center",
        cropPosition: "50% 0%",
  imageZoom: 1.0,
  imageShiftY: "0%",
        shape: "small",
      }),
      image({
        id: "blz-012",
        title: "Stone Temple",
        subtitle: "Carved walls inside the trees.",
        note: "The jungle gathers around the stone.",
        src: localImage("blz-012.jpg"),
        crop: "center",
        cropPosition: "50% 0%",
  imageZoom: 1.0,
  imageShiftY: "0%",
        shape: "small",
      }),
      image({
        id: "blz-013",
        title: "Palms and Stone",
        subtitle: "A temple framed by palms.",
        note: "The old wall rises through shade and light.",
        src: localImage("blz-013.jpg"),
        crop: "center",
        cropPosition: "50% 0%",
  imageZoom: 1.0,
  imageShiftY: "0%",
        shape: "large",
      }),
    ],
  },
  {
    id: "life-fragments",
    number: "03",
    title: "Life Fragments",
    description:
      "small scenes gathered between sea, streets, animals, and evening light.",
    imagePreviewLimit: 3,
    preserveImageShapes: true,
    items: [
      image({
        id: "blz-014",
        title: "Iguana",
        subtitle: "Stillness on warm wood.",
        note: "A small body pauses in the shade.",
        src: localImage("blz-014.jpg"),
        crop: "center",
        shape: "large",
      }),
      image({
        id: "blz-015",
        title: "Dog",
        subtitle: "A quiet nap by the wall.",
        note: "Afternoon settles into the cushion.",
        src: localImage("blz-015.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-016",
        title: "Pier Light",
        subtitle: "A lamp over evening water.",
        note: "The pier holds the last colour of the day.",
        src: localImage("blz-016.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-017",
        title: "Pier Light",
        subtitle: "The same evening, almost still.",
        note: "A duplicate moment kept as its own frame.",
        src: localImage("blz-017.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-018",
        title: "Hermit Crab",
        subtitle: "A small shell against bark.",
        note: "The smallest movements mark the surface.",
        src: localImage("blz-018.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-019",
        title: "Beach Palm",
        subtitle: "A palm over pale water.",
        note: "The coast stays simple in the wind.",
        src: localImage("blz-019.jpg"),
        crop: "center",
        shape: "large",
      }),
      image({
        id: "blz-020",
        title: "Seaside Street",
        subtitle: "Colour, palms, and water ahead.",
        note: "The street opens quietly toward the sea.",
        src: localImage("blz-020.jpg"),
        crop: "center",
        shape: "large",
      }),
      image({
        id: "blz-021",
        title: "Dock Chairs",
        subtitle: "Two chairs facing the water.",
        note: "Rest waits at the end of the dock.",
        src: localImage("blz-021.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-022",
        title: "White Flowers",
        subtitle: "Soft petals in green shade.",
        note: "A bright detail beside the heat.",
        src: localImage("blz-022.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-023",
        title: "Palapa Dock",
        subtitle: "A shaded place near the water.",
        note: "The roof makes a small shelter from the glare.",
        src: localImage("blz-023.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-024",
        title: "Night Drinks",
        subtitle: "A dark table after sunset.",
        note: "The night gathers around glass and light.",
        src: localImage("blz-024.jpg"),
        crop: "center",
        shape: "small",
      }),
      image({
        id: "blz-025",
        title: "Sea Sunset",
        subtitle: "Orange light over the water.",
        note: "The horizon lowers into colour.",
        src: localImage("blz-025.jpg"),
        crop: "center",
        shape: "large",
      }),
      image({
        id: "blz-026",
        title: "Cat",
        subtitle: "A cat in pink light.",
        note: "A small domestic pause between days.",
        src: localImage("blz-026.jpg"),
        crop: "center",
        shape: "large",
      }),
      image({
        id: "blz-027",
        title: "Breakfast",
        subtitle: "A plate before the day begins.",
        note: "Morning appears in small pieces.",
        src: localImage("blz-027.jpg"),
        crop: "center",
        shape: "small",
      }),
    ],
  },
];

export const lightboxImages: LightboxImage[] = [
  heroImage,
  ...visualSections.flatMap((section) =>
    section.items.filter((item): item is VisualImage => item.kind === "image"),
  ),
];

const media: PlaceMedia = {
  heroImage,
  visualSections,
};

export default media;
