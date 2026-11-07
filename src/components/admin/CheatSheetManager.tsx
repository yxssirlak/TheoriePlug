"use client";

import { useCallback, useEffect, useState, type DragEvent } from "react";
import { createClient } from "../../lib/supabase";
import { moveBlock, newBlock, SHEET_BUCKET, type SheetBlock, type SheetBlockType, type SheetPage } from "../../lib/cheat-sheet";
import SheetPageView from "../cheat-sheet/SheetPageView";
import Notification from "../ui/Notification";
import { useDialogs } from "./Dialog";
import { SkeletonList } from "../ui/PageSkeleton";

const input = "mt-1 w-full rounded-xl border border-white/10 bg-surface-raised px-3 py-2 text-paper outline-none focus:border-lime";
const button = "rounded-xl border border-white/20 px-3 py-2 text-sm font-bold text-paper hover:border-lime disabled:opacity-40";
const labels: Record<SheetBlockType, string> = { text: "Tekst", image: "Afbeelding", reveal: "Draaikaart", callout: "Uitgelicht" };

export default function CheatSheetManager() {
  const [supabase] = useState(createClient);
  const [pages, setPages] = useState<SheetPage[]>([]);
  const [draft, setDraft] = useState<SheetPage | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const { confirm, element: dialogs } = useDialogs();

  const load = useCallback(() => (async () => {
    const { data, error } = await supabase.from("cheat_sheet_pages").select("*").order("sort_order").order("created_at");
    if (error) throw new Error(error.message);
    return data as SheetPage[];
  })().then(setPages), [supabase]);

  useEffect(() => {
    let active = true;
    load().catch((error: unknown) => { if (active) setMessage({ type: "error", text: error instanceof Error ? error.message : "Laden mislukt." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function patch(changes: Partial<SheetPage>) {
    setDraft((current) => current ? { ...current, ...changes } : current);
    setDirty(true);
  }

  function patchBlock(id: string, changes: Partial<SheetBlock>) {
    if (draft) patch({ blocks: draft.blocks.map((block) => block.id === id ? { ...block, ...changes } : block) });
  }

  async function canLeave() {
    return !dirty || await confirm({ title: "Wijzigingen verlaten?", message: "Niet-opgeslagen wijzigingen gaan verloren.", confirmLabel: "Verlaten" });
  }

  async function select(page: SheetPage) {
    if (busy || (draft?.id !== page.id && !await canLeave())) return;
    if (draft?.id !== page.id) { setDraft(page); setDirty(false); }
  }

  async function createPage() {
    if (!await canLeave()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.from("cheat_sheet_pages").insert({ title: "Nieuwe pagina", sort_order: pages.length }).select("*").single();
      if (error) throw new Error(error.message);
      setDraft(data as SheetPage);
      setDirty(false);
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Pagina aanmaken mislukt." });
    } finally { setBusy(false); }
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim() || !Number.isSafeInteger(draft.sort_order)) {
      setMessage({ type: "error", text: "Vul een titel en een geldige volgorde in." });
      return;
    }
    if (draft.blocks.some((block) => (block.type === "image" || block.type === "reveal") && (!block.image_path || !block.image_alt.trim()))) {
      setMessage({ type: "error", text: "Voeg voor elk afbeeldingsblok een afbeelding en beschrijving toe." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { title, subtitle, accent_color, background_color, text_color, header_text_color, columns, blocks, sort_order, is_published } = draft;
      const { data, error } = await supabase.from("cheat_sheet_pages").update({ title, subtitle, accent_color, background_color, text_color, header_text_color, columns, blocks, sort_order, is_published }).eq("id", draft.id).select("*").single();
      if (error) throw new Error(error.message);
      setDraft(data as SheetPage);
      setDirty(false);
      await load();
      setMessage({ type: "success", text: "Pagina opgeslagen." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Opslaan mislukt." });
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!draft || !await confirm({ title: "Pagina verwijderen?", message: "Deze pagina en alle blokken worden verwijderd. Geüploade afbeeldingen blijven in de opslag staan." })) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.from("cheat_sheet_pages").delete().eq("id", draft.id);
      if (error) throw new Error(error.message);
      setDraft(null);
      setDirty(false);
      await load();
      setMessage({ type: "success", text: "Pagina verwijderd." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Verwijderen mislukt." });
    } finally { setBusy(false); }
  }

  async function upload(blockId: string, file: File) {
    if (!draft || busy) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "Kies een JPG, PNG, WebP of GIF van maximaal 10 MB." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const path = `${draft.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from(SHEET_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      patchBlock(blockId, { image_path: path });
      setMessage({ type: "success", text: "Afbeelding geüpload. Sla de pagina op om deze te bewaren." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Uploaden mislukt." });
    } finally { setBusy(false); }
  }

  function reorder(from: number, to: number) {
    if (!busy && draft && from !== to) patch({ blocks: moveBlock(draft.blocks, from, to) });
    setDragIndex(null);
  }

  return (
    <main className="p-6">
      {dialogs}
      {message && <Notification type={message.type} onDismiss={() => setMessage(null)}>{message.text}</Notification>}
      <h1 className="font-display text-2xl font-extrabold text-lime">Cheat sheet boek</h1>
      <p className="mt-1 text-sm text-paper/60">Maak pagina&apos;s met eigen kleuren en sleep blokken in de gewenste volgorde. Wijzigingen worden zichtbaar na opslaan en publiceren.</p>
      <div className="mt-6 grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside>
          <button type="button" className={button} disabled={busy} onClick={createPage}>+ Pagina</button>
          {loading && <div role="status" aria-label="Pagina's laden" className="mt-3"><span className="sr-only">Pagina&apos;s laden...</span><SkeletonList /></div>}
          <ul className="mt-4 space-y-2">{pages.map((page) => <li key={page.id}><button type="button" disabled={busy} onClick={() => select(page)} className={`w-full rounded-xl border p-3 text-left text-sm ${draft?.id === page.id ? "border-lime text-lime" : "border-white/10 text-paper"}`}>{page.is_published ? "●" : "○"} {page.title}</button></li>)}</ul>
        </aside>
        {draft && <section className="min-w-0 space-y-5">
          <fieldset disabled={busy} className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2">
            <label className="text-sm">Paginatitel<input className={input} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></label>
            <label className="text-sm">Ondertitel<input className={input} value={draft.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} /></label>
            <label className="text-sm">Volgorde<input className={input} type="number" step="1" value={draft.sort_order} onChange={(e) => patch({ sort_order: e.target.value === "" ? NaN : Number(e.target.value) })} /></label>
            <label className="text-sm">Kolommen<select className={input} value={draft.columns} onChange={(e) => patch({ columns: Number(e.target.value) })}><option value={1}>1 kolom</option><option value={2}>2 kolommen</option><option value={3}>3 kolommen</option></select></label>
            <label className="text-sm">Accentkleur<input className={`${input} h-11`} type="color" value={draft.accent_color} onChange={(e) => patch({ accent_color: e.target.value })} /></label>
            <label className="text-sm">Achtergrondkleur<input className={`${input} h-11`} type="color" value={draft.background_color} onChange={(e) => patch({ background_color: e.target.value })} /></label>
            <label className="text-sm">Tekstkleur<input className={`${input} h-11`} type="color" value={draft.text_color} onChange={(e) => patch({ text_color: e.target.value })} /></label>
            <label className="text-sm">Tekstkleur kop<input className={`${input} h-11`} type="color" value={draft.header_text_color} onChange={(e) => patch({ header_text_color: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_published} onChange={(e) => patch({ is_published: e.target.checked })} /> Gepubliceerd</label>
          </div>
          <div className="flex flex-wrap gap-2">{(Object.keys(labels) as SheetBlockType[]).map((type) => <button key={type} type="button" className={button} disabled={busy} onClick={() => patch({ blocks: [...draft.blocks, newBlock(type)] })}>+ {labels[type]}</button>)}</div>
          <p className="text-sm text-paper/60">Sleep via de greep of gebruik de pijlen. Bij een draaikaart verschijnt het antwoord bij hover, focus of tik.</p>
          <div className="space-y-3">{draft.blocks.map((block, index) => <div key={block.id} onDragOver={(e) => { if (dragIndex !== null) e.preventDefault(); }} onDrop={(e) => { if (dragIndex !== null) { e.preventDefault(); reorder(dragIndex, index); } }} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span draggable={!busy} onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} className="cursor-grab px-2 text-paper/60" title="Sleep om te verplaatsen" aria-hidden="true">⋮⋮</span>
              <strong className="mr-auto">{index + 1}. {labels[block.type]}</strong>
              <button type="button" className={button} disabled={busy || index === 0} onClick={() => reorder(index, index - 1)} aria-label="Blok omhoog">↑</button>
              <button type="button" className={button} disabled={busy || index === draft.blocks.length - 1} onClick={() => reorder(index, index + 1)} aria-label="Blok omlaag">↓</button>
              <button type="button" className={button} disabled={busy} onClick={() => patch({ blocks: draft.blocks.filter((item) => item.id !== block.id) })}>Verwijder blok</button>
            </div>
            <label className="block text-sm">Titel<input className={input} value={block.title} onChange={(e) => patchBlock(block.id, { title: e.target.value })} /></label>
            <label className="block text-sm">{block.type === "reveal" ? "Antwoord" : "Tekst"}<textarea className={input} rows={3} value={block.body} onChange={(e) => patchBlock(block.id, { body: e.target.value })} placeholder="Begin een regel met - voor een opsomming" /></label>
            {(block.type === "image" || block.type === "reveal") && <>
              <label className="block rounded-xl border border-dashed border-white/25 p-4 text-sm" onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }} onDrop={(e: DragEvent<HTMLLabelElement>) => { if (e.dataTransfer.files.length) { e.preventDefault(); e.stopPropagation(); void upload(block.id, e.dataTransfer.files[0]); } }}>
                Sleep een afbeelding hierheen of kies een bestand (max. 10 MB).
                <input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(block.id, file); e.target.value = ""; }} />
                {block.image_path && <span className="mt-2 block text-lime">Afbeelding toegevoegd</span>}
              </label>
              <label className="block text-sm">Beschrijving afbeelding (toegankelijkheid)<input className={input} value={block.image_alt} onChange={(e) => patchBlock(block.id, { image_alt: e.target.value })} /></label>
              <label className="block text-sm">Afbeelding passend maken<select className={input} value={block.image_fit} onChange={(e) => patchBlock(block.id, { image_fit: e.target.value === "contain" ? "contain" : "cover" })}><option value="cover">Vullen (kan bijsnijden)</option><option value="contain">Volledige afbeelding</option></select></label>
            </>}
            <label className="block text-sm">Breedte<select className={input} value={block.width} onChange={(e) => patchBlock(block.id, { width: e.target.value === "full" ? "full" : "normal" })}><option value="normal">Eén kolom</option><option value="full">Volledige breedte</option></select></label>
          </div>)}</div>
          <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={busy || !dirty} className="rounded-xl bg-lime px-5 py-2 font-bold text-ink disabled:opacity-40">Opslaan</button><button type="button" onClick={remove} disabled={busy} className={button}>Pagina verwijderen</button>{dirty && <span className="text-sm text-paper/60">Niet-opgeslagen wijzigingen</span>}</div>
          </fieldset>
          <h2 className="font-display text-xl font-bold">Voorbeeld</h2>
          <SheetPageView page={draft} />
        </section>}
      </div>
    </main>
  );
}
