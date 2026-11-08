export type PackageFeature = {
  label: string;
  highlight?: "jade" | "lime";
  detail?: string;
};

export type TheoryPackage = {
  id: string;
  name: string;
  desc: string;
  price: string;
  featured?: boolean;
  items: PackageFeature[];
};

export const packages: TheoryPackage[] = [
  {
    id: "pakket-start",
    name: "Start",
    desc: "Een sterke basis voor je theorie-examen.",
    price: "€29,99",
    items: [
      { label: "7 dagen" },
      { label: "3 oefenexamens", detail: "250 vragen" },
      { label: "Videocursus" },
      { label: "Cheat Sheet" },
    ],
  },
  {
    id: "pakket-max",
    name: "Max",
    desc: "Alles in huis voor een complete voorbereiding.",
    price: "€44,99",
    featured: true,
    items: [
      { label: "1 maand" },
      { label: "10 oefenexamens", detail: "500 vragen" },
      { label: "Videocursus" },
      { label: "Cheat Sheet" },
      { label: "1 x pauzeren" },
      { label: "Adaptive", highlight: "lime" },
      { label: "Flashcards", highlight: "lime" },
    ],
  },
  {
    id: "pakket-boost",
    name: "Boost",
    desc: "Extra oefenen en leren op jouw tempo.",
    price: "€39,99",
    items: [
      { label: "14 dagen" },
      { label: "8 oefenexamens", detail: "400 vragen" },
      { label: "Videocursus" },
      { label: "Cheat Sheet" },
      { label: "1 x pauzeren" },
      { label: "Adaptive", highlight: "jade" },
    ],
  },
];
