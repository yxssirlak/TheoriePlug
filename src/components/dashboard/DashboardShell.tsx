"use client";

import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { MOBILE_NAV_HREFS, NAV_ITEMS, NavItem } from "./nav";
import { PlatformUser, UserProvider } from "./user-context";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const email = data.user.email ?? "";
      setUser({ id: data.user.id, email, name: displayName(data.user.user_metadata, email) });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
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
      <div className="auth-bg flex min-h-screen items-center justify-center text-paper/60">
        <span aria-hidden="true" className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-paper/20 border-t-lime" />
        Leeromgeving laden...
      </div>
    );
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const settings = NAV_ITEMS[NAV_ITEMS.length - 1];

  return (
    <UserProvider value={user}>
      <div className="min-h-screen bg-[#18181B] text-paper lg:flex">
        {/* SIDEBAR (desktop) */}
        <div className={`hidden shrink-0 transition-all duration-300 ease-in-out lg:block ${collapsed ? "w-24" : "w-72"}`}>
          <aside
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden p-4 transition-all duration-500 ease-in-out ${
              expanded 
                ? "w-72 bg-[#050b14]" 
                : "w-24 bg-[#060e1a]"
            } ${collapsed && hovered ? "shadow-[14px_0_45px_rgba(0,0,0,0.7)]" : ""}`}
          >
           {/* Header: Logo & Punaise */}
            <div className={`relative mb-8 flex w-full items-center transition-all duration-300 ${expanded ? "justify-between" : "justify-center"}`}>
              <Link href="/dashboard" aria-label="Naar overzicht" className="flex items-center">
                {expanded ? (
                  <Image
                    src="/brand/png/svg/logo.svg"
                    alt="TheoriePlug"
                    width={582}
                    height={61}
                    priority
                    className="h-7 w-auto transition-opacity duration-300"
                  />
                ) : (
                  <Image
                    src="/brand/png/svg/logo-upright-b-limoen-tegel.svg"
                    alt="TheoriePlug"
                    width={48}
                    height={48}
                    priority
                    className="h-12 w-12 object-contain transition-transform duration-300 hover:scale-105"
                  />
                )}
              </Link>

              {expanded && (
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => !prev)}
                  title={collapsed ? "Zijbalk vastpinnen" : "Zijbalk losmaken"}
                  aria-label="Zijbalk vastpinnen"
                  className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent text-paper/40 transition-colors hover:bg-white/5 hover:text-white"
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
              )}
            </div>

            {/* Navigatie */}
            <nav aria-label="Leeromgeving" className="relative flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={expanded ? undefined : item.label}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setCollapsed(true);
                      setHovered(false);
                    }}
                    className={`group relative flex h-11 w-full items-center whitespace-nowrap rounded-xl font-semibold transition-colors duration-300 ${
                      active
                        ? "bg-lime text-ink"
                        : "text-paper/70 hover:bg-white/5 hover:text-paper"
                    }`}
                  >
                    <div className="absolute left-1.5 flex h-8 w-8 items-center justify-center">
                      <NavIcon item={item} className="h-8 w-8" hoverScale={!active} />
                    </div>
                    <span className={`ml-11 mt-0.5 text-[15px] transition-opacity duration-300 ${expanded ? "opacity-100" : "opacity-0"}`}>
                      {item.label}
                    </span>
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
              className="relative mt-4 flex items-center gap-4 whitespace-nowrap rounded-xl p-3 text-left font-semibold text-paper/70 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>
              <span className={`text-[15px] transition-opacity duration-300 ${expanded ? "opacity-100" : "opacity-0"}`}>
                {loggingOut ? "Uitloggen..." : "Uitloggen"}
              </span>
            </button>
          </aside>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* TOPBAR */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-paper/10 bg-[#18181B]/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
            <Link href="/dashboard" aria-label="Naar overzicht" className="lg:hidden">
              <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} className="h-6 w-auto" />
            </Link>
            <p className="hidden text-sm text-paper/60 lg:block">
              Ingelogd als <span className="font-semibold text-paper">{user.email}</span>
            </p>

            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full border border-jade/30 py-1 pl-1 pr-3 transition-colors hover:border-jade"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime font-display text-sm font-extrabold text-ink">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold sm:block">{user.name}</span>
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-paper/10 bg-[#0a121e] p-1.5 shadow-2xl">
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
          </header>

          <main className="flex-1 px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pb-12">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>

        {/* ONDERBALK (mobiel) */}
        <nav aria-label="Snelle navigatie" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-jade/20 bg-[#050b14]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {NAV_ITEMS.filter((item) => MOBILE_NAV_HREFS.includes(item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${isActive(item.href) ? "text-lime" : "text-paper/60"}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <Link
            href={settings.href}
            aria-current={isActive(settings.href) ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${isActive(settings.href) ? "text-lime" : "text-paper/60"}`}
          >
            {settings.icon}
            Meer
          </Link>
        </nav>
      </div>
    </UserProvider>
  );
}