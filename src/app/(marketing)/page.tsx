import Image from "next/image";
import Link from "next/link";

const values = [
  ["Vernieuwing", "Theorie leren zoals het nu hoort: fris, digitaal en zonder stoffige boeken."],
  ["Begrip", "Je leert niet alleen antwoorden, maar snapt waarom het zo is."],
  ["Vooruitgang", "Zie per oefenexamen en foutenanalyse precies waar je groeit."],
  ["Vertrouwen", "Oefen onder echte CBR-omstandigheden en loop zelfverzekerd binnen."],
  ["Toegankelijkheid", "Overal beschikbaar: op je telefoon, tablet of laptop."],
];

const packages = [
  {
    name: "3 Dagen",
    desc: "Even snel opfrissen vlak voor je examen.",
    price: "€14,99",
    items: ["Alle theoriestof", "20 CBR oefenexamens", "Werkt op mobiel & PC"],
  },
  {
    name: "1 Week",
    desc: "De perfecte voorbereiding zonder stress.",
    price: "€19,99",
    featured: true,
    items: ["Alles uit het 3-dagen pakket", "50 CBR oefenexamens", "Foutenanalyse & inzicht", "Voorrang bij support"],
  },
  {
    name: "1 Maand",
    desc: "Neem ruim de tijd om alles te leren.",
    price: "€29,99",
    items: ["Alle theoriestof", "Onbeperkt oefenexamens", "Uitgebreide statistieken"],
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-ink text-paper">
      <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
        <Image src="/brand/sticker-car.png" alt="" width={496} height={403} style={{ transform: "translate(-50%, -50%) rotate(-18deg)" }} className="absolute left-[9%] top-[190px] w-56 drop-shadow-xl" />
        <Image src="/brand/sticker-succes.png" alt="" width={296} height={190} style={{ transform: "translate(-50%, -50%) rotate(16deg)" }} className="absolute left-[70%] top-[455px] w-32" />
        <Image src="/brand/sticker-warning.png" alt="" width={323} height={312} style={{ transform: "translate(-50%, -50%) rotate(-12deg)" }} className="absolute left-[13%] top-[715px] w-36" />
        <Image src="/brand/sticker-badge.png" alt="" width={363} height={263} style={{ transform: "translate(-50%, -50%) rotate(14deg)" }} className="absolute left-[92%] top-[735px] w-28" />
      </div>
      {/* HERO */}
      <section className="hero-fade relative overflow-hidden">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link href="/">
            <Image src="/brand/logo.png" alt="TheoriePlug" width={582} height={61} priority className="h-6 sm:h-7 w-auto" />
          </Link>
          <Link
            href="/login"
            className="border border-paper/30 px-5 py-2 rounded-full font-bold hover:bg-paper/10 transition-colors"
          >
            Inloggen
          </Link>
        </nav>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-40 md:pt-28 md:pb-52">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] max-w-3xl mb-6">
            Plug je kennis. <span className="text-lime">Own</span> de weg.
          </h1>
          <p className="text-xl text-paper/75 mb-10 max-w-xl">
            Slaag in één keer voor je autotheorie. Oefen met examens die lijken op het echte CBR, inclusief
            gevaarherkenning met de officiële 8-seconden timer.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="#pakketten"
              className="bg-lime text-ink px-8 py-4 rounded-full font-bold text-lg hover:brightness-95 transition"
            >
              Bekijk theoriepakketten
            </Link>
            <Link
              href="/login"
              className="border border-paper/40 px-8 py-4 rounded-full font-bold text-lg hover:bg-paper/10 transition-colors"
            >
              Inloggen
            </Link>
          </div>
        </div>
      </section>

      {/* SLOGAN BLOK */}
      <div className="relative z-10 -mt-16 px-4">
        <div className="relative max-w-3xl mx-auto bg-lime text-ink -rotate-2 px-8 py-6 text-center font-display font-extrabold text-xl md:text-3xl shadow-xl">
          Plug je kennis. Own de weg.
        </div>
      </div>

      {/* WAARDEN */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl mb-12">
            Waar wij <span className="text-lime">voor staan</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(([title, text]) => (
              <div key={title} className="corner-cut bg-lime text-ink p-8 pb-12">
                <h3 className="font-display font-extrabold text-lg mb-3">{title}</h3>
                <p className="font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAKKETTEN */}
      <section id="pakketten" className="py-24 bg-paper text-ink">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl mb-4">Kies jouw theoriepakket</h2>
            <p className="text-ink/70 text-lg">Hoeveel tijd heb je nog tot je examen? Kies het pakket dat bij je past.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {packages.map((p) => (
              <div
                key={p.name}
                className={`rounded-3xl p-8 flex flex-col relative ${
                  p.featured
                    ? "bg-ink text-paper md:-translate-y-4 shadow-2xl"
                    : "bg-white border border-ink/10"
                }`}
              >
                {p.featured && (
                  <div className="absolute top-0 left-8 -translate-y-1/2 bg-lime text-ink px-4 py-1 rounded-full text-sm font-bold tracking-wide -rotate-3">
                    MEEST GEKOZEN
                  </div>
                )}
                <h3 className="font-display font-extrabold text-2xl mb-2">{p.name}</h3>
                <p className={`mb-6 ${p.featured ? "text-paper/70" : "text-ink/60"}`}>{p.desc}</p>
                <div className={`font-display font-extrabold text-4xl mb-6 ${p.featured ? "text-lime" : "text-emerald"}`}>
                  {p.price}
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className={p.featured ? "text-jade" : "text-emerald"}>✓</span>
                      {i}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-4 rounded-full font-bold transition ${
                    p.featured ? "bg-lime text-ink hover:brightness-95" : "bg-ink text-paper hover:bg-ink/85"
                  }`}
                >
                  Kies dit pakket
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 text-center text-paper/60">
        <Image src="/brand/logo.png" alt="TheoriePlug" width={582} height={61} className="h-7 w-auto mx-auto mb-4" />
        <p>info@theorieplug.nl · @theorieplug · www.theorieplug.nl</p>
        <p className="mt-2">© 2026 TheoriePlug. Alle rechten voorbehouden.</p>
      </footer>
    </div>
  );
}
