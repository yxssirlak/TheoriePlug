"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "../../lib/supabase";
import { blocksByColumn, sheetBlockSections, SHEET_BUCKET, type SheetBlock, type SheetPage } from "../../lib/cheat-sheet";
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

export function SheetBlockView({ block, accent }: { block: SheetBlock; accent: string }) {
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

function isColorLight(hex: string) {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

export default function SheetPageView({ page, children }: { page: SheetPage; children?: ReactNode }) {
  const isLight = isColorLight(page.accent_color);
  const patternUrl = isLight ? "/pattern-color.png" : "/pattern-white.png";

  return (
    // 'flex flex-col h-full' toegevoegd zodat de footer netjes onderaan wordt gedrukt
    <article className="overflow-hidden rounded-2xl shadow-xl flex flex-col h-full" style={{ backgroundColor: page.background_color, color: page.text_color }}>
      
      <header className="relative overflow-hidden px-6 py-7 sm:px-10" style={{ backgroundColor: page.accent_color, color: page.header_text_color }}>
        
        {/* LAAG MET HET HERHALENDE PATROON */}
        <div 
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `url('${patternUrl}')`,
            backgroundRepeat: "repeat",
            backgroundSize: "400px auto", 
            backgroundPosition: "center"
          }}
        />

        {/* CONTENT EN LOGO */}
        <div className="relative z-10 flex w-full flex-wrap items-start justify-between gap-4">
          
          {/* LINKERKANT: Hoofdstuk, Titel en Subtitel */}
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl drop-shadow-sm flex items-center gap-3">
              {/* Vult het volgorde/hoofdstuk-nummer automatisch aan met een 0 (bijv. 01, 02) */}
              <span className="opacity-60">{String(page.chapter_number ?? page.sort_order).padStart(2, '0')}</span>
              <span>{page.title}</span>
            </h2>
            {page.subtitle && (
              <p className="mt-2 text-sm font-bold uppercase tracking-widest opacity-90 drop-shadow-sm">
                {page.subtitle}
              </p>
            )}
          </div>
          
          {/* RECHTERKANT: Het TheoriePlug Logo */}
          <img 
  src="/brand/png/logo-upright-a-donker-tegel.png" 
  alt="TheoriePlug" 
  className="h-10 w-auto object-contain sm:h-14 drop-shadow-sm" 
/>
        </div>
      </header>

      {/* CONTENT VAN DE BLOKKEN */}
      {children ?? (page.sheet_rows ? (
        <div className="space-y-5 p-6 sm:p-10">
          {page.sheet_rows.map((row) => (
            <div key={row.id} className={`grid gap-5 ${row.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : row.columns === 2 ? "sm:grid-cols-2" : ""}`}>
              {blocksByColumn(page.blocks.filter((block) => block.row_id === row.id), row.columns).map((blocks, index) => <div key={index} className="space-y-5">
                {blocks.map((block) => <SheetBlockView key={block.id} block={block} accent={page.accent_color} />)}
              </div>)}
            </div>
          ))}
        </div>
      ) : page.blocks.some((block) => block.column !== undefined) ? (
        <div className="space-y-5 p-6 sm:p-10">
          {sheetBlockSections(page.blocks).map((section, sectionIndex) => section.kind === "full" ? (
            <SheetBlockView key={section.block.id} block={section.block} accent={page.accent_color} />
          ) : (
            <div key={sectionIndex} className={`grid gap-5 ${page.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : page.columns === 2 ? "sm:grid-cols-2" : ""}`}>
              {blocksByColumn(section.blocks, page.columns).map((blocks, index) => <div key={index} className="space-y-5">
                {blocks.map((block) => <SheetBlockView key={block.id} block={block} accent={page.accent_color} />)}
              </div>)}
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid gap-5 p-6 sm:p-10 ${page.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : page.columns === 2 ? "sm:grid-cols-2" : ""}`}>
          {page.blocks.map((block) => <div key={block.id} className={block.width === "full" ? "sm:col-span-full" : ""}><SheetBlockView block={block} accent={page.accent_color} /></div>)}
        </div>
      ))}

      {/* NIEUWE FOOTER ONDERAAN DE KAART */}
      {/* mt-auto drukt hem helemaal naar onder, border-current neemt de kleur over van je ingestelde text_color */}
      <footer className="relative mt-auto overflow-hidden px-6 py-4 text-xs font-bold uppercase tracking-widest sm:px-10" style={{ backgroundColor: page.accent_color, color: page.header_text_color }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `url('${patternUrl}')`, backgroundRepeat: "repeat", backgroundSize: "400px auto", backgroundPosition: "center" }} />
        <div className="relative flex items-center justify-between"><span>theorieplug.nl</span><span>Pagina {page.sort_order}</span></div>
      </footer>

    </article>
  );
}