const realRegions = [
  {
    title: "Americas",
    subtitle: "North, Central, and South America.",
    places: [
      {
        label: "Canada",
        title: "Canada",
        description: "Cities, winters, universities.",
        href: "#",
        status: "Future page",
      },
      {
        label: "Chile",
        title: "Chile",
        description: "Desert, mountains, Patagonia.",
        href: "/real/chile",
        status: "Open Chile",
      },
      {
        label: "Belize",
        title: "Belize",
        description: "Coral, Caribbean Sea, Maya ruins.",
        href: "#",
        status: "Future page",
      },
    ],
  },
];

export default function RealPage() {
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#1f1a17]">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#8b867d]/75 px-6 py-5 text-white backdrop-blur-md md:px-12">
  <nav className="mx-auto flex max-w-7xl items-center justify-between">
    <a href="/" className="font-serif text-xl tracking-[-0.02em]">
      Tang&apos;s Space
    </a>

    <div className="flex items-center gap-7 text-xs uppercase tracking-[0.3em] text-white/75">
      <a href="/real" className="transition hover:text-white">
        Real
      </a>
      <a href="/imaginary" className="transition hover:text-white">
        Imaginary
      </a>
      <a href="/#about" className="transition hover:text-white">
        About
      </a>
    </div>
  </nav>
</header>

      <section className="px-6 pb-28 pt-40 md:px-12 lg:pb-36 lg:pt-48">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-xs uppercase tracking-[0.4em] text-black/45">
            The Real Part
          </p>

          <h1 className="max-w-5xl font-serif text-5xl leading-tight md:text-7xl">
            Records from the physical world.
          </h1>

          <p className="mt-10 max-w-3xl text-lg leading-9 text-black/60">
            Places, routes, and traces of being there.
          </p>
        </div>
      </section>

      <section className="px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-xs uppercase tracking-[0.35em] text-black/35">
            Region
          </p>

          <div className="space-y-20">
            {realRegions.map((region) => (
              <section key={region.title}>
                <div className="mb-8 grid gap-6 md:grid-cols-[0.65fr_1.35fr] md:items-end">
                  <div>
                    <h2 className="font-serif text-4xl leading-tight md:text-5xl">
                      {region.title}
                    </h2>
                  </div>

                  <p className="max-w-2xl text-lg leading-8 text-black/55">
                    {region.subtitle}
                  </p>
                </div>

                <div className="grid items-stretch gap-6 md:grid-cols-3">
                  {region.places.map((place, index) => {
                    const isAvailable = place.href !== "#";

                    const card = (
                      <article className="group flex h-full min-h-[340px] flex-col border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white">
                        <div>
                          <div className="mb-16 flex items-start justify-between gap-6">
                            <p className="text-xs uppercase tracking-[0.25em] text-black/35">
                              {place.label}
                            </p>

                            <p className="text-xs uppercase tracking-[0.25em] text-black/25">
                              {String(index + 1).padStart(2, "0")}
                            </p>
                          </div>

                          <h3 className="font-serif text-3xl">{place.title}</h3>

                          <p className="mt-5 leading-7 text-black/55">
                            {place.description}
                          </p>
                        </div>

                        <p
                          className={`mt-auto pt-10 text-xs uppercase tracking-[0.25em] transition ${
                            isAvailable
                              ? "text-black/40 group-hover:text-black"
                              : "text-black/25"
                          }`}
                        >
                          {place.status}
                        </p>
                      </article>
                    );

                    if (isAvailable) {
                      return (
                        <a
                          key={place.title}
                          href={place.href}
                          className="block h-full"
                        >
                          {card}
                        </a>
                      );
                    }

                    return (
                      <div key={place.title} className="h-full">
                        {card}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#b8b1a5] px-6 py-28 text-white md:px-12 lg:py-36">
  <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.8fr_1.2fr]">
    <div>
      <p className="mb-5 text-xs uppercase tracking-[0.35em] text-white/45">
        The Real Part
      </p>

      <h2 className="font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">
        Things that exist,
        <br />
        somewhere.
      </h2>
    </div>

    <div className="text-lg leading-9 text-white/75">
      <p>
        Earth, water, mountains, skies, departures, returns, and the occasional
        distance beyond Earth.
      </p>

      <a
        href="/"
        className="mt-10 inline-block border border-white/35 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white/75 transition hover:bg-white hover:text-[#1f1a17]"
      >
        Back to Home
      </a>
    </div>
  </div>
</section>
    </main>
  );
}