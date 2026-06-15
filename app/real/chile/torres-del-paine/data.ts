export type LightboxImage = {
  title: string;
  subtitle: string;
  src: string;
};

export type ImageCrop = "top" | "center";

export type ImageShape = "large" | "small" | "wide";

export type VideoShape = "video-wide" | "video-small";

export type SectionId =
  | "mountains-lakes"
  | "routes-movement"
  | "nature-studies"
  | "shelter"
  | "weather-light";

export type VisualImage = LightboxImage & {
  kind: "image";
  id: string;
  note: string;
  crop: ImageCrop;
  shape: ImageShape;
};

export type VisualVideo = {
  kind: "video";
  id: string;
  title: string;
  subtitle: string;
  note: string;
  src: string;
  shape: VideoShape;
};

export type VisualItem = VisualImage | VisualVideo;

export type VisualSection = {
  id: SectionId;
  number: string;
  title: string;
  description: string;
  items: VisualItem[];
};

const imageBase = "/images/real/chile/torres-del-paine";

const videoBase =
  "https://hebs7dfiyg1zinks.public.blob.vercel-storage.com/torres-del-paine";

function localImage(fileName: string) {
  return `${imageBase}/${fileName}`;
}

function blobVideo(fileName: string) {
  return `${videoBase}/${fileName}`;
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
  title: "Torres del Paine",
  subtitle: "The opening view of Chilean Patagonia.",
  src: localImage("tdp-000.jpg"),
};

export const visualSections: VisualSection[] = [
  {
    id: "mountains-lakes",
    number: "01",
    title: "Mountains & Lakes",
    description:
      "Granite towers, glacial water, pale light, and the scale of Chilean Patagonia.",
    items: [
      image({
        id: "tdp-001",
        title: "The Towers",
        subtitle: "Granite peaks, cloud, wind, and distance.",
        note: "A first large view: water, cloud, stone, and the feeling of scale.",
        src: localImage("tdp-001.jpg"),
        crop: "top",
        shape: "large",
      }),
      image({
        id: "tdp-002",
        title: "Water",
        subtitle: "Cold lakes, pale light, and moving weather.",
        note: "The lake holds the mountains at a slower rhythm.",
        src: localImage("tdp-002.jpg"),
        crop: "top",
        shape: "small",
      }),
      image({
        id: "tdp-005",
        title: "Weather",
        subtitle: "Clouds moving fast over an unfinished landscape.",
        note: "A sky that changes faster than the page can describe.",
        src: localImage("tdp-005.jpg"),
        crop: "top",
        shape: "small",
      }),
      video({
        id: "tdp-v001",
        title: "Lake and Mountain",
        subtitle: "Wind, water, and a mountain disappearing into weather.",
        note: "A muted field video of the lake and mountains. The full sound can be opened gently through the video controls.",
        src: blobVideo("tdp-v001.mp4"),
        shape: "video-wide",
      }),
      video({
        id: "tdp-v002",
        title: "Glacier",
        subtitle: "Blue ice, distance, and the slow pressure of cold.",
        note: "A short video fragment for the glacier section of Torres del Paine.",
        src: blobVideo("tdp-v002.mp4"),
        shape: "video-wide",
      }),
      video({
        id: "tdp-v003",
        title: "Towers and Falls",
        subtitle: "The three towers, falling water, and the movement of the valley.",
        note: "A field video connecting the iconic granite towers with water and motion.",
        src: blobVideo("tdp-v003.mp4"),
        shape: "video-wide",
      }),
    ],
  },
  {
    id: "routes-movement",
    number: "02",
    title: "Routes & Movement",
    description:
      "Horse trails, mountain roads, crossings, pauses, and the feeling of moving through distance.",
    items: [
      image({
        id: "tdp-003",
        title: "Routes",
        subtitle: "Roads, trails, crossings, and the scale of Patagonia.",
        note: "A body moving through distance, wind, and open ground.",
        src: localImage("tdp-003.jpg"),
        crop: "top",
        shape: "large",
      }),
    ],
  },
  {
    id: "nature-studies",
    number: "03",
    title: "Nature Studies",
    description:
      "Lichens, berries, plants, animals, textures, and small lives close to the ground.",
    items: [
      image({
        id: "tdp-004",
        title: "Small Life",
        subtitle: "Textures found close to the ground.",
        note: "A place for lichens, berries, plants, animals, flowers, stones, and small details.",
        src: localImage("tdp-004.jpg"),
        crop: "top",
        shape: "small",
      }),
      video({
        id: "tdp-v004",
        title: "Guanaco",
        subtitle: "A herd moving quietly through the open ground.",
        note: "A short field video of guanacos in the Patagonian landscape.",
        src: blobVideo("tdp-v004.mp4"),
        shape: "video-wide",
      }),
    ],
  },
  {
    id: "shelter",
    number: "04",
    title: "Shelter",
    description:
      "Rooms, meals, windows, warm interiors, and the quiet return from wind and weather.",
    items: [
      image({
        id: "tdp-004-shelter-placeholder",
        title: "Shelter",
        subtitle: "Rooms, meals, windows, and the quiet after wind.",
        note: "Small textures after the outside: warmth, rest, and return.",
        src: localImage("tdp-004.jpg"),
        crop: "top",
        shape: "small",
      }),
    ],
  },
  {
    id: "weather-light",
    number: "05",
    title: "Weather & Light",
    description:
      "Clouds, rainbows, sudden brightness, evening color, and the changing sky of Patagonia.",
    items: [
      image({
        id: "tdp-006",
        title: "Memory",
        subtitle: "A fragment kept from the edge of the world.",
        note: "A wide image to close the sequence: red trees, mountain, evening.",
        src: localImage("tdp-006.jpg"),
        crop: "center",
        shape: "wide",
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