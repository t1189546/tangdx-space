const items = [
  "Patagonia",
  "Belize",
  "Diving",
  "Hotels",
  "Airports",
  "Game Worlds",
  "Screenshots",
  "Objects",
];

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#1f1a17]">
      <header className="border-b border-black/10 px-6 py-6 md:px-12">
        <nav className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="font-serif text-xl">
            Tang&apos;s Imaginary Space
          </a>

          <a
            href="/"
            className="text-xs uppercase tracking-[0.25em] text-black/50 transition hover:text-black"
          >
            Back Home
          </a>
        </nav>
      </header>

      <section className="px-6 py-28 md:px-12 lg:py-36">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-xs uppercase tracking-[0.4em] text-black/45">
            Gallery
          </p>

          <h1 className="max-w-5xl font-serif text-5xl leading-tight md:text-7xl">
            Images before words.
          </h1>

          <p className="mt-10 max-w-3xl text-lg leading-9 text-black/60">
            This page will become a visual gallery for travel photos, game
            screenshots, landscapes, objects, rooms, places, and small visual
            fragments.
          </p>

          <div className="mt-20 grid gap-4 md:grid-cols-4">
            {items.map((item, index) => (
              <div
                key={item}
                className={`flex h-72 items-end border border-black/10 p-5 ${
                  index % 3 === 0
                    ? "bg-[#d8c7aa]"
                    : index % 3 === 1
                      ? "bg-[#b8ad9a]"
                      : "bg-[#8f8778]"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.25em] text-white/80">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
