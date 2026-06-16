"use client";



import type { VisualImage } from "./data";

type ImageCardProps = {
  image: VisualImage;
  onOpen: (src: string) => void;
};

export default function ImageCard({ image, onOpen }: ImageCardProps) {
  const isLarge = image.shape === "large";
  const isSmall = image.shape === "small";
  const isWide = image.shape === "wide";

const imageZoom = image.imageZoom ?? 1;
const defaultOffset = `${((1 - imageZoom) * 50).toFixed(2)}%`;

const imageStyle: React.CSSProperties = {
  objectPosition:
    image.cropPosition ??
    (image.crop === "top" ? "50% 0%" : "50% 50%"),
  width: `${imageZoom * 100}%`,
  height: `${imageZoom * 100}%`,
  left: image.imageShiftX ?? defaultOffset,
  top: image.imageShiftY ?? defaultOffset,
};


  
  if (isSmall) {
    return (
      <button
        type="button"
        onClick={() => onOpen(image.src)}
        className="group flex flex-col overflow-hidden bg-[#b8ad9a] text-left transition duration-500 hover:-translate-y-1"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
  src={image.src}
  alt={image.title}
  loading="lazy"
decoding="async"
  style={imageStyle}
  className="absolute object-cover transition duration-700"
/>

          <div className="absolute inset-0 bg-black/12 transition duration-500 group-hover:bg-black/0" />
        </div>

        <div className="flex min-h-[210px] flex-col justify-between p-6">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-black/45">
              {image.title}
            </p>
            <h3 className="font-serif text-2xl leading-tight text-[#1f1a17]">
              {image.subtitle}
            </h3>
          </div>

          <div>
            <p className="mt-6 text-sm leading-6 text-black/55">
              {image.note}
            </p>
            <p className="mt-8 text-xs uppercase tracking-[0.25em] text-black/40 transition group-hover:text-black">
              Open image
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(image.src)}
      className={`group relative block overflow-hidden bg-[#b8ad9a] text-left transition duration-500 hover:-translate-y-1 ${
        isLarge ? "md:col-span-2" : ""
      } ${isWide ? "md:col-span-2" : ""}`}
    >
      <div
        className={`relative w-full overflow-hidden ${
          isWide ? "aspect-[16/9]" : "aspect-[4/3]"
        }`}
      >
      <img
  src={image.src}
  alt={image.title}
  style={{
    objectPosition: image.cropPosition,
    transform:
      image.imageZoom || image.imageShiftX || image.imageShiftY
        ? `translate(${image.imageShiftX ?? "0%"}, ${
            image.imageShiftY ?? "0%"
          }) scale(${image.imageZoom ?? 1})`
        : undefined,
  }}
  className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105 ${
    image.cropPosition
      ? ""
      : image.crop === "top"
        ? "object-top"
        : "object-center"
  }`}
/>

        <div className="absolute inset-0 bg-black/30 transition duration-500 group-hover:bg-black/18" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-white/70">
            {image.title}
          </p>

          <h3 className="font-serif text-2xl md:text-3xl">
            {image.subtitle}
          </h3>

          <p className="mt-6 max-w-xl text-sm leading-6 text-white/70">
            {image.note}
          </p>

          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-white/60 transition group-hover:text-white">
            Open image
          </p>
        </div>
      </div>
    </button>
  );
}