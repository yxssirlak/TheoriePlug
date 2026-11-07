"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";
import { SHEET_BUCKET, type SheetBlock, type SheetPage } from "../../lib/cheat-sheet";
import RichText from "../videocursus/RichText";

function BlockImage({ block }: { block: SheetBlock }) {
  const [result, setResult] = useState<{ path: string; url?: string; error?: string } | null>(null);
  useEffect(() => {
    if (!block.image_path) return;
    let active = true;
    const load = () => {
      createClient().storage.from(SHEET_BUCKET).createSignedUrl(block.image_path, 3600).then(({ data, error }) => {
        if (active) setResult(error ? { path: block.image_path, error: error.message } : { path: block.image_path, url: data.signedUrl });
      });
    };
    load();
    const timer = setInterval(load, 45 * 60 * 1000);
    return () => { active = false; clearInterval(timer); };
  }, [block.image_path]);
  if (!block.image_path) return null;
  if (result?.path !== block.image_path) return <div className="aspect-video animate-pulse rounded-xl bg-black/10" />;
  if (result.error) return <p role="alert" className="rounded-xl bg-red-100 p-3 text-sm text-red-800">Afbeelding laden mislukt: {result.error}</p>;
  return <Image src={result.url!} alt={block.image_alt} width={1000} height={600} unoptimized className={`aspect-video w-full rounded-xl bg-black/5 ${block.image_fit === "contain" ? "object-contain" : "object-cover"}`} />;
}

function Block({ block, accent }: { block: SheetBlock; accent: string }) {
  const [open, setOpen] = useState(false);
  if (block.type === "reveal") {
    return (
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="group relative block aspect-video w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: accent, perspective: "1000px" }}>
        <div className={`relative h-full w-full transition-transform duration-500 motion-reduce:transition-none group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)] ${open ? "[transform:rotateY(180deg)]" : ""}`} style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 overflow-hidden rounded-xl border border-black/10" style={{ backfaceVisibility: "hidden" }}>
            <BlockImage block={block} />
            {!block.image_path && <div className="aspect-video bg-black/10" />}
            <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-3 py-1 text-xs text-white">Bekijk antwoord</span>
          </div>
          <div className="absolute inset-0 overflow-y-auto rounded-xl bg-[#10251f] p-5 text-white" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <strong className="text-lg">{block.title}</strong>
            <RichText text={block.body} className="mt-2 text-sm" />
          </div>
        </div>
      </button>
    );
  }
  return (
    <article className={`rounded-xl ${block.type === "callout" ? "p-5" : ""}`} style={block.type === "callout" ? { backgroundColor: `${accent}30` } : undefined}>
      {block.type === "image" && <BlockImage block={block} />}
      {block.title && <h3 className="mt-2 text-lg font-bold">{block.title}</h3>}
      {block.body && <RichText text={block.body} className="mt-2 text-sm leading-relaxed" />}
    </article>
  );
}

export default function SheetPageView({ page }: { page: SheetPage }) {
  return (
    <article className="overflow-hidden rounded-2xl shadow-xl" style={{ backgroundColor: page.background_color, color: page.text_color }}>
      <header className="px-6 py-7 sm:px-10" style={{ backgroundColor: page.accent_color, color: page.header_text_color }}>
        {page.subtitle && <p className="mb-1 text-xs font-bold uppercase tracking-widest">{page.subtitle}</p>}
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{page.title}</h2>
      </header>
      <div className={`grid gap-5 p-6 sm:p-10 ${page.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : page.columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {page.blocks.map((block) => <div key={block.id} className={block.width === "full" ? "sm:col-span-full" : ""}><Block block={block} accent={page.accent_color} /></div>)}
      </div>
    </article>
  );
}
