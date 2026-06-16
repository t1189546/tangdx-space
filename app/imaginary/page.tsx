import SiteHeader from "../components/SiteHeader";

const imaginarySections = [
  {
    label: "Games",
    title: "Games",
    description: "Worlds, atmosphere, screenshots.",
    href: "#",
    status: "Future page",
  },
  {
    label: "Coffee",
    title: "Coffee",
    description: "Cafés, beans, cups, small rituals.",
    href: "#",
    status: "Future page",
  },
  {
    label: "Life",
    title: "Life",
    description: "Rooms, notes, days, quiet fragments.",
    href: "#",
    status: "Future page",
  },
];

export default function ImaginaryPage() {
  return (
    <main className="min-h-screen bg-[#4a4138] text-[#f4f0e8]">
      <SiteHeader />

      <section className="px-6 pb-28 pt-40 md:px-12 lg:pb-36 lg:pt-48">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-xs uppercase tracking-[0.4em] text-white/45">
            The Imaginary Part
          </p>

          <h1 className="max-w-5xl font-serif text-5xl leading-tight tracking-[-0.04em] md:text-7xl">
            Records from the imagined world.
          </h1>

          <p className="mt-10 max-w-3xl text-lg leading-9 text-white/60">
            Games, coffee, life, and small fragments of thought.
          </p>
        </div>
      </section>

      <section className="px-6 pb-28 md:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-xs uppercase tracking-[0.35em] text-white/35">
            Sections
          </p>

          <div className="grid items-stretch gap-6 md:grid-cols-3">
            {imaginarySections.map((section, index) => {
              const isAvailable = section.href !== "#";

              const card = (
                <article className="group flex h-full min-h-[340px] flex-col border border-white/10 bg-white/[0.035] p-7 transition duration-500 hover:-translate-y-1 hover:bg-white/[0.07]">
                  <div>
                    <div className="mb-16 flex items-start justify-between gap-6">
                      <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                        {section.label}
                      </p>

                      <p className="text-xs uppercase tracking-[0.25em] text-white/25">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                    </div>

                    <h2 className="font-serif text-3xl">{section.title}</h2>

                    <p className="mt-5 leading-7 text-white/55">
                      {section.description}
                    </p>
                  </div>

                  <p
                    className={`mt-auto pt-10 text-xs uppercase tracking-[0.25em] transition ${
                      isAvailable
                        ? "text-white/45 group-hover:text-white"
                        : "text-white/25"
                    }`}
                  >
                    {section.status}
                  </p>
                </article>
              );

              if (isAvailable) {
                return (
                  <a
                    key={section.title}
                    href={section.href}
                    className="block h-full"
                  >
                    {card}
                  </a>
                );
              }

              return (
                <div key={section.title} className="h-full">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#b8b1a5] px-6 py-28 text-white md:px-12 lg:py-36">
        <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-white/45">
              The Imaginary Part
            </p>

            <h2 className="font-serif text-4xl leading-tight tracking-[-0.04em] md:text-6xl">
              Imagined worlds,
              <br />
              quietly kept.
            </h2>
          </div>

          <div className="text-lg leading-9 text-white/75">
            <p>
              Games, fictional spaces, coffee notes, daily fragments, and
              thoughts that belong more to atmosphere.
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