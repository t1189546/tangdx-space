import SiteHeader from "../../components/SiteHeader";

const chilePlaces = [
  {
    eyebrow: "Torres del Paine",
    title: "Wind, water, and stone",
    description:
      "The national park in Chilean Patagonia: mountains, lakes, routes, shelter, small lives, weather, and light.",
    lastArrived: "May 10, 2026",
    previousVisits: [],
    href: "/real/chile/torres-del-paine",
  },
  {
    eyebrow: "Santiago",
    title: "City, food, and arrival",
    description:
      "Restaurants, streets, city views, first impressions, and the feeling of arriving in Chile.",
    lastArrived: "May 7, 2026",
    previousVisits: ["Jan 6, 2024"],
    href: "#",
  },
  {
    eyebrow: "Atacama Desert",
    title: "Desert, salt, and sky",
    description:
      "Dry light, salt flats, altitude, desert landscapes, night sky, and distance.",
    lastArrived: "Jan 4, 2024",
    previousVisits: [],
    href: "#",
  },
];

export default function ChilePage() {
  return (
    <main className="min-h-screen bg-[#f4f0e8] text-[#1f1a17]">
      <SiteHeader />

      <section className="px-6 pb-28 pt-40 md:px-12 lg:pb-36 lg:pt-48">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-xs uppercase tracking-[0.4em] text-black/45">
            The Real Part / Chile
          </p>

          <h1 className="max-w-5xl font-serif text-5xl leading-tight md:text-7xl">
  Chile, from dry light to southern wind.
</h1>

<p className="mt-10 max-w-3xl text-lg leading-9 text-black/60">
  Desert, city, mountain, road, shelter, and the quiet distance between them.
</p>
        </div>
      </section>

      <section className="px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-xs uppercase tracking-[0.35em] text-black/35">
            Places
          </p>

          <div className="grid items-stretch gap-6 md:grid-cols-3">
            {chilePlaces.map((place, index) => {
              const isAvailable = place.href !== "#";

              const card = (
                <article className="group flex h-full min-h-[430px] flex-col border border-black/10 bg-white/45 p-7 transition duration-500 hover:-translate-y-1 hover:bg-white">
                  <div>
                    <div className="mb-16 flex items-start justify-between gap-6">
                      <p className="text-xs uppercase tracking-[0.25em] text-black/35">
                        {place.eyebrow}
                      </p>

                      <p className="text-xs uppercase tracking-[0.25em] text-black/25">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>

                    <h2 className="font-serif text-3xl">{place.title}</h2>

                    <p className="mt-5 leading-7 text-black/55">
                      {place.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-10">
                    <div className="border-t border-black/10 pt-6">
                      <p className="text-xs uppercase tracking-[0.25em] text-black/35">
                        Last arrived
                      </p>

                      <p className="mt-3 font-serif text-2xl text-black/80">
                        {place.lastArrived}
                      </p>

                      {place.previousVisits.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {place.previousVisits.map((date) => (
                            <p
                              key={date}
                              className="text-sm leading-6 text-black/45"
                            >
                              {date}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <p
                      className={`mt-8 text-xs uppercase tracking-[0.25em] transition ${
                        isAvailable
                          ? "text-black/40 group-hover:text-black"
                          : "text-black/25"
                      }`}
                    >
                      {isAvailable ? "Open page" : "Future page"}
                    </p>
                  </div>
                </article>
              );

              if (isAvailable) {
                return (
                  <a key={place.eyebrow} href={place.href} className="block h-full">
                    {card}
                  </a>
                );
              }

              return (
                <div key={place.eyebrow} className="h-full">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 px-6 py-20 md:px-12 lg:py-24">
  <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="mb-4 text-xs uppercase tracking-[0.35em] text-black/35">
        Real / Chile
      </p>
      <h2 className="font-serif text-3xl leading-tight md:text-4xl">
        More places, roads, and light to return to.
      </h2>
    </div>

    <a
      href="/real"
      className="w-fit border border-black/15 px-8 py-3 text-xs uppercase tracking-[0.25em] text-black/50 transition hover:bg-black hover:text-white"
    >
      Back to Real
    </a>
  </div>
</section>
    </main>
  );
}