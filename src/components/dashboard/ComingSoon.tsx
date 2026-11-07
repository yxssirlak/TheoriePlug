import Link from "next/link";

export default function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-paper/60">{text}</p>
      <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-surface p-10 text-center">
        <p className="font-display text-xl font-extrabold text-lime">Binnenkort beschikbaar</p>
        <p className="mt-2 text-paper/60">We werken hard aan dit onderdeel.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-full bg-lime px-6 py-3 font-bold text-ink transition-transform hover:scale-105">
          Terug naar overzicht
        </Link>
      </div>
    </section>
  );
}
