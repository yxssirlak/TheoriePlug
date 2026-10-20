"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DropdownPackage = {
  id: string;
  name: string;
  desc: string;
  price: string;
  featured?: boolean;
  items: { label: string; detail?: string; highlight?: "jade" | "lime" }[];
};

export default function PackageDropdown({ packages }: { packages: DropdownPackage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerTypeRef = useRef<string>("mouse");
  const [open, setOpen] = useState(false);

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    cancelClose();
    setOpen(true);
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 250);
  }

  useEffect(() => {
    return () => cancelClose();
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        cancelClose();
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        cancelClose();
        setOpen(false);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      if (containerRef.current?.contains(event.target as Node)) {
        cancelClose();
      } else if (!closeTimerRef.current) {
        closeTimerRef.current = setTimeout(() => setOpen(false), 250);
      }
    }

    function handleScroll() {
      if (pointerTypeRef.current !== "mouse") return;
      cancelClose();
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="-my-6 py-6"
      onPointerEnter={(event) => {
        pointerTypeRef.current = event.pointerType;
        if (event.pointerType === "mouse") openMenu();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") scheduleClose();
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="theoriepakketten-menu"
        onPointerDown={(event) => {
          pointerTypeRef.current = event.pointerType;
        }}
        onClick={() => {
          if (!open) {
            openMenu();
          } else if (pointerTypeRef.current !== "mouse") {
            cancelClose();
            setOpen(false);
          }
        }}
        className={`flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-base font-bold transition-colors sm:text-lg lg:px-4 lg:text-xl ${
          open ? "bg-paper/10 text-lime" : "hover:bg-paper/10 hover:text-lime"
        }`}
      >
        Theorie pakketten
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 lg:h-5 lg:w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        id="theoriepakketten-menu"
        inert={!open ? true : undefined}
        aria-hidden={!open}
        data-open={open}
        className={`package-dropdown absolute inset-x-0 top-full z-50 border-y border-white/15 bg-ink/85 px-4 py-4 text-paper shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:px-8 sm:py-5 lg:px-12 transition-all duration-200 ease-out ${
          open 
            ? "visible opacity-100 translate-y-0" 
            : "invisible opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <span aria-hidden="true" className="absolute inset-x-0 -top-10 h-10" />
        <div className="mx-auto mb-3 flex max-w-7xl flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="font-display text-lg font-extrabold sm:text-xl">Kies jouw pakket</h2>
            </div>
            <Link
              href="#pakketten"
              onClick={() => setOpen(false)}
              className="rounded-full bg-jade px-5 py-2 text-base font-bold text-ink shadow-[0_0_18px_rgba(16,185,129,0.35)] transition hover:brightness-110 hover:shadow-[0_0_28px_rgba(16,185,129,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              Vergelijk alle pakketten <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mx-auto grid max-w-7xl gap-2 sm:grid-cols-3 sm:gap-4">
            {packages.map((item) => (
              <Link
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setOpen(false)}
                className={`group/card flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:px-5 ${
                  item.featured
                    ? "border-lime/35 bg-lime/[0.06] hover:border-lime hover:bg-lime/[0.12] hover:shadow-[0_0_22px_rgba(204,255,0,0.12)]"
                    : "border-white/10 bg-white/[0.04] hover:border-jade/60 hover:bg-jade/[0.08] hover:shadow-[0_0_22px_rgba(16,185,129,0.1)]"
                }`}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`font-display text-xl font-extrabold transition-colors group-hover/card:text-lime ${item.featured ? "text-lime" : "text-paper"}`}>
                      {item.name}
                    </span>
                    {item.featured && (
                      <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-extrabold tracking-wide text-ink">
                        MEEST GEKOZEN
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-paper/60 sm:text-base">
                    {item.items.find((feature) => feature.label.includes("dagen") || feature.label.includes("maand"))?.label}
                    {" · "}
                    {item.items.find((feature) => feature.detail)?.label}
                    {item.items.find((feature) => feature.detail) && (
                      <span className="ml-1 font-bold text-jade">
                        ({item.items.find((feature) => feature.detail)?.detail})
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block font-display text-xl font-extrabold ${item.featured ? "text-lime" : "text-jade"}`}>
                    {item.price}
                  </span>
                  <span className="text-sm font-bold text-paper/45 transition-colors group-hover/card:text-paper/80">
                    Bekijk →
                  </span>
                </span>
              </Link>
            ))}
          </div>
      </div>
    </div>
  );
}
