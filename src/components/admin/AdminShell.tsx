"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overzicht", sticker: "/brand/png/svg/sticker-overzicht.svg" },
  { href: "/admin/cursus", label: "Videocursus", sticker: "/brand/png/svg/sticker-videocursus.svg" },
  { href: "/admin/oefenexamens", label: "Oefenexamens", sticker: "/brand/png/svg/sticker-oefenexamens.svg" },
  { href: "/admin/flashcards", label: "Flashcards", sticker: "/brand/png/svg/sticker-flashcards.svg" },
  { href: "/admin/cheat-sheet", label: "Cheat sheet", sticker: "/brand/png/svg/sticker-cheatsheet.svg" },
  { href: "/admin/adas", label: "ADAS", sticker: "/brand/png/svg/sticker-adas.svg" },
  { href: "/admin/gebruikers", label: "Gebruikers", sticker: "/brand/png/svg/sticker-badge.svg" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/beheer/login");
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-paper lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-paper/10 bg-[#070f1b] p-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <Link href="/admin" aria-label="Naar beheeroverzicht" className="mb-6 block px-2">
          <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-8 w-auto" />
          <span className="mt-1 block text-xs font-bold uppercase tracking-widest text-paper/50">Beheer</span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive(item.href)
                  ? "bg-lime text-ink shadow-[0_0_24px_rgba(204,255,0,0.25)]"
                  : "text-paper/70 hover:bg-jade/10 hover:text-paper"
              }`}
            >
              <Image
                src={item.sticker}
                alt=""
                width={64}
                height={64}
                className="h-8 w-8 shrink-0 drop-shadow-md transition-transform group-hover:-rotate-6 group-hover:scale-110"
              />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 hidden space-y-1 border-t border-paper/10 pt-4 lg:block">
          <Link href="/dashboard" className="block px-4 py-2 text-sm text-paper/60 hover:text-lime">
            Naar leerlingplatform
          </Link>
          <button onClick={logout} className="block px-4 py-2 text-sm text-paper/60 hover:text-red-300">
            Uitloggen
          </button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
