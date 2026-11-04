"use client";

import { useMemo, useState } from "react";
import { usePublished } from "../../lib/course/usePublished";
import RichText from "../videocursus/RichText";
import { ContentState, PageHeader } from "../dashboard/ContentState";

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
        className="mb-8 w-full max-w-md rounded-xl border border-paper/15 bg-white/5 px-4 py-2.5 text-paper outline-none placeholder:text-paper/30 focus:border-lime"
      />
      {groups.length === 0 && <p className="text-paper/60">Niets gevonden.</p>}
      <div className="space-y-10">
        {groups.map(([category, list]) => (
          <section key={category}>
            <h2 className="mb-4 font-display text-xl font-extrabold text-lime">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((item) => (
                <article key={item.id} className="rounded-2xl border border-jade/25 bg-[#0a121e] p-5">
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
  const state = usePublished<Item>("cheat_sheet_items");
  return (
    <>
      <PageHeader title="Cheat sheet" text="Alle regels op één blad." />
      <ContentState state={state} empty="De cheat sheet wordt nog gevuld. Kom snel terug!">
        {(items) => <Sheet items={items} />}
      </ContentState>
    </>
  );
}
