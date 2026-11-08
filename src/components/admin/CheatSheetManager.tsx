  "use client";

  import { useCallback, useEffect, useState, type DragEvent } from "react";
  import { createClient } from "../../lib/supabase";
  import { blocksByColumn, legacySheetRows, moveSheetBlock, newBlock, setSheetRowColumns, SHEET_BUCKET, type SheetBlock, type SheetBlockType, type SheetPage, type SheetRow } from "../../lib/cheat-sheet";
  import SheetPageView, { SheetBlockView } from "../cheat-sheet/SheetPageView";
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
    const [dragId, setDragId] = useState<string | null>(null);
    const [dragType, setDragType] = useState<SheetBlockType | null>(null);
    const [addingColumn, setAddingColumn] = useState<string | null>(null);
    const [preview, setPreview] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
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
      if (draft?.id !== page.id) {
        const layout = page.sheet_rows == null ? legacySheetRows(page.blocks, page.columns) : null;
        setDraft(layout ? { ...page, sheet_rows: layout.rows, blocks: layout.blocks } : page);
        setEditingBlockId(null);
        setAddingColumn(null);
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
        const layout = legacySheetRows(page.blocks, page.columns);
        setDraft({ ...page, sheet_rows: layout.rows, blocks: layout.blocks });
        setDirty(false);
        await load();
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
          <label className="block text-sm">Afbeelding passend maken<select className={input} value={block.image_fit} onChange={(event) => patchBlock(block.id, { image_fit: event.target.value === "contain" ? "contain" : "cover" })}><option value="cover">Vullen (kan bijsnijden)</option><option value="contain">Volledige afbeelding</option></select></label>
        </>}
        <label className="block text-sm">Verplaats naar rij<select className={input} value={row.id} onChange={(event) => move(block.id, event.target.value, 0)}>{draft.sheet_rows?.map((item, index) => <option key={item.id} value={item.id}>Rij {index + 1}</option>)}</select></label>
        </>}
      </div>;
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
            <div className="grid gap-3 rounded-2xl border border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm">Hoofdstuknummer<input className={input} type="number" min="0" step="1" placeholder="Automatisch" value={draft.chapter_number ?? ""} onChange={(e) => patch({ chapter_number: e.target.value === "" ? null : Number(e.target.value) })} /></label>
              <label className="text-sm">Hoofdstuknaam<input className={input} value={draft.title} onChange={(e) => patch({ title: e.target.value })} /></label>
              <label className="text-sm">Ondertitel<input className={input} value={draft.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} /></label>
              <label className="text-sm">Paginavolgorde<input className={input} type="number" step="1" value={draft.sort_order} onChange={(e) => patch({ sort_order: e.target.value === "" ? NaN : Number(e.target.value) })} /></label>
              <label className="text-sm">Accentkleur<input className={`${input} h-11`} type="color" value={draft.accent_color} onChange={(e) => patch({ accent_color: e.target.value })} /></label>
              <label className="text-sm">Achtergrondkleur<input className={`${input} h-11`} type="color" value={draft.background_color} onChange={(e) => patch({ background_color: e.target.value })} /></label>
              <label className="text-sm">Tekstkleur<input className={`${input} h-11`} type="color" value={draft.text_color} onChange={(e) => patch({ text_color: e.target.value })} /></label>
              <label className="text-sm">Tekstkleur kop<input className={`${input} h-11`} type="color" value={draft.header_text_color} onChange={(e) => patch({ header_text_color: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_published} onChange={(e) => patch({ is_published: e.target.checked })} /> Gepubliceerd</label>
            </div>
            <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-surface p-3 shadow-lg"><button type="button" onClick={save} disabled={busy || !dirty} className="rounded-xl bg-lime px-5 py-2 font-bold text-ink disabled:opacity-40">Opslaan</button><button type="button" onClick={remove} disabled={busy} className={button}>Pagina verwijderen</button>{dirty && <span className="text-sm text-paper/60">Niet-opgeslagen wijzigingen</span>}</div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-xl font-bold">Pagina bewerken</h2>
              <button type="button" className={button} disabled={busy || preview} onClick={() => patch({ sheet_rows: [...(draft.sheet_rows ?? []), { id: crypto.randomUUID(), columns: 1 }] })}>+ Rij toevoegen</button>
              <button type="button" className={button} onClick={() => setPreview(!preview)} aria-pressed={preview}>{preview ? "Verder bewerken" : "Bekijk als leerling"}</button>
            </div>
            <p className="text-sm text-paper/60">Kies per rij één tot drie kolommen. Sleep blokken naar een kolom of voeg ze toe met de plusknop. Bij minder kolommen blijven alle blokken behouden.</p>
            {!preview && <div className="flex flex-wrap gap-2" aria-label="Blokken om naar de pagina te slepen">
              {(Object.keys(labels) as SheetBlockType[]).map((type) => <span key={type} draggable={!busy}
                onDragStart={(event) => { setDragId(null); setDragType(type); event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("text/plain", type); }}
                onDragEnd={() => setDragType(null)} className={`${button} cursor-grab`}>⋮⋮ {labels[type]}</span>)}
            </div>}
            <SheetPageView page={draft}>{preview ? undefined : (
              <div className="space-y-5 p-4 sm:p-6">
                {(draft.sheet_rows ?? []).map((row, rowIndex) => {
                    return <div key={row.id} className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface p-3 text-paper">
                        <strong className="mr-auto text-sm">Rij {rowIndex + 1}</strong>
                        <label className="text-sm">Kolommen
                          <select aria-label={`Aantal kolommen in rij ${rowIndex + 1}`} className="ml-2 rounded-lg border border-white/20 bg-surface-raised px-3 py-2" value={row.columns} onChange={(event) => updateRowColumns(row, Number(event.target.value))}>
                            <option value={1}>1 kolom</option><option value={2}>2 kolommen</option><option value={3}>3 kolommen</option>
                          </select>
                        </label>
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
          </section>}
        </div>
      </main>
    );
  }
