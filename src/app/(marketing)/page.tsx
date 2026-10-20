import Image from "next/image";
import Link from "next/link";
import FeatureMarquee from "./feature-marquee";
import PackageButton from "./package-button";
import PackageDropdown from "./package-dropdown";

const values = [
  ["Vernieuwing", "Theorie leren zoals het nu hoort: fris, digitaal en zonder stoffige boeken."],
  ["Begrip", "Je leert niet alleen antwoorden, maar snapt waarom het zo is."],
  ["Vooruitgang", "Zie per oefenexamen en foutenanalyse precies waar je groeit."],
  ["Vertrouwen", "Oefen onder echte CBR-omstandigheden en loop zelfverzekerd binnen."],
  ["Toegankelijkheid", "Overal beschikbaar: op je telefoon, tablet of laptop."],
];

type PackageFeature = {
  label: string;
  highlight?: "jade" | "lime";
  detail?: string;
};

type TheoryPackage = {
  id: string;
  name: string;
  desc: string;
  price: string;
  featured?: boolean;
  items: PackageFeature[];
};

const packages: TheoryPackage[] = [
  {
    id: "pakket-start",
    name: "Start",
    desc: "Een sterke basis voor je theorie-examen.",
    price: "€29,99",
    items: [
      { label: "7 dagen" },
      { label: "3 oefenexamens", detail: "250 vragen" },
      { label: "Videocursus" },
      { label: "ADAS" },
      { label: "Cheat Sheet" },
    ],
  },
  {
    id: "pakket-max",
    name: "Max",
    desc: "Alles in huis voor een complete voorbereiding.",
    price: "€44,99",
    featured: true,
    items: [
      { label: "1 maand" },
      { label: "10 oefenexamens", detail: "500 vragen" },
      { label: "Videocursus" },
      { label: "ADAS" },
      { label: "Cheat Sheet" },
      { label: "1 x pauzeren" },
      { label: "Adaptive", highlight: "lime" },
      { label: "Flashcards", highlight: "lime" },
    ],
  },
  {
    id: "pakket-boost",
    name: "Boost",
    desc: "Extra oefenen en leren op jouw tempo.",
    price: "€39,99",
    items: [
      { label: "14 dagen" },
      { label: "8 oefenexamens", detail: "400 vragen" },
      { label: "Videocursus" },
      { label: "ADAS" },
      { label: "Cheat Sheet" },
      { label: "1 x pauzeren" },
      { label: "Adaptive", highlight: "jade" },
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-ink text-paper">
      {/* HERO */}
      <section className="hero-fade relative overflow-visible">
        <nav className="relative z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-4 px-4 py-6 sm:px-10 lg:px-16 xl:px-24 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link href="/">
            <Image src="/brand/logo.png" alt="TheoriePlug" width={582} height={61} priority className="h-7 sm:h-8 lg:h-9 w-auto" />
          </Link>
          <div className="col-span-2 row-start-2 flex flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:gap-x-3 md:col-span-1 md:col-start-2 md:row-start-auto md:gap-x-2">
            <Link href="#contact" className="rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl">
              Contact
            </Link>
            <Link href="#over-ons" className="rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl">
              Over ons
            </Link>
            <Link
              href="mailto:info@theorieplug.nl?subject=Demo%20aanvragen"
              className="rounded-full px-3 py-2 text-base font-bold transition-colors hover:bg-paper/10 hover:text-lime sm:text-lg lg:px-4 lg:text-xl"
            >
              Demo
            </Link>
            <PackageDropdown packages={packages} />
          </div>
          <Link
            href="/login"
            className="justify-self-end rounded-full border border-paper/30 px-4 py-2 text-base font-bold transition-colors hover:border-lime hover:bg-lime hover:text-ink sm:px-5 sm:text-lg lg:text-xl"
          >
            Inloggen
          </Link>
        </nav>

        <div className="relative px-4 sm:px-10 lg:px-16 xl:px-24 pt-32 pb-16 md:pt-48 md:pb-24">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] max-w-3xl xl:max-w-4xl mb-6">
            Plug je kennis. <span className="text-lime">Own</span> de weg.
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-paper/75 mb-10 max-w-xl lg:max-w-2xl">
            Slaag in één keer voor je autotheorie. Oefen met examens die lijken op het echte CBR.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#pakketten"
              className="bg-lime text-ink px-8 py-4 rounded-full font-bold text-base sm:text-lg lg:text-xl hover:brightness-95 transition"
            >
              Bekijk Demo 
            </Link>
            <Link
              href="/login"
              className="border border-paper/40 px-8 py-4 rounded-full font-bold text-base sm:text-lg lg:text-xl hover:bg-paper/10 transition-colors"
            >
              Ontdek TheoriePlug
            </Link>
          </div>
          <FeatureMarquee />
        </div>
      </section>

      {/* WAARDEN */}
      <section id="over-ons" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl mb-6">
            Waar wij <span className="text-lime">voor staan</span>
          </h2>
          <div className="mb-12 max-w-3xl -rotate-2 bg-lime px-5 py-4 text-center font-display text-xl font-extrabold text-ink shadow-xl sm:px-8 sm:text-2xl lg:text-3xl">
            Plug je kennis. Own de weg.
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(([title, text]) => (
              <div key={title} className="corner-cut bg-lime text-ink p-8 pb-12">
                <h3 className="font-display font-extrabold text-xl lg:text-2xl mb-3">{title}</h3>
                <p className="text-base lg:text-lg font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKKETTEN */}
      <section id="pakketten" className="py-24 bg-paper text-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl mb-4">Kies jouw theoriepakket</h2>
            <p className="text-ink/70 text-lg lg:text-xl">Hoeveel tijd heb je nog tot je examen? Kies het pakket dat bij je past.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((p) => (
              <div
                key={p.name}
                id={p.id}
                className={`rounded-3xl p-7 lg:p-8 flex flex-col relative ${
                  p.featured
                    ? "border-2 border-lime bg-ink text-paper md:-translate-y-4 shadow-[0_0_32px_rgba(204,255,0,0.25),0_25px_60px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-2 hover:shadow-[0_0_48px_rgba(204,255,0,0.42),0_30px_70px_rgba(0,0,0,0.4)] md:hover:-translate-y-6"
                    : "border-2 border-jade/50 bg-ink text-paper transition duration-300 hover:-translate-y-2 hover:border-jade hover:shadow-xl hover:shadow-jade/10"
                }`}
              >
                {p.featured && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-lime px-4 py-1 text-base font-bold tracking-wide text-ink -rotate-3">
                    MEEST GEKOZEN
                  </div>
                )}
                <h3 className="font-display font-extrabold text-2xl lg:text-3xl mb-2">{p.name}</h3>
                <div
                  role="img"
                  className={`relative mb-5 flex aspect-[16/7] items-end overflow-hidden rounded-2xl border ${
                    p.featured
                      ? "border-lime/30 bg-[radial-gradient(ellipse_at_75%_20%,rgba(204,255,0,0.3),transparent_45%),linear-gradient(120deg,#27272a,#18181b_65%)]"
                      : "border-jade/30 bg-[radial-gradient(ellipse_at_75%_20%,rgba(16,185,129,0.3),transparent_45%),linear-gradient(120deg,#27272a,#18181b_65%)]"
                  }`}
                >
                  <span className="absolute -right-6 -top-10 h-32 w-32 rounded-full border border-white/10" />
                  <span className="absolute -right-1 -top-5 h-20 w-20 rounded-full border border-white/10" />
                  <span className="relative m-3 rounded-full border border-white/15 bg-ink/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-paper/65 backdrop-blur-sm">
                  </span>
                </div>
                <p className="mb-6 text-lg text-paper/70">{p.desc}</p>
                <div className={`font-display font-extrabold text-4xl lg:text-5xl mb-6  ${p.featured ? "text-lime" : "text-jade"}`}>
                  {p.price}
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-lg">
                  {p.items.map((item) => (
                    <li key={item.label} className="flex flex-wrap items-center gap-2">
                      <span className="text-jade">✓</span>
                      <span
                        className={
                          item.highlight === "jade"
                            ? "rounded-full border border-jade/40 bg-gradient-to-r from-jade/10 via-jade/20 to-jade/10 px-2.5 py-0.5 font-bold text-jade shadow-[0_0_16px_rgba(16,185,129,0.35)]"
                            : item.highlight === "lime"
                              ? "rounded-full border border-lime/40 bg-gradient-to-r from-lime/10 via-lime/20 to-lime/10 px-2.5 py-0.5 font-bold text-lime shadow-[0_0_16px_rgba(204,255,0,0.3)]"
                              : undefined
                        }
                      >
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="rounded-full border border-jade/40 bg-gradient-to-r from-jade/10 via-jade/20 to-jade/10 px-2.5 py-0.5 text-base font-bold text-jade shadow-[0_0_16px_rgba(16,185,129,0.35)]">
                          {item.detail}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <PackageButton featured={Boolean(p.featured)} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-12 text-center text-paper/60">
        <Image src="/brand/logo.png" alt="TheoriePlug" width={582} height={61} className="h-7 w-auto mx-auto mb-4" />
        <p>info@theorieplug.nl · @theorieplug · www.theorieplug.nl</p>
        <p className="mt-2">© 2026 TheoriePlug. Alle rechten voorbehouden.</p>
      </footer>
    </div>
  );
}
