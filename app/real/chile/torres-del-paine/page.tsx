"use client";

import SiteHeader from "../../../components/SiteHeader";
import { useState } from "react";
import { heroImage, lightboxImages, visualSections } from "./data";
import Lightbox from "./Lightbox";
import VisualSectionComponent from "./VisualSection";

export default function TorresDelPainePage() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
    backgroundImage: `url('${heroImage.src}')`,
    backgroundPosition: "center 42%",
  }}
/>
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 mx-auto w-full max-w-[1420px] text-white">
          <p className="mb-6 text-xs uppercase tracking-[0.45em] text-white/70">
            The Real Part / Chilean Patagonia
          </p>

          <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] md:text-[5.25rem]">
            Torres
            <br />
            del Paine
          </h1>

          <p className="mt-10 max-w-3xl text-lg leading-9 text-white/70">
            A page for the mountains, wind, lakes, trails, rooms, weather, and
            remote light of Torres del Paine National Park in Chilean
            Patagonia.
          </p>

          <button
            type="button"
            onClick={openHeroImage}
            className="mt-10 border border-white/35 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white/75 transition hover:bg-white hover:text-[#1f1a17]"
          >
            View full image
          </button>
        </div>
      </section>

      <section className="px-6 py-28 md:px-12 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-black/45">
              Place
            </p>
            <h2 className="font-serif text-4xl leading-tight md:text-6xl">
              At the southern edge of scale.
            </h2>
          </div>

          <div className="text-lg leading-9 text-black/60">
            <p>
              Torres del Paine belongs to Chilean Patagonia: a place of granite
              towers, fast weather, glacial water, open roads, and a landscape
              that feels larger than the body moving through it.
            </p>

            <p className="mt-8">
              This page is meant to hold the visual and emotional fragments of
              that place: not just a list of photos, but a quiet record of
              arriving, walking, looking, resting, and remembering.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
          <a
  href="#mountains-and-lakes"
  className="border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white"
>
  <p className="mb-16 text-xs uppercase tracking-[0.25em] text-black/35">
    01
  </p>
  <h2 className="font-serif text-2xl">Mountains & Lakes</h2>
</a>

<a
  href="#routes-and-movement"
  className="border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white"
>
  <p className="mb-16 text-xs uppercase tracking-[0.25em] text-black/35">
    02
  </p>
  <h2 className="font-serif text-2xl">Routes & Movement</h2>
</a>

<a
  href="#nature-studies"
  className="border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white"
>
  <p className="mb-16 text-xs uppercase tracking-[0.25em] text-black/35">
    03
  </p>
  <h2 className="font-serif text-2xl">Nature Studies</h2>
</a>

<a
  href="#shelter"
  className="border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white"
>
  <p className="mb-16 text-xs uppercase tracking-[0.25em] text-black/35">
    04
  </p>
  <h2 className="font-serif text-2xl">Shelter</h2>
</a>

<a
  href="#weather-and-light"
  className="border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white"
>
  <p className="mb-16 text-xs uppercase tracking-[0.25em] text-black/35">
    05
  </p>
  <h2 className="font-serif text-2xl">Weather & Light</h2>
</a>
        </div>
      </section>

      {visualSections.map((section) => (
  <VisualSectionComponent
    key={section.title}
    section={section}
    onOpenImage={openLightboxBySrc}
  />
))}

     <section className="bg-[#b8b1a5] px-6 py-28 text-white md:px-12 lg:py-36">
  <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.8fr_1.2fr]">
    <div>
      <p className="mb-5 text-xs uppercase tracking-[0.35em] text-white/45">
        Torres del Paine / Chilean Patagonia
      </p>

      <h2 className="font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">
        Wind, water, stone,
        <br />
        and the last light.
      </h2>
    </div>

    <div className="text-lg leading-9 text-white/75">
      <p>
        Granite towers, glacial lakes, horse trails, rooms after weather, and
        clouds moving faster than memory.
      </p>

      <a
        href="/real/chile"
        className="mt-10 inline-block border border-white/35 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white/75 transition hover:bg-white hover:text-[#1f1a17]"
      >
        Back to Chile
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