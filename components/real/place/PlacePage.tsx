"use client";

import { useMemo, useState } from "react";
import SiteHeader from "@/app/components/SiteHeader";
import Lightbox from "./Lightbox";
import VisualSectionComponent from "./VisualSection";
import type {
  LightboxImage,
  PlaceMedia,
  PlacePageContent,
  VisualImage,
} from "./types";

type PlacePageProps = {
  content: PlacePageContent;
  media: PlaceMedia;
};

function getLightboxImages(media: PlaceMedia): LightboxImage[] {
  return [
    media.heroImage,
    ...media.visualSections.flatMap((section) =>
      section.items.filter((item): item is VisualImage => item.kind === "image"),
    ),
  ];
}

export default function PlacePage({ content, media }: PlacePageProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const lightboxImages = useMemo(() => getLightboxImages(media), [media]);

  function openLightboxBySrc(src: string) {
    const imageIndex = lightboxImages.findIndex((image) => image.src === src);

    if (imageIndex === -1) {
      return;
    }

    setSelectedIndex(imageIndex);
  }

  function openHeroImage() {
    setSelectedIndex(0);
  }

  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#1f1a17]">
      <SiteHeader />

      <section className="relative mt-[80px] flex h-[calc(100vh-80px)] items-center overflow-hidden px-6 md:px-12">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url('${media.heroImage.src}')`,
            backgroundPosition: content.hero.backgroundPosition ?? "center",
          }}
        />
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 mx-auto w-full max-w-[1420px] text-white">
          <p className="mb-6 text-xs uppercase tracking-[0.45em] text-white/70">
            {content.hero.eyebrow}
          </p>

          <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] md:text-[5.25rem]">
            {content.hero.titleLines.map((line, index) => (
              <span key={`${line}-${index}`}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-10 max-w-3xl text-lg leading-9 text-white/70">
            {content.hero.description}
          </p>

          <button
            type="button"
            onClick={openHeroImage}
            className="mt-10 border border-white/35 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white/75 transition hover:bg-white hover:text-[#1f1a17]"
          >
            {content.hero.imageButtonLabel ?? "View full image"}
          </button>
        </div>
      </section>

      <section className="px-6 py-28 md:px-12 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-black/45">
              {content.intro.eyebrow}
            </p>
            <h2 className="font-serif text-4xl leading-tight md:text-6xl">
              {content.intro.title}
            </h2>
          </div>

          <div className="text-lg leading-9 text-black/60">
            {content.intro.paragraphs.map((paragraph, index) => (
              <p
                key={`${paragraph}-${index}`}
                className={index > 0 ? "mt-8" : undefined}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
          {media.visualSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white"
            >
              <p className="mb-16 text-xs uppercase tracking-[0.25em] text-black/35">
                {section.number}
              </p>
              <h2 className="font-serif text-2xl">{section.title}</h2>
            </a>
          ))}
        </div>
      </section>

      {media.visualSections.map((section) => (
        <VisualSectionComponent
          key={section.id}
          section={section}
          onOpenImage={openLightboxBySrc}
        />
      ))}

      <section className="bg-[#b8b1a5] px-6 py-28 text-white md:px-12 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-white/45">
              {content.outro.eyebrow}
            </p>

            <h2 className="font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">
              {content.outro.titleLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  {index > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </h2>
          </div>

          <div className="text-lg leading-9 text-white/75">
            <p>{content.outro.body}</p>

            <a
              href={content.outro.link.href}
              className="mt-10 inline-block border border-white/35 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white/75 transition hover:bg-white hover:text-[#1f1a17]"
            >
              {content.outro.link.label}
            </a>
          </div>
        </div>
      </section>

      <Lightbox
        images={lightboxImages}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
      />
    </main>
  );
}
