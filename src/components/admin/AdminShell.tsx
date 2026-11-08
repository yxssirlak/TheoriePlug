"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import LinkPending from "../ui/LinkPending";
import { useSidebarPreference } from "../ui/useSidebarPreference";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overzicht", sticker: "/brand/png/svg/sticker-overzicht.svg" },
  { href: "/admin/cursus", label: "Videocursus", sticker: "/brand/png/svg/sticker-videocursus.svg" },
  { href: "/admin/oefenexamens", label: "Oefenexamens", sticker: "/brand/png/svg/sticker-oefenexamens.svg" },
  { href: "/admin/flashcards", label: "Flashcards", sticker: "/brand/png/svg/sticker-flashcards.svg" },
  { href: "/admin/cheat-sheet", label: "Cheat sheet", sticker: "/brand/png/svg/sticker-cheatsheet.svg" },
  { href: "/admin/adas", label: "ADAS", sticker: "/brand/png/svg/sticker-adas.svg" },
  { href: "/admin/gebruikers", label: "Gebruikers", sticker: "/brand/png/svg/sticker-gebruikers.svg" },
  { href: "/admin/km-declaratie", label: "Km declaratie", sticker: "/brand/png/svg/sticker-car.svg" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, toggleCollapsed] = useSidebarPreference();
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/beheer/login");
  };

  // Zoek de actieve pagina in de navigatie array (ADMIN_NAV gebruiken!)
  const activeNavItem = ADMIN_NAV.find(item => isActive(item.href));
  
  // Bepaal de titel. Als we op /admin zijn, gebruiken we "Overzicht" of een default.
  const pageTitle = activeNavItem ? activeNavItem.label : "Beheer";

  return (
    <div className="min-h-screen bg-background text-paper lg:flex">
      {/* SIDEBAR (desktop) */}
      <div className={`hidden shrink-0 transition-all duration-300 ease-in-out lg:block ${collapsed ? "w-24" : "w-72"}`}>
        <aside
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden border-r border-white/10 p-4 transition-all duration-500 ease-in-out ${
            expanded 
              ? "w-72 bg-surface"
              : "w-24 bg-surface"
          } ${collapsed && hovered ? "shadow-[14px_0_45px_rgba(0,0,0,0.7)]" : ""}`}
        >
          {/* Geanimeerde achtergrond glows (gesplitst voor smooth crossfade) */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.15),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(204,255,0,0.08),transparent_55%)] transition-opacity duration-700 ease-in-out ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(204,255,0,0.12),transparent_60%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.15),transparent_60%)] transition-opacity duration-700 ease-in-out ${
              expanded ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Header: Logo & Punaise */}
          <div className="relative mb-8 flex h-16 w-full items-start justify-between">
            <Link href="/admin" aria-label="Naar overzicht" className="relative mt-4 flex h-full flex-1 items-start">
              {/* Brede tekstlogo inclusief "BEHEER" label */}
              <div
                className={`absolute left-0 top-0 transition-all duration-500 ease-in-out ${
                  expanded ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"
                }`}
              >
                <Image
                  src="/brand/png/svg/logo.svg"
                  alt="TheoriePlug"
                  width={582}
                  height={61}
                  priority
                  className="h-6 w-auto"
                />
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-paper/50 ml-1">
                  Beheer
                </span>
              </div>
              
              {/* Kleine tegel logo: Absoluut gecentreerd in ingeklapte state */}
              <div className={`absolute -top-4 flex w-full items-center justify-center transition-all duration-500 ease-in-out ${
                  expanded ? "pointer-events-none scale-75 opacity-0" : "scale-100 opacity-100 hover:scale-105"
                }`}>
                <Image
                  src="/brand/png/svg/logo-upright-b-limoen-tegel.svg"
                  alt="TheoriePlug"
                  width={80}
                  height={80}
                  priority
                  className="h-16 w-16 object-contain"
                />
              </div>
            </Link>

            {/* Pin / Punaise knop */}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Zijbalk vastpinnen" : "Zijbalk losmaken"}
              aria-label={collapsed ? "Zijbalk vastpinnen" : "Zijbalk losmaken"}
              aria-pressed={!collapsed}
              className={`absolute -right-3 -top-3 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-paper/40 transition-all duration-500 hover:bg-white/5 hover:text-white ${
                expanded ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform duration-300 ${!collapsed ? "rotate-0" : "-rotate-45"}`}
                aria-hidden="true"
              >
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14v-2l-2-2V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8l-2 2v2z" />
                <line x1="9" y1="4" x2="15" y2="4" />
              </svg>
            </button>
          </div>

          {/* Navigatie */}
          <nav aria-label="Beheeromgeving" className="relative -mx-4 mt-1 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-4 py-3">
            {ADMIN_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={expanded ? undefined : item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex h-12 items-center whitespace-nowrap rounded-xl border font-semibold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime motion-reduce:transition-none ${
                    expanded ? "w-full" : "mx-auto w-12"
                  } ${
                    active
                      ? "border-lime/50 bg-lime/10 text-lime shadow-[0_0_20px_rgba(204,255,0,0.1)]"
                      : "border-transparent text-paper/70 hover:bg-white/5 hover:text-paper"
                  }`}
                >
                  <div className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition-all duration-300 ${
                    expanded ? "left-3" : "left-1/2 -translate-x-1/2"
                  }`}>
                    <Image
                      src={item.sticker}
                      alt=""
                      width={64}
                      height={64}
                      className={`h-9 w-9 shrink-0 drop-shadow-md transition-transform duration-300 ${!active ? "group-hover:scale-110 group-hover:-rotate-6" : ""}`}
                    />
                  </div>
                  <span className={`absolute left-14 top-1/2 mt-0.5 -translate-y-1/2 text-[15px] transition-opacity duration-300 ${
                    expanded ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}>
                    {item.label}
                  </span>
                  <LinkPending />
                </Link>
              );
            })}
          </nav>

          {/* Onderste acties (Naar leerlingplatform & Uitloggen) */}
          <div className="relative mt-4 space-y-2 border-t border-paper/10 pt-4">
            <Link
              href="/dashboard"
              title={expanded ? undefined : "Naar leerlingplatform"}
              aria-label="Naar leerlingplatform"
              className={`group relative flex h-12 items-center whitespace-nowrap rounded-xl text-left font-semibold transition-all duration-300 ${
                expanded ? "w-full text-paper/60 hover:bg-white/5 hover:text-lime" : "mx-auto w-12 text-paper/60 hover:bg-white/5 hover:text-lime"
              }`}
            >
              <div className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition-all duration-300 ${
                expanded ? "left-3" : "left-1/2 -translate-x-1/2"
              }`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
              <span className={`absolute left-14 top-1/2 mt-0.5 -translate-y-1/2 text-[15px] transition-opacity duration-300 ${
                expanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}>
                Naar platform
              </span>
            </Link>

            <button
              type="button"
              onClick={logout}
              title={expanded ? undefined : "Uitloggen"}
              aria-label="Uitloggen"
              className={`group relative flex h-12 items-center whitespace-nowrap rounded-xl text-left font-semibold transition-all duration-300 ${
                expanded ? "w-full text-paper/60 hover:bg-red-500/10 hover:text-red-400" : "mx-auto w-12 text-paper/60 hover:bg-red-500/10 hover:text-red-400"
              }`}
            >
              <div className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition-all duration-300 ${
                expanded ? "left-3" : "left-1/2 -translate-x-1/2"
              }`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>
              <span className={`absolute left-14 top-1/2 mt-0.5 -translate-y-1/2 text-[15px] transition-opacity duration-300 ${
                expanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}>
                Uitloggen
              </span>
            </button>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOPBAR (Desktop & Mobiel) */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-paper/10 bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
          {/* Mobiel logo */}
          <Link href="/admin" aria-label="Naar overzicht" className="flex items-center gap-2 lg:hidden">
            <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} className="h-6 w-auto" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-paper/50">Beheer</span>
          </Link>

          {/* Dynamische Paginatitel (verborgen op mobiel voor ruimte) */}
          <h1 className="hidden font-display text-2xl font-black uppercase tracking-wide text-paper lg:block">
            {pageTitle}
          </h1>

          {/* Beheerder Info Knopje (rechterkant) */}
          <div className="relative ml-auto">
            <div className="flex cursor-default items-center gap-2 rounded-full border border-jade/30 py-1 pl-1 pr-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime font-display text-sm font-extrabold text-ink">
                B
              </span>
              <span className="hidden text-sm font-semibold sm:block">Beheer</span>
            </div>
          </div>
        </header>

        <nav aria-label="Beheeromgeving mobiel" className="flex gap-2 overflow-x-auto border-b border-paper/10 px-4 py-3 lg:hidden">
          {ADMIN_NAV.map((item) => (
            <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${isActive(item.href) ? "border border-lime/50 bg-lime/10 text-lime" : "bg-white/5 text-paper/70"}`}>
              {item.label}
              <LinkPending />
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}