import type { OptimizedPhotoSource } from "@/components/media/OptimizedPhoto";

export type LightboxImage = OptimizedPhotoSource & {
  title: string;
  subtitle: string;
  cropPosition?: string;
  imageZoom?: number;
  imageShiftX?: string;
  imageShiftY?: string;
};

export type ImageCrop = "top" | "center";
export type ImageShape = "large" | "small" | "wide";
export type VideoShape = "video-wide" | "video-small";

export type VisualImage = LightboxImage & {
  kind: "image";
  id: string;
  note: string;
  crop: ImageCrop;
  shape: ImageShape;
  cropPosition?: string;
  imageZoom?: number;
  imageShiftX?: string;
  imageShiftY?: string;
};

export type VisualVideo = {
  kind: "video";
  id: string;
  title: string;
  subtitle?: string;
  note?: string;
  src: string;
  poster?: string;
  posterMetadata?: OptimizedPhotoSource;
  shape: VideoShape;
};

export type VisualItem = VisualImage | VisualVideo;

export type VisualSection = {
  id: string;
  number: string;
  title: string;
  description: string;
  imagePreviewLimit?: number;
  videoPreviewLimit?: number;
  preserveImageShapes?: boolean;
  items: VisualItem[];
};

export type PlacePageContent = {
  hero: {
    eyebrow: string;
    titleLines: string[];
    description: string;
    backgroundPosition?: string;
    imageButtonLabel?: string;
  };
  intro: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  outro: {
    eyebrow: string;
    titleLines: string[];
    body: string;
    link: {
      href: string;
      label: string;
    };
  };
};

export type PlaceMedia = {
  heroImage: LightboxImage;
  visualSections: VisualSection[];
};

export type RealPlaceEntry = {
  page: PlacePageContent;
  media: PlaceMedia;
};
