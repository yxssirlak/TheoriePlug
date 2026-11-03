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
      <div className="auth-bg min-h-screen text-paper lg:flex">
        {/* SIDEBAR (desktop) */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-jade/20 bg-[#050b14]/70 p-5 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen">
          <Link href="/dashboard" aria-label="Naar overzicht" className="mb-8 block px-2">
            <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-8 w-auto" />
          </Link>
          <nav aria-label="Leeromgeving" className="flex-1 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-all ${
                  isActive(item.href)
                    ? "bg-lime text-ink shadow-[0_0_24px_rgba(204,255,0,0.25)]"
                    : "text-paper/70 hover:bg-jade/10 hover:text-paper"
                }`}
              >
                <NavIcon item={item} className="h-8 w-8" hoverScale />
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="mt-4 rounded-xl border border-paper/15 px-4 py-2.5 text-left font-semibold text-paper/70 transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
          >
            {loggingOut ? "Uitloggen..." : "Uitloggen"}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* TOPBAR */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-jade/15 bg-[#050b14]/70 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
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
