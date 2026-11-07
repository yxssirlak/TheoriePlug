"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase";

const CARDS = [
  { table: "topics", label: "Hoofdonderwerpen", href: "/admin/cursus" },
  { table: "lessons", label: "Videolessen", href: "/admin/cursus" },
  { table: "lesson_questions", label: "Kennis-check vragen", href: "/admin/cursus" },
  { table: "exam_questions", label: "Examenvragen", href: "/admin/oefenexamens" },
  { table: "flashcards", label: "Flashcards", href: "/admin/flashcards" },
  { table: "cheat_sheet_items", label: "Cheat sheet-onderdelen", href: "/admin/cheat-sheet" },
  { table: "adas_items", label: "ADAS-onderdelen", href: "/admin/adas" },
  { table: "profiles", label: "Gebruikers", href: "/admin/gebruikers" },
  { table: "business_trips", label: "Km declaratie", href: "/admin/km-declaratie" },
];

export default function Page() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  useEffect(() => {
    const supabase = createClient();
    CARDS.forEach(({ table }) => {
      supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .then(({ count }) => setCounts((previous) => ({ ...previous, [table]: count })));
    });
  }, []);

  return (
    <main className="p-6">
      <h1 className="font-display text-3xl font-extrabold">
        Beheer<span className="text-lime">dashboard</span>
      </h1>
      <p className="mt-1 text-paper/60">Kies een onderdeel om aan te passen.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card) => (
          <Link key={card.table} href={card.href} className="rounded-2xl border border-white/10 bg-surface p-5 transition-colors hover:border-lime">
            <p className="font-display text-3xl font-extrabold text-lime">{counts[card.table] ?? "–"}</p>
            <p className="mt-1 text-sm text-paper/70">{card.label}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
