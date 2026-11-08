import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  sticker?: string;
};

const svg = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", sticker: "/brand/png/svg/sticker-overzicht.svg", label: "Overzicht", icon: svg(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>) },
  { href: "/oefenexamens", sticker: "/brand/png/svg/sticker-oefenexamens.svg", label: "Oefenexamens", icon: svg(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>) },
  { href: "/videocursus", sticker: "/brand/png/svg/sticker-videocursus.svg", label: "Videocursus", icon: svg(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>) },
  { href: "/flashcards", sticker: "/brand/png/svg/sticker-flashcards.svg", label: "Flashcards", icon: svg(<><rect x="3" y="6" width="14" height="12" rx="2" /><path d="M7 3h14v12" /></>) },
  { href: "/cheat-sheet", sticker: "/brand/png/svg/sticker-cheatsheet.svg", label: "Cheat sheet", icon: svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 13h6M9 17h6" /></>) },
  { href: "/voortgang", sticker: "/brand/png/svg/sticker-voortgang.svg", label: "Voortgang", icon: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />) },
  { href: "/instellingen", sticker: "/brand/png/svg/sticker-instellingen.svg", label: "Instellingen", icon: svg(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>) },
];

// Items voor de mobiele onderbalk; "Instellingen" staat daar als "Meer"
export const MOBILE_NAV_HREFS = ["/dashboard", "/oefenexamens", "/videocursus", "/voortgang"];
