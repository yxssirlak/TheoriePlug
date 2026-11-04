export type CheckoutPackage = {
  slug: string;
  name: string;
  tagline: string;
  priceCents: number;
  durationDays: number;
  durationLabel: string;
  featured?: boolean;
  features: string[];
};

// Bron van waarheid voor checkout en API: de prijs komt altijd van de server, nooit van de client.
export const CHECKOUT_PACKAGES: CheckoutPackage[] = [
  {
    slug: "start",
    name: "Start",
    tagline: "Een sterke basis voor je theorie-examen.",
    priceCents: 2999,
    durationDays: 7,
    durationLabel: "7 dagen",
    features: ["Videocursus", "3 oefenexamens", "ADAS", "Cheat Sheet"],
  },
  {
    slug: "max",
    name: "Max",
    tagline: "Alles in huis voor een complete voorbereiding.",
    priceCents: 4499,
    durationDays: 30,
    durationLabel: "1 maand",
    featured: true,
    features: ["Videocursus", "10 oefenexamens", "ADAS", "Cheat Sheet", "Adaptive", "Flashcards", "1x pauzeren"],
  },
  {
    slug: "boost",
    name: "Boost",
    tagline: "Extra oefenen en leren op jouw tempo.",
    priceCents: 3999,
    durationDays: 14,
    durationLabel: "14 dagen",
    features: ["Videocursus", "8 oefenexamens", "ADAS", "Cheat Sheet", "Adaptive", "1x pauzeren"],
  },
];

export function getPackage(slug: string | undefined | null): CheckoutPackage | undefined {
  return CHECKOUT_PACKAGES.find((p) => p.slug === slug);
}

export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}
