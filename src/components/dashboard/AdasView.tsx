"use client";

import { usePublished } from "../../lib/course/usePublished";
import RichText from "../videocursus/RichText";
import { ContentState, PageHeader } from "../dashboard/ContentState";

type Item = { id: string; title: string; body: string | null; image_url: string | null };

export default function AdasView() {
  const state = usePublished<Item>("adas_items");
  return (
    <>
      <PageHeader title="ADAS" text="Alles over rijhulpsystemen." />
      <ContentState state={state} empty="De ADAS-uitleg wordt nog gevuld. Kom snel terug!">
        {(items) => (
          <div className="grid gap-5 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-jade/25 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {item.image_url && <img src={item.image_url} alt="" className="aspect-video w-full object-cover" />}
                <div className="p-5">
                  <h2 className="mb-2 font-display text-xl font-extrabold">{item.title}</h2>
                  {item.body && <RichText text={item.body} className="text-sm text-paper/80" />}
                </div>
              </article>
            ))}
          </div>
        )}
      </ContentState>
    </>
  );
}
