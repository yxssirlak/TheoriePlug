import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TheoriePlug — Binnenkort live",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <main className="auth-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-paper">
      <Image
        src="/brand/png/svg/sticker-thumbsup.svg"
        alt=""
        width={200}
        height={200}
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[18%] hidden w-28 -rotate-12 opacity-90 drop-shadow-xl md:block lg:w-36"
      />
      <Image
        src="/brand/png/svg/sticker-car.svg"
        alt=""
        width={200}
        height={200}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[18%] right-[8%] hidden w-28 rotate-6 opacity-90 drop-shadow-xl md:block lg:w-36"
      />

      <div className="relative flex max-w-2xl flex-col items-center">
        <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-10 w-auto sm:h-12" />

        <span className="mt-10 inline-block rounded-full bg-lime px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-ink">
          Binnenkort live
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-6xl">
          We bouwen aan jouw <span className="text-lime">theorie-</span>
          <span className="text-jade">succes</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-paper/70">
          TheoriePlug komt eraan. Plug je kennis, own de weg — en slaag in één keer.
        </p>
      </div>

      <Link
        href="/beheer/login?next=/"
        className="absolute bottom-5 right-5 rounded-full border border-paper/10 px-3 py-1.5 text-xs font-semibold text-paper/40 transition-colors hover:border-lime/50 hover:text-lime"
      >
        Login
      </Link>
    </main>
  );
}
