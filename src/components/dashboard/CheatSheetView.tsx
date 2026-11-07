"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePublished } from "../../lib/course/usePublished";
import type { SheetPage } from "../../lib/cheat-sheet";
import SheetPageView from "../cheat-sheet/SheetPageView";
import RichText from "../videocursus/RichText";
import { PageHeader } from "../dashboard/ContentState";
import Notification from "../ui/Notification";
import PageSkeleton from "../ui/PageSkeleton";

type Item = { id: string; title: string; body: string | null; category: string | null };

function Sheet({ items }: { items: Item[] }) {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => {
    const query = search.toLowerCase();
    const map = new Map<string, Item[]>();
    for (const item of items) {
      if (query && !`${item.title} ${item.body ?? ""}`.toLowerCase().includes(query)) continue;
      const key = item.category || "Overig";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [items, search]);

  return (
    <>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Zoek in de cheat sheet..."
        className="mb-8 w-full max-w-md rounded-xl border border-white/10 bg-surface-raised px-4 py-2.5 text-paper outline-none placeholder:text-paper/30 focus:border-lime"
      />
      {groups.length === 0 && <p className="text-paper/60">Niets gevonden.</p>}
      <div className="space-y-10">
        {groups.map(([category, list]) => (
          <section key={category}>
            <h2 className="mb-4 font-display text-xl font-extrabold text-lime">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((item) => (
                <article key={item.id} className="rounded-2xl border border-jade/25 bg-surface p-5">
                  <h3 className="mb-2 font-display text-lg font-extrabold">{item.title}</h3>
                  {item.body && <RichText text={item.body} className="text-sm text-paper/80" />}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export default function CheatSheetView() {
  const legacy = usePublished<Item>("cheat_sheet_items");
  const pages = usePublished<SheetPage>("cheat_sheet_pages");
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const currentIndex = pages.status === "ready" ? Math.min(index, Math.max(0, pages.items.length - 1)) : 0;
  return (
    <>
      <PageHeader title="Cheat sheet" text="Blader door de belangrijkste theorie en oefen met de interactieve afbeeldingen." />
      {pages.status === "loading" && <PageSkeleton kind="sheet" header={false} />}
      {pages.status !== "loading" && legacy.status === "loading" && <PageSkeleton kind="cards" header={false} />}
      {(pages.status === "error" || legacy.status === "error") && <Notification>
        {pages.status === "error" && <span>Kon de pagina&apos;s niet laden: {pages.message} </span>}
        {legacy.status === "error" && <span>Kon de bestaande onderdelen niet laden: {legacy.message}</span>}
      </Notification>}
      {pages.status === "ready" && pages.items.length > 0 && <section aria-label="Cheat sheet boek">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={currentIndex === 0} onClick={() => setIndex(currentIndex - 1)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-30">← Vorige</button>
          <span aria-live="polite" className="text-sm text-paper/70">Pagina {currentIndex + 1} van {pages.items.length}</span>
          <button type="button" disabled={currentIndex === pages.items.length - 1} onClick={() => setIndex(currentIndex + 1)} className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-30">Volgende →</button>
        </div>
        <motion.div key={pages.items[currentIndex].id} initial={reducedMotion ? false : { opacity: 0, rotateY: -8 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ duration: 0.3 }}>
          <SheetPageView page={pages.items[currentIndex]} />
        </motion.div>
        <p className="mt-4 text-sm text-paper/60">Beweeg over een interactieve afbeelding of tik erop om het antwoord te bekijken.</p>
      </section>}
      {legacy.status === "ready" && legacy.items.length > 0 && <section className={pages.status === "ready" && pages.items.length ? "mt-12" : ""}>
        {pages.status === "ready" && pages.items.length > 0 && <h2 className="mb-4 font-display text-2xl font-bold">Meer theorie</h2>}
        <Sheet items={legacy.items} />
      </section>}
      {pages.status === "ready" && legacy.status === "ready" && !pages.items.length && !legacy.items.length && <p className="rounded-2xl border border-white/10 bg-surface p-6 text-paper/60">De cheat sheet wordt nog gevuld. Kom snel terug!</p>}
    </>
  );
}
