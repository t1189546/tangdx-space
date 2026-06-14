export default function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#8b867d]/70 px-6 py-5 text-white backdrop-blur-md md:px-12">
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
  );
}