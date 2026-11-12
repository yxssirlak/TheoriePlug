  "use client";

  import { useCallback, useEffect, useState, type DragEvent } from "react";
  import { createClient } from "../../lib/supabase";
  import { blocksByColumn, lastEditedSheet, LAST_EDITED_SHEET_KEY, legacySheetRows, moveSheetBlock, newBlock, setSheetRowColumns, SHEET_BUCKET, type SheetBlock, type SheetBlockType, type SheetPage, type SheetRow } from "../../lib/cheat-sheet";
  import SheetPageView, { SheetBlockView } from "../cheat-sheet/SheetPageView";
  import Notification from "../ui/Notification";
  import { useDialogs } from "./Dialog";
  import { SkeletonList } from "../ui/PageSkeleton";
  import ExamSelect from "./exam-builder/ExamSelect";
  import { ExamToggle } from "./exam-builder/ExamToggle";

  const input = "mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.09] bg-[#202024] px-3.5 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none transition focus:border-[#CCFF00]/45 focus:ring-2 focus:ring-[#CCFF00]/10";
  const button = "inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/75 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] disabled:opacity-40";
  const label = "block min-w-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50";
  const labels: Record<SheetBlockType, string> = { text: "Tekst", image: "Afbeelding", reveal: "Draaikaart", callout: "Uitgelicht" };

  export default function CheatSheetManager() {
    const [supabase] = useState(createClient);
    const [pages, setPages] = useState<SheetPage[]>([]);
    const [draft, setDraft] = useState<SheetPage | null>(null);
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dragId, setDragId] = useState<string | null>(null);
    const [dragType, setDragType] = useState<SheetBlockType | null>(null);
    const [addingColumn, setAddingColumn] = useState<string | null>(null);
    const [preview, setPreview] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
    const { confirm, element: dialogs } = useDialogs();

    const load = useCallback(async () => {
      const { data, error } = await supabase.from("cheat_sheet_pages").select("*").order("sort_order").order("created_at");
      if (error) throw new Error(error.message);
      return data as SheetPage[];
    }, [supabase]);

    function prepareDraft(page: SheetPage): SheetPage {
      const layout = page.sheet_rows == null ? legacySheetRows(page.blocks, page.columns) : null;
      return layout ? { ...page, sheet_rows: layout.rows, blocks: layout.blocks } : page;
    }

    function rememberEdited(id: string) {
      try { window.localStorage.setItem(LAST_EDITED_SHEET_KEY, id); }
      catch (error) { console.warn("Laatst bewerkte cheatsheetpagina kon niet worden onthouden:", error); }
    }

    useEffect(() => {
      let active = true;
      load().then((loaded) => {
        if (!active) return;
        setPages(loaded);
        let lastId: string | null = null;
        try { lastId = window.localStorage.getItem(LAST_EDITED_SHEET_KEY); }
        catch (error) { console.warn("Laatst bewerkte cheatsheetpagina kon niet worden geladen:", error); }
        const page = lastEditedSheet(loaded, lastId);
        if (page) setDraft(prepareDraft(page));
      }).catch((error: unknown) => { if (active) setMessage({ type: "error", text: error instanceof Error ? error.message : "Laden mislukt." }); })
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
      if (draft) rememberEdited(draft.id);
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
      if (draft?.id !== page.id) {
        setDraft(prepareDraft(page));
        setEditingBlockId(null);
        setAddingColumn(null);
        setPreview(false);
        setDirty(false);
      }
    }

    async function createPage() {
      if (!await canLeave()) return;
      setBusy(true);
      setMessage(null);
      try {
        const { data, error } = await supabase.from("cheat_sheet_pages").insert({ title: "Nieuwe pagina", sort_order: pages.length }).select("*").single();
        if (error) throw new Error(error.message);
        const page = data as SheetPage;
        setDraft(prepareDraft(page));
        rememberEdited(page.id);
        setEditingBlockId(null);
        setAddingColumn(null);
        setPreview(false);
        setDirty(false);
        setPages(await load());
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Pagina aanmaken mislukt." });
      } finally { setBusy(false); }
    }

    async function save() {
      if (!draft) return;
      if (!draft.title.trim() || !Number.isSafeInteger(draft.sort_order) || (draft.chapter_number !== null && (!Number.isSafeInteger(draft.chapter_number) || draft.chapter_number < 0))) {
        setMessage({ type: "error", text: "Vul een hoofdstuknaam, een geldig hoofdstuknummer en een geldige volgorde in." });
        return;
      }
      if (draft.blocks.some((block) => (block.type === "image" || block.type === "reveal") && (!block.image_path || !block.image_alt.trim()))) {
        setMessage({ type: "error", text: "Voeg voor elk afbeeldingsblok een afbeelding en beschrijving toe." });
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        const { title, chapter_number, subtitle, accent_color, background_color, text_color, header_text_color, columns, blocks, sheet_rows, sort_order, is_published } = draft;
        const { data, error } = await supabase.from("cheat_sheet_pages").update({ title, chapter_number, subtitle, accent_color, background_color, text_color, header_text_color, columns, blocks, sheet_rows, sort_order, is_published }).eq("id", draft.id).select("*").single();
        if (error) throw new Error(error.message);
        setDraft(data as SheetPage);
        rememberEdited(draft.id);
        setDirty(false);
        setPages(await load());
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
        const remaining = await load();
        setPages(remaining);
        const next = lastEditedSheet(remaining, null);
        setDraft(next ? prepareDraft(next) : null);
        setEditingBlockId(null);
        setAddingColumn(null);
        setPreview(false);
        setDirty(false);
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

    function move(id: string, rowId: string, column: number, beforeId?: string) {
      if (!busy && draft && id !== beforeId) patch({ blocks: moveSheetBlock(draft.blocks, id, rowId, column, beforeId) });
      setDragId(null);
    }

    function addBlock(type: SheetBlockType, rowId: string, column: number, beforeId?: string) {
      if (!draft) return;
      const block = newBlock(type);
      patch({ blocks: moveSheetBlock([...draft.blocks, block], block.id, rowId, column, beforeId) });
      setEditingBlockId(block.id);
      setAddingColumn(null);
      setDragType(null);
    }

    function updateRowColumns(row: SheetRow, columns: number) {
      if (!draft || !draft.sheet_rows) return;
      const updated = setSheetRowColumns(draft.sheet_rows, draft.blocks, row.id, columns);
      patch({ sheet_rows: updated.rows, blocks: updated.blocks });
    }

    function moveRow(index: number, direction: number) {
      if (!draft?.sheet_rows) return;
      const target = index + direction;
      if (target < 0 || target >= draft.sheet_rows.length) return;
      const rows = [...draft.sheet_rows];
      [rows[index], rows[target]] = [rows[target], rows[index]];
      patch({ sheet_rows: rows });
    }

    async function removeRow(row: SheetRow) {
      if (!draft?.sheet_rows || draft.sheet_rows.length <= 1) return;
      const blocksInRow = draft.blocks.filter((block) => block.row_id === row.id);
      if (blocksInRow.length && !await confirm({ title: "Rij verwijderen?", message: "De blokken uit deze rij worden naar de eerste overblijvende rij verplaatst.", confirmLabel: "Verwijderen" })) return;
      const rows = draft.sheet_rows.filter((item) => item.id !== row.id);
      patch({ sheet_rows: rows, blocks: draft.blocks.map((block) => block.row_id === row.id ? { ...block, row_id: rows[0].id, column: Math.min(block.column ?? 0, rows[0].columns - 1) } : block) });
    }

    function renderBlock(block: SheetBlock, row: SheetRow, column: number, siblings: SheetBlock[]) {
      if (!draft) return null;
      const index = siblings.findIndex((item) => item.id === block.id);
      return <div key={block.id} onDragOver={(event) => { if (dragType || (dragId && dragId !== block.id)) { event.preventDefault(); event.stopPropagation(); } }}
        onDrop={(event) => { if (dragType || (dragId && dragId !== block.id)) { event.preventDefault(); event.stopPropagation(); if (dragType) addBlock(dragType, row.id, column, block.id); else if (dragId) move(dragId, row.id, column, block.id); } }}
        className="space-y-3 rounded-xl border border-white/15 bg-surface p-3 text-paper shadow-sm">
        <div className="flex flex-wrap items-center gap-1">
          <span draggable={!busy} onDragStart={(event) => { setDragType(null); setDragId(block.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", block.id); }} onDragEnd={() => setDragId(null)} className="cursor-grab px-2 text-paper/60" title="Sleep dit blok naar een kolom" aria-hidden="true">⋮⋮</span>
          <strong className="mr-auto text-sm">{labels[block.type]}</strong>
          <button type="button" className={button} aria-expanded={editingBlockId === block.id} onClick={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}>{editingBlockId === block.id ? "Sluiten" : "Bewerken"}</button>
          <button type="button" className={button} disabled={busy || column === 0} onClick={() => move(block.id, row.id, column - 1)} aria-label="Blok naar vorige kolom">←</button>
          <button type="button" className={button} disabled={busy || column === row.columns - 1} onClick={() => move(block.id, row.id, column + 1)} aria-label="Blok naar volgende kolom">→</button>
          <button type="button" className={button} disabled={busy || index <= 0} onClick={() => move(block.id, row.id, column, siblings[index - 1].id)} aria-label="Blok omhoog">↑</button>
          <button type="button" className={button} disabled={busy || index < 0 || index === siblings.length - 1} onClick={() => move(block.id, row.id, column, siblings[index + 2]?.id)} aria-label="Blok omlaag">↓</button>
          <button type="button" className={button} disabled={busy} onClick={() => patch({ blocks: draft.blocks.filter((item) => item.id !== block.id) })} aria-label={`${labels[block.type]} verwijderen`}>×</button>
        </div>
        {editingBlockId !== block.id && <div className="rounded-lg p-2" style={{ backgroundColor: draft.background_color, color: draft.text_color }}>
          {block.title || block.body || block.image_path ? <SheetBlockView block={block} accent={draft.accent_color} /> : <span className="text-sm opacity-60">Leeg blok — klik op Bewerken.</span>}
        </div>}
        {editingBlockId === block.id && <>
        <label className="block text-sm">Titel<input className={input} value={block.title} onChange={(event) => patchBlock(block.id, { title: event.target.value })} /></label>
        <label className="block text-sm">{block.type === "reveal" ? "Antwoord" : "Tekst"}<textarea className={input} rows={3} value={block.body} onChange={(event) => patchBlock(block.id, { body: event.target.value })} placeholder="Begin een regel met - voor een opsomming" /></label>
        {(block.type === "image" || block.type === "reveal") && <>
          <label className="block rounded-xl border border-dashed border-white/25 p-3 text-sm" onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event: DragEvent<HTMLLabelElement>) => { if (event.dataTransfer.files.length) { event.preventDefault(); event.stopPropagation(); void upload(block.id, event.dataTransfer.files[0]); } }}>
            Sleep een afbeelding hierheen of kies een bestand (max. 10 MB).
            <input className="mt-2 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(block.id, file); event.target.value = ""; }} />
            {block.image_path && <span className="mt-2 block text-lime">Afbeelding toegevoegd</span>}
          </label>
          <label className="block text-sm">Beschrijving afbeelding<input className={input} value={block.image_alt} onChange={(event) => patchBlock(block.id, { image_alt: event.target.value })} /></label>
          <div className="space-y-1.5"><span className={label}>Afbeelding passend maken</span><ExamSelect label="Afbeelding passend maken" value={block.image_fit} options={[{ value: "cover", label: "Vullen (kan bijsnijden)" }, { value: "contain", label: "Volledige afbeelding" }]} onChange={(image_fit) => patchBlock(block.id, { image_fit })} disabled={busy} /></div>
        </>}
        <div className="space-y-1.5"><span className={label}>Verplaats naar rij</span><ExamSelect label="Verplaats naar rij" value={row.id} options={(draft.sheet_rows ?? []).map((item, index) => ({ value: item.id, label: `Rij ${index + 1}` }))} onChange={(id) => move(block.id, id, 0)} disabled={busy} /></div>
        </>}
      </div>;
    }

    return (
      <main className="-m-4 min-h-screen bg-[#0e0e11] px-4 py-6 text-white sm:-m-6 sm:px-6 sm:py-8 lg:-m-10 lg:px-10 lg:py-10">
        {dialogs}
        {message && <Notification type={message.type} onDismiss={() => setMessage(null)}>{message.text}</Notification>}
        <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Cheat sheet boek</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/50">Beheer je pagina&apos;s en bewerk de inhoud. Wijzigingen zijn zichtbaar na opslaan en publiceren.</p>
          </div>
          {draft && <div className="flex flex-wrap items-center gap-2">
            <span role="status" className={`mr-1 text-xs ${dirty ? "text-amber-300" : "text-white/45"}`}>{dirty ? "Niet opgeslagen" : "Opgeslagen"}</span>
            <button type="button" className={button} disabled={busy} onClick={() => setPreview(!preview)} aria-pressed={preview}>{preview ? "Verder bewerken" : "Bekijk als leerling"}</button>
            <button type="button" onClick={save} disabled={busy || !dirty} className="inline-flex h-11 items-center justify-center rounded-xl bg-[#CCFF00] px-5 text-sm font-bold text-[#10140a] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] disabled:opacity-40">Opslaan</button>
          </div>}
        </header>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section aria-labelledby="sheet-pages-title" className="rounded-3xl border border-white/[0.08] bg-[#18181b] p-4">
              <div className="flex items-center justify-between gap-3">
                <div><h2 id="sheet-pages-title" className="text-sm font-bold">Pagina&apos;s</h2><p className="mt-1 text-xs text-white/40">{pages.length} pagina&apos;s</p></div>
                <button type="button" className={button} disabled={busy} onClick={createPage}>+ Pagina</button>
              </div>
              {loading && <div role="status" aria-label="Pagina's laden" className="mt-3"><span className="sr-only">Pagina&apos;s laden...</span><SkeletonList /></div>}
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">{pages.map((page, index) => <li key={page.id}><button type="button" disabled={busy} onClick={() => void select(page)} aria-current={draft?.id === page.id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-[#CCFF00] ${draft?.id === page.id ? "border-[#CCFF00]/40 bg-[#CCFF00]/[0.07] text-white" : "border-white/[0.07] bg-white/[0.02] text-white/70 hover:border-white/20"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] font-mono text-xs text-white/50">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{page.title}</span><span className={`mt-0.5 block text-[10px] ${page.is_published ? "text-[#CCFF00]/70" : "text-white/40"}`}>{page.is_published ? "Gepubliceerd" : "Concept"}</span></span></button></li>)}</ul>
            </section>
            {draft && <fieldset disabled={busy} className="space-y-4 rounded-3xl border border-white/[0.08] bg-[#18181b] p-4">
              <legend className="sr-only">Pagina-instellingen</legend>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#CCFF00]/65">Geselecteerde pagina</p><h2 className="mt-1 text-sm font-bold">Pagina-instellingen</h2></div>
              <label className={label}>Hoofdstuknaam<input className={input} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></label>
              <label className={label}>Ondertitel<input className={input} value={draft.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>Hoofdstuknummer<input className={input} type="number" min="0" step="1" placeholder="Automatisch" value={draft.chapter_number ?? ""} onChange={(e) => patch({ chapter_number: e.target.value === "" ? null : Number(e.target.value) })} /></label>
                <label className={label}>Paginavolgorde<input className={input} type="number" step="1" value={draft.sort_order} onChange={(e) => patch({ sort_order: e.target.value === "" ? NaN : Number(e.target.value) })} /></label>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                <label className={label}>Accentkleur<input className={`${input} h-11 cursor-pointer p-1.5`} type="color" value={draft.accent_color} onChange={(e) => patch({ accent_color: e.target.value })} /></label>
                <label className={label}>Achtergrondkleur<input className={`${input} h-11 cursor-pointer p-1.5`} type="color" value={draft.background_color} onChange={(e) => patch({ background_color: e.target.value })} /></label>
                <label className={label}>Tekstkleur<input className={`${input} h-11 cursor-pointer p-1.5`} type="color" value={draft.text_color} onChange={(e) => patch({ text_color: e.target.value })} /></label>
                <label className={label}>Tekstkleur kop<input className={`${input} h-11 cursor-pointer p-1.5`} type="color" value={draft.header_text_color} onChange={(e) => patch({ header_text_color: e.target.value })} /></label>
              </div>
              <ExamToggle checked={draft.is_published} onChange={(is_published) => patch({ is_published })} label={draft.is_published ? "Gepubliceerd" : "Concept"} disabled={busy} />
              <button type="button" onClick={() => void remove()} disabled={busy} className={`${button} w-full border-red-300/10 text-red-200/65 hover:border-red-300/30 hover:text-red-100`}>Pagina verwijderen</button>
            </fieldset>}
          </aside>
          {draft && <section className="min-w-0 space-y-5">
            <fieldset disabled={busy} className="space-y-5">
            <div className="rounded-3xl border border-white/[0.08] bg-[#18181b] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-auto"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#CCFF00]/65">Inhoud</p><h2 className="mt-1 text-sm font-bold">Pagina bewerken</h2></div>
              <button type="button" className={button} disabled={busy || preview} onClick={() => patch({ sheet_rows: [...(draft.sheet_rows ?? []), { id: crypto.randomUUID(), columns: 1 }] })}>+ Rij toevoegen</button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-white/45">Kies per rij één tot drie kolommen. Sleep blokken naar een kolom of voeg ze toe met de plusknop. Bij minder kolommen blijven alle blokken behouden.</p>
            {!preview && <div className="mt-4 flex flex-wrap gap-2" aria-label="Blokken om naar de pagina te slepen">
              {(Object.keys(labels) as SheetBlockType[]).map((type) => <span key={type} draggable={!busy}
                onDragStart={(event) => { setDragId(null); setDragType(type); event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("text/plain", type); }}
                onDragEnd={() => setDragType(null)} className={`${button} cursor-grab`}>⋮⋮ {labels[type]}</span>)}
            </div>}
            </div>
            <SheetPageView page={draft}>{preview ? undefined : (
              <div className="space-y-5 p-4 sm:p-6">
                {(draft.sheet_rows ?? []).map((row, rowIndex) => {
                    return <div key={row.id} className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3 text-paper">
                        <strong className="mr-auto text-sm">Rij {rowIndex + 1}</strong>
                        <div className="w-36"><ExamSelect label={`Aantal kolommen in rij ${rowIndex + 1}`} value={String(row.columns)} options={[{ value: "1", label: "1 kolom" }, { value: "2", label: "2 kolommen" }, { value: "3", label: "3 kolommen" }]} onChange={(value) => updateRowColumns(row, Number(value))} disabled={busy} /></div>
                        <button type="button" className={button} disabled={busy || rowIndex === 0} onClick={() => moveRow(rowIndex, -1)} aria-label={`Rij ${rowIndex + 1} omhoog`}>↑</button>
                        <button type="button" className={button} disabled={busy || rowIndex === (draft.sheet_rows?.length ?? 0) - 1} onClick={() => moveRow(rowIndex, 1)} aria-label={`Rij ${rowIndex + 1} omlaag`}>↓</button>
                        <button type="button" className={button} disabled={busy} onClick={() => { const rows = [...(draft.sheet_rows ?? [])]; rows.splice(rowIndex + 1, 0, { id: crypto.randomUUID(), columns: 1 }); patch({ sheet_rows: rows }); }}>+ Rij hieronder</button>
                        <button type="button" className={button} disabled={busy || (draft.sheet_rows?.length ?? 0) <= 1} onClick={() => void removeRow(row)}>Rij verwijderen</button>
                      </div>
                      <div className={`grid gap-4 ${row.columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : row.columns === 2 ? "sm:grid-cols-2" : ""}`}>
                      {blocksByColumn(draft.blocks.filter((block) => block.row_id === row.id), row.columns).map((blocks, column) => {
                        const addKey = `${row.id}-${column}`;
                        return <div key={column} onDragOver={(event) => { if (dragId || dragType) event.preventDefault(); }} onDrop={(event) => { if (dragId || dragType) { event.preventDefault(); if (dragType) addBlock(dragType, row.id, column); else if (dragId) move(dragId, row.id, column); } }} className="min-w-0 space-y-3 rounded-xl border border-dashed border-current/30 p-3">
                          <span className="block text-xs font-bold uppercase opacity-70">Kolom {column + 1}</span>
                          {blocks.map((block) => renderBlock(block, row, column, blocks))}
                          <button type="button" className={`${button} w-full bg-surface`} disabled={busy} aria-expanded={addingColumn === addKey} onClick={() => setAddingColumn(addingColumn === addKey ? null : addKey)}>+ Blok toevoegen</button>
                          {addingColumn === addKey && <div className="grid gap-2 rounded-xl bg-surface p-2 text-paper">{(Object.keys(labels) as SheetBlockType[]).map((type) => <button key={type} type="button" className={button} onClick={() => addBlock(type, row.id, column)}>+ {labels[type]}</button>)}</div>}
                        </div>;
                      })}
                      </div>
                    </div>;
                  })}
              </div>
            )}</SheetPageView>
            </fieldset>
            <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#18181b]/95 p-3 shadow-xl backdrop-blur">
              <span role="status" className={`text-xs ${dirty ? "text-amber-300" : "text-white/45"}`}>{dirty ? "Niet-opgeslagen wijzigingen" : "Alle wijzigingen opgeslagen"}</span>
              <div className="flex items-center gap-2">
                <button type="button" className={button} disabled={busy} onClick={() => setPreview(!preview)} aria-pressed={preview}>{preview ? "Verder bewerken" : "Bekijk als leerling"}</button>
                <button type="button" onClick={() => void save()} disabled={busy || !dirty} className="inline-flex h-10 items-center justify-center rounded-xl bg-[#CCFF00] px-4 text-xs font-bold text-[#10140a] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] disabled:opacity-40">Opslaan</button>
              </div>
            </div>
          </section>}
          {!draft && !loading && <section className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#18181b]/65 p-6 text-center text-sm text-white/50">Maak een pagina aan om te beginnen.</section>}
        </div>
        </div>
      </main>
    );
  }
