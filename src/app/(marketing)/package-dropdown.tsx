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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(0);

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    cancelClose();
    if (triggerRef.current) {
      setMenuTop(triggerRef.current.getBoundingClientRect().bottom + 8);
    }
    setOpen(true);
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpen(false), 180);
  }

  useEffect(() => {
    return () => cancelClose();
  }, []);

  useEffect(() => {
    if (!open) return;

    function updateMenuPosition() {
      if (triggerRef.current) {
        setMenuTop(triggerRef.current.getBoundingClientRect().bottom + 8);
      }
    }

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

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="theoriepakketten-menu"
        onClick={() => {
          if (open) {
            cancelClose();
            setOpen(false);
          } else {
            openMenu();
          }
        }}
        className={`flex cursor-pointer items-center gap-1 rounded-full px-3 py-2 text-sm font-bold transition-colors sm:text-base ${
          open ? "bg-paper/10 text-lime" : "hover:bg-paper/10 hover:text-lime"
        }`}
      >
        Theorie pakketten
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id="theoriepakketten-menu"
          style={{ top: menuTop, left: 0 }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="package-dropdown-enter fixed z-50 w-full border-y border-white/15 bg-ink/85 px-4 py-4 text-paper shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:px-8 sm:py-5 lg:px-12"
        >
          <div className="mx-auto mb-3 flex max-w-7xl flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="font-display text-base font-extrabold sm:text-lg">Kies jouw pakket</h2>
            </div>
            <Link
              href="#pakketten"
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-paper/65 transition-colors hover:text-lime"
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
                    <span className={`font-display text-lg font-extrabold transition-colors group-hover/card:text-lime ${item.featured ? "text-lime" : "text-paper"}`}>
                      {item.name}
                    </span>
                    {item.featured && (
                      <span className="rounded-full bg-lime px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-ink">
                        MEEST GEKOZEN
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-paper/60 sm:text-sm">
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
                  <span className={`block font-display text-lg font-extrabold ${item.featured ? "text-lime" : "text-jade"}`}>
                    {item.price}
                  </span>
                  <span className="text-xs font-bold text-paper/45 transition-colors group-hover/card:text-paper/80">
                    Bekijk →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
