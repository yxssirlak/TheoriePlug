"use client";

import { ReactNode, useTransition, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { loadPackageTier } from "../../lib/course/data";
import type { PackageTier } from "../../lib/course/types";
import { MOBILE_NAV_HREFS, NAV_ITEMS, NavItem } from "./nav";
import { PlatformUser, UserProvider } from "./user-context";
import WelcomeModal from "./WelcomeModal"; 
import PageSkeleton, { Skeleton, SkeletonList, skeletonForPath } from "../ui/PageSkeleton";
import LinkPending from "../ui/LinkPending";
import { useSidebarPreference } from "../ui/useSidebarPreference";

function NavIcon({ item, className, hoverScale = false }: { item: NavItem; className: string; hoverScale?: boolean }) {
  if (!item.sticker) return <span className="flex h-8 w-8 items-center justify-center text-jade">{item.icon}</span>;
  return (
    <Image
      src={item.sticker}
      alt=""
      width={64}
      height={64}
      className={`${className} shrink-0 drop-shadow-md ${hoverScale ? "transition-transform group-hover:scale-110 group-hover:-rotate-6" : ""}`}
    />
  );
}

function displayName(metadata: Record<string, unknown> | undefined, email: string): string {
  const raw = (metadata?.full_name ?? metadata?.name ?? metadata?.first_name) as string | undefined;
  if (raw && raw.trim()) return raw.trim().split(" ")[0];
  const local = email.split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "Leerling";
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [tier, setTier] = useState<PackageTier | null>(() => {
    // Init tier van cache
    try {
      const cached = sessionStorage.getItem("_platformTier");
      return cached === "null" ? null : (cached as PackageTier) || null;
    } catch {
      return null;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarPreference();
  const [hovered, setHovered] = useState(false);
  const [isPending, startTransition] = useTransition();
  const expanded = !collapsed || hovered;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // Zet user data in session storage om navigatie sneller te maken
    const cachedUser = sessionStorage.getItem("_platformUser");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser) as PlatformUser;
        setUser(parsed);
      } catch {
        sessionStorage.removeItem("_platformUser");
      }
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        sessionStorage.removeItem("_platformUser");
        router.replace("/login");
        return;
      }
      const email = data.user.email ?? "";
      const { data: profile, error: profileError } = await supabase.from("profiles").select("first_name").eq("id", data.user.id).maybeSingle();
      if (profileError) console.error("Profiel laden mislukt:", profileError.message);
      if (cancelled) return;
      setUser({ id: data.user.id, email, name: profile?.first_name?.trim().split(" ")[0] || displayName(data.user.user_metadata, email) });
      loadPackageTier(supabase, data.user.id)
        .then((found) => {
          if (!cancelled) {
            setTier(found);
            sessionStorage.setItem("_platformTier", found || "null");
          }
        })
        .catch(() => undefined);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        sessionStorage.removeItem("_platformUser");
        sessionStorage.removeItem("_platformTier");
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const logout = async () => {
    setLoggingOut(true);
    await createClient().auth.signOut();
    router.replace("/login");
  };

  if (!user) {
    return (
      <UserProvider value={null}>
        <div className="min-h-screen bg-background lg:flex">
          <aside aria-hidden="true" className="hidden w-72 shrink-0 border-r border-white/10 bg-surface p-6 lg:block">
            <Skeleton className="mb-10 h-8 w-40" /><SkeletonList rows={8} />
          </aside>
          <div className="min-w-0 flex-1">
            <div className="h-16 border-b border-white/10 bg-surface" />
            <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:px-10"><PageSkeleton kind={skeletonForPath(pathname)} /></div>
          </div>
        </div>
        {children}
      </UserProvider>
    );
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const settings = NAV_ITEMS[NAV_ITEMS.length - 1];
  
  // Bepaal de dynamische paginatitel
  const activeNavItem = NAV_ITEMS.find(item => isActive(item.href));
  const pageTitle = activeNavItem ? activeNavItem.label : "Dashboard";

  return (
    <UserProvider value={user}>
      {/* De nieuwe Onboarding Modal */}
      <WelcomeModal 
        userId={user.id} 
        onComplete={(newName, examDate) => setUser({ ...user, name: newName, examDate })}
      />
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

            {/* Header: Logo & Punaise met vloeiende crossfade animatie */}
            <div className="relative mb-8 flex h-16 w-full items-start justify-between">
              <Link href="/dashboard" aria-label="Naar overzicht" className="relative mt-4 flex h-full flex-1 items-start">
                {/* Brede tekstlogo */}
                <Image
                  src="/brand/png/svg/logo.svg"
                  alt="TheoriePlug"
                  width={582}
                  height={61}
                  priority
                  className={`absolute left-0 top-0 h-6 w-auto transition-all duration-500 ease-in-out ${
                    expanded ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-4 opacity-0"
                  }`}
                />
                {/* Kleine tegel logo: Flink groter gemaakt en absoluut gecentreerd */}
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
            <nav aria-label="Leeromgeving" className="relative -mx-4 mt-1 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-4 py-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
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
                    {/* Icoon altijd verticaal in het midden (top-1/2 -translate-y-1/2), alleen horizontaal animeren */}
                    <div className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition-all duration-300 ${
                      expanded ? "left-3" : "left-1/2 -translate-x-1/2"
                    }`}>
                      <NavIcon item={item} className="h-9 w-9" hoverScale={!active} />
                    </div>
                    
                    {/* Tekst ook verticaal gefixeerd zodat deze strak blijft staan tijdens animatie */}
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

            {/* Uitloggen */}
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              title={expanded ? undefined : "Uitloggen"}
              aria-label="Uitloggen"
              className={`group relative mt-4 flex h-12 items-center whitespace-nowrap rounded-xl text-left font-semibold transition-all duration-300 disabled:opacity-50 ${
                expanded ? "w-full text-paper/70 hover:bg-red-500/10 hover:text-red-400" : "mx-auto w-12 text-paper/70 hover:bg-red-500/10 hover:text-red-400"
              }`}
            >
              {/* Icoon altijd verticaal in het midden */}
              <div className={`absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center transition-all duration-300 ${
                expanded ? "left-3" : "left-1/2 -translate-x-1/2"
              }`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>
              
              <span className={`absolute left-14 top-1/2 mt-0.5 -translate-y-1/2 text-[15px] transition-opacity duration-300 ${
                expanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}>
                {loggingOut ? "Uitloggen..." : "Uitloggen"}
              </span>
            </button>
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* TOPBAR */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
            {/* Mobiel logo */}
            <Link href="/dashboard" aria-label="Naar overzicht" className="lg:hidden">
              <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} className="h-6 w-auto" />
            </Link>

            {/* Dynamische Paginatitel */}
            <h1 className="hidden font-display text-2xl font-black uppercase tracking-wide text-paper lg:block">
              {pageTitle}
            </h1>

            <div className="ml-auto flex items-center gap-3">
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full border border-paper/10 py-1 pl-1 pr-3 transition-colors hover:border-paper/30"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-display text-sm font-extrabold transition-all duration-300 ${
                    tier === "max"
                      ? "border-lime bg-lime/10 text-lime shadow-[0_0_12px_rgba(204,255,0,0.4)]"
                      : tier === "boost"
                      ? "border-jade bg-jade/10 text-jade shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      : "border-paper/40 bg-transparent text-paper/80"
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-sm font-semibold sm:block">{user.name}</span>
                <span aria-hidden="true" className="text-paper/40 text-xs">
                  ▾
                </span>
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-paper/10 bg-surface p-1.5 shadow-2xl">
                  {tier && (
                    <div className="px-3 py-3 border-b border-paper/10 mb-1">
                      <p className="text-xs font-bold text-paper/50 uppercase tracking-wider mb-1">Actief Pakket</p>
                      <p className={`font-display text-lg font-extrabold uppercase tracking-wide ${
                        tier === "max" ? "text-lime" : tier === "boost" ? "text-jade" : "text-paper"
                      }`}>
                        {tier}
                      </p>
                    </div>
                  )}
                  <Link role="menuitem" href="/instellingen" className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-paper/10">
                    Instellingen
                  </Link>
                  <Link role="menuitem" href="/" className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-paper/10">
                    Naar de website
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={logout}
                    disabled={loggingOut}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {loggingOut ? "Uitloggen..." : "Uitloggen"}
                  </button>
                </div>
              )}
            </div>
          </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pb-12">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>

        {/* ONDERBALK (mobiel) */}
        <nav aria-label="Snelle navigatie" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV_ITEMS.filter((item) => MOBILE_NAV_HREFS.includes(item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${isActive(item.href) ? "text-lime" : "text-paper/60"}`}
            >
              {item.icon}
              {item.label}
              <LinkPending />
            </Link>
          ))}
          <Link
            href={settings.href}
            aria-current={isActive(settings.href) ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${isActive(settings.href) ? "text-lime" : "text-paper/60"}`}
          >
            {settings.icon}
            Meer
            <LinkPending />
          </Link>
        </nav>
      </div>
    </UserProvider>
  );
}