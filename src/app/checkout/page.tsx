import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice, getPackage } from "../../lib/packages";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = {
  title: "Afrekenen — TheoriePlug",
  robots: { index: false, follow: false },
};

export const instant = false;

// Pakketbanners: zet een bestand in public/brand/pakketten/<slug>.(png|jpg|webp) en het verschijnt vanzelf.
function findBanner(slug: string): string | null {
  for (const ext of ["png", "jpg", "jpeg", "webp", "svg"]) {
    if (existsSync(path.join(process.cwd(), "public", "brand", "pakketten", `${slug}.${ext}`))) {
      return `/brand/pakketten/${slug}.${ext}`;
    }
  }
  return null;
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ pakket?: string }> }) {
  const { pakket } = await searchParams;
  const pkg = getPackage(pakket);
  if (!pkg) redirect("/#pakketten");

  const perDay = formatPrice(Math.round(pkg.priceCents / pkg.durationDays));
  const banner = findBanner(pkg.slug);

  return (
    <main className="auth-bg min-h-screen px-4 pb-16 pt-6 text-paper sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" aria-label="Naar de homepage">
          <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-7 w-auto sm:h-8" />
        </Link>
        <Link href="/#pakketten" className="group flex items-center gap-2 font-display text-xl font-black uppercase tracking-wide text-paper/70 transition-colors hover:text-lime">
          <Image
            src="/brand/png/svg/sticker-pijl.svg"
            alt=""
            width={128}
            height={128}
            className="h-14 w-14 -scale-x-100 -rotate-8 transition-transform group-hover:-translate-x-1 group-hover:-scale-x-100 group-hover:-rotate-12"
          />
          Terug
        </Link>
      </header>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:mt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        {/* PAKKET */}
        <section aria-label="Jouw pakket" className="relative">
          {pkg.featured && (
            <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-lime px-4 py-1 text-sm font-bold text-ink shadow-lg">
              MEEST GEKOZEN
            </span>
          )}
          <div className="overflow-hidden rounded-3xl border border-lime/25 bg-surface shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
            {banner && (
              <div className="relative h-44 w-full sm:h-52">
                <Image src={banner} alt="" fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-widest text-jade">Jouw pakket</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-3xl font-black uppercase tracking-wider sm:text-4xl">{pkg.name}</h1>
                  <p className="mt-1 font-semibold text-paper/70">{pkg.durationLabel} toegang</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-black text-lime sm:text-4xl">{formatPrice(pkg.priceCents)}</p>
                  
                </div>
              </div>
              <p className="mt-4 text-paper/60">{pkg.tagline}</p>

              <p className="mt-6 text-sm font-bold text-paper/70">Dit is jouw pakket</p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 rounded-full border border-jade/25 bg-jade/10 px-3 py-2 text-sm font-semibold">
                    <span aria-hidden="true" className="text-lime">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-3 border-t border-paper/10 pt-5 text-sm text-paper/60">
                <Image src="/brand/png/svg/sticker-thumbsup.svg" alt="" width={64} height={64} className="h-10 w-10" />
                De tijd gaat pas lopen op het moment dat je voor het eerst inlogt.
              </div>
            </div>
          </div>
        </section>

        {/* FORMULIER */}
        <CheckoutForm packageSlug={pkg.slug} packageName={pkg.name} priceLabel={formatPrice(pkg.priceCents)} />
      </div>
    </main>
  );
}
