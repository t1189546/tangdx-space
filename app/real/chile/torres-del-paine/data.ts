
export type LightboxImage = {
  title: string;
  subtitle: string;
  src: string;
};

export type VisualImage = LightboxImage & {
  kind: "image";
  note: string;
  crop: "top" | "center";
  shape: "large" | "small" | "wide";
};

export type VisualVideo = {
  kind: "video";
  title: string;
  subtitle: string;
  note: string;
  src: string;
  shape: "video-wide" | "video-small";
};

export type VisualItem = VisualImage | VisualVideo;

export type VisualSection = {
  number: string;
  title: string;
  description: string;
  items: VisualItem[];
};

export const heroImage: LightboxImage = {
  title: "Torres del Paine",
  subtitle: "The opening view of Chilean Patagonia.",
  src: "/images/real/chile/torres-del-paine/tdp-000.jpg",
};

export const visualSections: VisualSection[] = [
  {
    number: "01",
    title: "Mountains & Lakes",
    description:
      "Granite towers, glacial water, pale light, and the scale of Chilean Patagonia.",
    items: [
      {
        kind: "image",
        title: "The Towers",
        subtitle: "Granite peaks, cloud, wind, and distance.",
        note: "A first large view: water, cloud, stone, and the feeling of scale.",
        src: "/images/real/chile/torres-del-paine/tdp-001.jpg",
        crop: "top",
        shape: "large",
      },
      {
        kind: "image",
        title: "Water",
        subtitle: "Cold lakes, pale light, and moving weather.",
        note: "The lake holds the mountains at a slower rhythm.",
        src: "/images/real/chile/torres-del-paine/tdp-002.jpg",
        crop: "top",
        shape: "small",
      },
      {
        kind: "image",
        title: "Weather",
        subtitle: "Clouds moving fast over an unfinished landscape.",
        note: "A sky that changes faster than the page can describe.",
        src: "/images/real/chile/torres-del-paine/tdp-005.jpg",
        crop: "top",
        shape: "small",
      },
      {
        kind: "video",
        title: "Lake and Mountain",
        subtitle: "Wind, water, and a mountain disappearing into weather.",
        note: "A muted field video of the lake and mountains. The full sound can be opened gently through the video controls.",
        src: "/videos/real/chile/torres-del-paine/tdp-v001.mp4",
        shape: "video-wide",
      },
      {
        kind: "video",
        title: "Glacier",
        subtitle: "Blue ice, distance, and the slow pressure of cold.",
        note: "A short video fragment for the glacier section of Torres del Paine.",
        src: "/videos/real/chile/torres-del-paine/tdp-v002.mp4",
        shape: "video-wide",
      },
      {
        kind: "video",
        title: "Towers and Falls",
        subtitle: "The three towers, falling water, and the movement of the valley.",
        note: "A field video connecting the iconic granite towers with water and motion.",
        src: "/videos/real/chile/torres-del-paine/tdp-v003.mp4",
        shape: "video-wide",
      },
    ],
  },
  {
    number: "02",
    title: "Routes & Movement",
    description:
      "Horse trails, mountain roads, crossings, pauses, and the feeling of moving through distance.",
    items: [
      {
        kind: "image",
        title: "Routes",
        subtitle: "Roads, trails, crossings, and the scale of Patagonia.",
        note: "A body moving through distance, wind, and open ground.",
        src: "/images/real/chile/torres-del-paine/tdp-003.jpg",
        crop: "top",
        shape: "large",
      },
    ],
  },
  {
    number: "03",
    title: "Nature Studies",
    description:
      "Lichens, berries, plants, animals, textures, and small lives close to the ground.",
    items: [
      {
        kind: "image",
        title: "Small Life",
        subtitle: "Textures found close to the ground.",
        note: "A place for lichens, berries, plants, animals, flowers, stones, and small details.",
        src: "/images/real/chile/torres-del-paine/tdp-004.jpg",
        crop: "top",
        shape: "small",
      },
      {
        kind: "video",
        title: "Guanaco",
        subtitle: "A herd moving quietly through the open ground.",
        note: "A short field video of guanacos in the Patagonian landscape.",
        src: "/videos/real/chile/torres-del-paine/tdp-v004.mp4",
        shape: "video-wide",
      },
    ],
  },
  {
    number: "04",
    title: "Shelter",
    description:
      "Rooms, meals, windows, warm interiors, and the quiet return from wind and weather.",
    items: [
      {
        kind: "image",
        title: "Shelter",
        subtitle: "Rooms, meals, windows, and the quiet after wind.",
        note: "Small textures after the outside: warmth, rest, and return.",
        src: "/images/real/chile/torres-del-paine/tdp-004.jpg",
        crop: "top",
        shape: "small",
      },
    ],
  },
  {
    number: "05",
    title: "Weather & Light",
    description:
      "Clouds, rainbows, sudden brightness, evening color, and the changing sky of Patagonia.",
    items: [
      {
        kind: "image",
        title: "Memory",
        subtitle: "A fragment kept from the edge of the world.",
        note: "A wide image to close the sequence: red trees, mountain, evening.",
        src: "/images/real/chile/torres-del-paine/tdp-006.jpg",
        crop: "center",
        shape: "wide",
      },
    ],
  },
];

export const lightboxImages: LightboxImage[] = [
  heroImage,
  ...visualSections.flatMap((section) =>
    section.items.filter((item): item is VisualImage => item.kind === "image"),
  ),
];