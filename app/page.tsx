import SiteHeader from "./components/SiteHeader";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main className="h-screen overflow-y-scroll scroll-smooth snap-y snap-mandatory bg-[#f4f0e8] text-[#1f1a17]">
        <section className="relative flex min-h-screen snap-start snap-always items-center justify-center overflow-hidden px-6 text-center text-white md:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#d8c7aa_0%,#f4f0e8_42%,#8f8778_100%)]" />
          <div className="absolute inset-0 bg-[#1f1a17]/20" />

          <div className="relative z-10 mx-auto max-w-6xl pt-24">
            <p className="animate-soft-fade-up mb-8 text-xs uppercase tracking-[0.45em] text-white/80">
              Real Part / Imaginary Part / Personal Archive
            </p>

            <h1 className="animate-soft-fade-up animate-delay-1 font-serif text-6xl leading-[0.9] tracking-[-0.05em] md:text-8xl lg:text-9xl">
              Tang&apos;s
              <br />
              Space
            </h1>

            <p className="animate-soft-fade-up animate-delay-2 mx-auto mt-10 max-w-2xl text-lg leading-8 text-white/85 md:text-xl">
              A personal archive of real journeys, imaginary worlds, images,
              memories, and fragments of thought.
            </p>

            <div className="animate-soft-fade-up animate-delay-3 mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
  <a
    href="/real"
    className="flex w-[340px] justify-center border border-white/45 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white hover:text-[#1f1a17]"
  >
    <span className="whitespace-nowrap">Enter Real Part</span>
  </a>

  <a
    href="/imaginary"
    className="flex w-[340px] justify-center border border-white/45 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white hover:text-[#1f1a17]"
  >
    <span className="whitespace-nowrap">Enter Imaginary Part</span>
  </a>
</div>
          </div>

          <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.35em] text-white/60">
            Scroll
          </div>
        </section>

        <section className="grid min-h-screen snap-start snap-always md:grid-cols-2">
  <div className="flex min-h-screen items-center bg-[#f4f0e8] px-6 py-28 text-[#1f1a17] md:px-12 lg:px-20">
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-8 text-xs uppercase tracking-[0.4em] text-black/40">
        01 / The Real Part
      </p>

      <h2 className="font-serif text-5xl leading-tight tracking-[-0.04em] md:text-6xl lg:text-7xl">
        <span className="block whitespace-nowrap">Real places,</span>
        <span className="block whitespace-nowrap">slowly observed.</span>
      </h2>

      <p className="mt-10 text-xl leading-9 text-black/60">
        Fragments from the physical world.
      </p>

      <a
  href="/real"
  className="mt-10 flex w-[340px] justify-center border border-[#4a4138]/25 bg-[#f4f0e8] px-8 py-3 text-xs uppercase tracking-[0.25em] text-[#4a4138] transition hover:bg-[#4a4138] hover:text-[#f4f0e8]"
>
  <span className="whitespace-nowrap">Enter Real Part</span>
</a>
    </div>
  </div>

  <div className="flex min-h-screen items-center bg-[#4a4138] px-6 py-28 text-[#f4f0e8] md:px-12 lg:px-20">
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-8 text-xs uppercase tracking-[0.4em] text-white/40">
        02 / The Imaginary Part
      </p>

      <h2 className="font-serif text-5xl leading-tight tracking-[-0.04em] md:text-6xl lg:text-7xl">
        <span className="block whitespace-nowrap">Imagined worlds,</span>
        <span className="block whitespace-nowrap">quietly kept.</span>
      </h2>

      <p className="mt-10 text-xl leading-9 text-white/65">
        Some thoughts that stay.
      </p>

      <a
  href="/imaginary"
  className="mt-10 flex w-[340px] justify-center border border-[#f4f0e8]/25 bg-[#4a4138] px-8 py-3 text-xs uppercase tracking-[0.25em] text-[#f4f0e8]/75 transition hover:bg-[#f4f0e8] hover:text-[#4a4138]"
>
  <span className="whitespace-nowrap">Enter Imaginary Part</span>
</a>
    </div>
  </div>
</section>

        <section
          id="about"
          className="flex min-h-screen snap-start snap-always flex-col bg-[#b8b1a5] text-white"
        >
          <div className="flex flex-1 items-center px-6 py-28 md:px-12 lg:py-36">
            <div className="mx-auto grid max-w-7xl gap-16 md:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="mb-6 text-xs uppercase tracking-[0.4em] text-white/55">
                  03 / About
                </p>

                <h2 className="font-serif text-5xl leading-tight tracking-[-0.04em] md:text-7xl">
                  A personal space for two kinds of memory.
                </h2>
              </div>

              <div className="max-w-2xl text-lg leading-9 text-white/80">
                <p>
                  Tang&apos;s Space is a personal homepage divided into two
                  parts: the Real Part for journeys and fragments from the
                  physical world; and the Imaginary Part for fictional worlds
                  and invisible thoughts.
                </p>

                <p className="mt-8">
                  A more formal homepage for academic and professional work
                  will live separately at tangdx.com(not yet completed).
                </p>

                <a
                  href="https://www.tangdx.com"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-10 inline-block border border-white/35 px-8 py-3 text-xs uppercase tracking-[0.25em] text-white/75 transition hover:bg-white hover:text-[#1f1a17]"
                >
                  Visit tangdx.com
                </a>
              </div>
            </div>
          </div>

          <footer className="border-t border-white/15 px-6 py-8 md:px-12">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs uppercase tracking-[0.3em] text-white/55 md:flex-row md:items-center md:justify-between">
              <p>Tang&apos;s Space</p>
              <p>Designed by Dongxian Tang</p>
              <p>tangdx.space</p>
            </div>
          </footer>
        </section>
      </main>
    </>
  );
}