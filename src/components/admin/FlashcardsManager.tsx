"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { createClient } from "../../lib/supabase";
import { uploadMedia } from "../../lib/course/storage";
import { fetchAllPages, updateCardSelection, type Flashcard, type FlashcardCategory } from "../../lib/flashcards";
import { useDialogs } from "./Dialog";
import GlassSelect from "../ui/GlassSelect";
import Notification from "../ui/Notification";

type Lesson = { id: string; title: string; is_published: boolean };
type CategoryDraft = Omit<FlashcardCategory, "id"> & { id?: string };
type CardDraft = Omit<Flashcard, "id"> & { id?: string };
const emptyCategory = (): CategoryDraft => ({ name: "", slug: "", sort_order: 0, lesson_id: null });
const emptyCard = (categoryId = ""): CardDraft => ({ category_id: categoryId, front: "", back: "", image_url: null, explanation: "", sort_order: 0, is_published: false });
const input = "mt-1 w-full rounded-xl border border-white/10 bg-surface-raised px-3 py-2 text-paper outline-none focus:border-lime";
const button = "rounded-xl bg-lime px-4 py-2 text-sm font-bold text-ink disabled:opacity-50";

async function fetchData(supabase: ReturnType<typeof createClient>) {
  const [categories, cards, lessons] = await Promise.all([
    fetchAllPages<FlashcardCategory>((from, to) => supabase.from("flashcard_categories").select("id,name,slug,sort_order,lesson_id").order("sort_order").order("name").order("id").range(from, to)),
    fetchAllPages<Flashcard>((from, to) => supabase.from("flashcards").select("id,category_id,front,back,image_url,explanation,sort_order,is_published").order("sort_order").order("created_at").order("id").range(from, to)),
    fetchAllPages<Lesson>((from, to) => supabase.from("lessons").select("id,title,is_published").order("title").order("id").range(from, to)),
  ]);
  return { categories, cards, lessons };
}

export default function FlashcardsManager() {
  const [supabase] = useState(createClient);
  const [categories, setCategories] = useState<FlashcardCategory[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [category, setCategory] = useState<CategoryDraft>(emptyCategory);
  const [card, setCard] = useState<CardDraft>(() => emptyCard());
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "deleted" } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { confirm, element: dialogs } = useDialogs();

  const load = useCallback(() => fetchData(supabase).then((data) => {
    setCategories(data.categories);
    setCards(data.cards);
    setLessons(data.lessons);
  }), [supabase]);

  useEffect(() => {
    let active = true;
    load().catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Laden mislukt.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  async function run(action: () => Promise<void>, success: string, type: "success" | "deleted" = "success") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ text: success, type });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "De actie is mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.slug.trim()) || !Number.isSafeInteger(category.sort_order)) {
      setError("Vul een naam, een geldige slug met kleine letters en een geldige volgorde in.");
      return;
    }
    await run(async () => {
      const payload = { name: category.name.trim(), slug: category.slug.trim(), sort_order: category.sort_order, lesson_id: category.lesson_id };
      const result = category.id
        ? await supabase.from("flashcard_categories").update(payload).eq("id", category.id)
        : await supabase.from("flashcard_categories").insert(payload);
      if (result.error) throw new Error(result.error.message);
      setCategory(emptyCategory());
    }, "Onderwerp opgeslagen.");
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card.front.trim() || !card.back.trim() || !card.category_id || !Number.isSafeInteger(card.sort_order)) {
      setError("Kies een onderwerp en vul een vraag, antwoord en geldige volgorde in.");
      return;
    }
    await run(async () => {
      const payload = { ...card, front: card.front.trim(), back: card.back.trim(), image_url: card.image_url?.trim() || null };
      const { id, ...values } = payload;
      const result = id
        ? await supabase.from("flashcards").update(values).eq("id", id)
        : await supabase.from("flashcards").insert(values);
      if (result.error) throw new Error(result.error.message);
      setCard(emptyCard(card.category_id));
    }, "Flashcard opgeslagen.");
  }

  async function removeCard(item: Flashcard) {
    if (!await confirm({ title: "Flashcard verwijderen?", message: "Ook de voortgang van leerlingen voor deze kaart wordt verwijderd." })) return;
    await run(async () => {
      const { error: deleteError } = await supabase.from("flashcards").delete().eq("id", item.id);
      if (deleteError) throw new Error(deleteError.message);
      setSelectedIds((previous) => { const next = new Set(previous); next.delete(item.id); return next; });
      if (card.id === item.id) setCard(emptyCard(item.category_id));
    }, "Flashcard verwijderd.", "deleted");
  }

  async function removeCategory(item: FlashcardCategory) {
    if (!await confirm({ title: "Onderwerp verwijderen?", message: "Een onderwerp kan alleen worden verwijderd als het geen kaarten bevat." })) return;
    await run(async () => {
      const { error: deleteError } = await supabase.from("flashcard_categories").delete().eq("id", item.id);
      if (deleteError) throw new Error(deleteError.message);
      if (category.id === item.id) setCategory(emptyCategory());
      if (card.category_id === item.id) setCard(emptyCard());
      if (filter === item.id) setFilter("");
    }, "Onderwerp verwijderd.", "deleted");
  }

  async function removeSelected() {
    const ids = [...selectedIds];
    if (!ids.length || !await confirm({ title: `${ids.length} flashcards verwijderen?`, message: "De geselecteerde kaarten en hun leerlingvoortgang worden definitief verwijderd, ook wanneer ze door een filter verborgen zijn." })) return;
    await run(async () => {
      const { data: count, error: deleteError } = await supabase.rpc("delete_flashcards_bulk", { p_ids: ids });
      if (deleteError) throw new Error(deleteError.message);
      setSelectedIds(new Set());
      if (card.id && ids.includes(card.id)) setCard(emptyCard(card.category_id));
      if (count !== ids.length) {
        await load();
        throw new Error(`${count} van de ${ids.length} geselecteerde kaarten verwijderd; de overige kaarten bestaan mogelijk niet meer.`);
      }
    }, `${ids.length} ${ids.length === 1 ? "flashcard" : "flashcards"} verwijderd.`, "deleted");
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setNotice(null);
    setUploadProgress(0);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Kies een afbeelding.");
      const url = await uploadMedia(supabase, file, "flashcards", setUploadProgress);
      setCard((previous) => ({ ...previous, image_url: url }));
      setNotice({ text: "Afbeelding geüpload. Sla de flashcard op om deze te bewaren.", type: "success" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Uploaden mislukt.");
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
  }

  const visibleCards = cards.filter((item) => !filter || item.category_id === filter);
  const allVisibleSelected = visibleCards.length > 0 && visibleCards.every((item) => selectedIds.has(item.id));

  return (
    <div className="space-y-6">
      {dialogs}
      <div><h1 className="font-display text-2xl font-extrabold text-lime">Flashcards beheren</h1><p className="mt-1 text-sm text-paper/60">Onderwerpen, videolessen en kaarten voor het leerlingportaal.</p></div>
      {error ? <Notification onDismiss={() => setError(null)}>{error}</Notification> : notice && <Notification type={notice.type} onDismiss={() => setNotice(null)}>{notice.text}</Notification>}
      {loading ? <p>Laden...</p> : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-surface p-5">
            <h2 className="font-display text-lg font-bold">Onderwerpen</h2>
            <ul className="space-y-2">{categories.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-3 text-sm">
              <span>{item.name} <span className="text-paper/50">({item.sort_order})</span></span>
              <span className="flex gap-3"><button type="button" disabled={busy} className="text-lime" onClick={() => setCategory(item)}>Bewerken</button><button type="button" disabled={busy} className="text-red-300" onClick={() => void removeCategory(item)}>Verwijderen</button></span>
            </li>)}</ul>
            <form onSubmit={saveCategory} noValidate className="space-y-3 border-t border-white/10 pt-4">
              <fieldset disabled={busy} className="space-y-3">
              <h3 className="font-bold">{category.id ? "Onderwerp bewerken" : "Nieuw onderwerp"}</h3>
              <label className="block text-sm">Naam<input className={input} required value={category.name} onChange={(e) => setCategory({ ...category, name: e.target.value })} /></label>
              <label className="block text-sm">Slug<input className={input} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" title="Gebruik kleine letters, cijfers en verbindingsstreepjes" value={category.slug} onChange={(e) => setCategory({ ...category, slug: e.target.value })} /></label>
              <label className="block text-sm">Volgorde<input className={input} type="number" required value={category.sort_order} onChange={(e) => setCategory({ ...category, sort_order: Number(e.target.value) })} /></label>
              <div className="text-sm">Bijbehorende videoles<GlassSelect label="Bijbehorende videoles" disabled={busy} value={category.lesson_id ?? ""} onChange={(value) => setCategory({ ...category, lesson_id: value || null })} options={[{ value: "", label: "Geen koppeling" }, ...lessons.map((lesson) => ({ value: lesson.id, label: `${lesson.title}${lesson.is_published ? "" : " (concept)"}` }))]} /></div>
              <div className="flex gap-3"><button className={button} disabled={busy}>Opslaan</button><button type="button" onClick={() => setCategory(emptyCategory())} className="text-sm text-paper/60">Nieuw / annuleren</button></div>
              </fieldset>
            </form>
          </section>
          <section className="space-y-4 rounded-2xl border border-white/10 bg-surface p-5">
            <h2 className="font-display text-lg font-bold">{card.id ? "Flashcard bewerken" : "Nieuwe flashcard"}</h2>
            <form onSubmit={saveCard} noValidate className="space-y-3">
              <fieldset disabled={busy} className="space-y-3">
              <div className="text-sm">Onderwerp<GlassSelect label="Onderwerp" required disabled={busy} value={card.category_id} onChange={(value) => setCard({ ...card, category_id: value })} options={[{ value: "", label: "Kies een onderwerp" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} /></div>
              <label className="block text-sm">Vraag / term<textarea className={input} required value={card.front} onChange={(e) => setCard({ ...card, front: e.target.value })} /></label>
              <div className="text-sm">
                <span>Afbeelding (optioneel)</span>
                <div onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)}
                  onDrop={(event) => { event.preventDefault(); setDragging(false); if (busy) return; if (event.dataTransfer.files.length !== 1) { setError("Sleep één afbeelding tegelijk naar het uploadvlak."); return; } void upload(event.dataTransfer.files[0]); }}
                  className={`mt-1 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed p-4 transition ${dragging ? "border-lime bg-lime/10" : "border-paper/20 bg-white/[0.03]"}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {card.image_url ? <Image src={card.image_url} alt="Geselecteerde afbeelding" width={80} height={80} unoptimized className="h-16 w-16 rounded-lg object-cover" /> : <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime/10 text-xl text-lime">↑</span>}
                    <div><p className="font-semibold">{card.image_url ? "Afbeelding toegevoegd" : "Sleep een afbeelding hierheen"}</p><p className="mt-1 text-xs text-paper/50">{uploadProgress !== null ? `Uploaden: ${Math.round(uploadProgress * 100)}%` : "Of kies een bestand vanaf je apparaat"}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="rounded-full border border-lime/40 px-4 py-2 font-bold text-lime hover:bg-lime/10 disabled:opacity-50">Bestand kiezen</button>{card.image_url && <button type="button" disabled={busy} onClick={() => setCard({ ...card, image_url: null })} className="rounded-full border border-red-500/30 px-4 py-2 text-red-300 hover:bg-red-500/10">Verwijderen</button>}</div>
                  <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Afbeelding kiezen" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
                </div>
              </div>
              <label className="block text-sm">Antwoord<textarea className={input} required value={card.back} onChange={(e) => setCard({ ...card, back: e.target.value })} /></label>
              <label className="block text-sm">Uitgebreide uitleg<textarea className={input} rows={4} value={card.explanation ?? ""} onChange={(e) => setCard({ ...card, explanation: e.target.value })} /></label>
              <label className="block text-sm">Volgorde<input className={input} type="number" required value={card.sort_order} onChange={(e) => setCard({ ...card, sort_order: Number(e.target.value) })} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={card.is_published} onChange={(e) => setCard({ ...card, is_published: e.target.checked })} /> Gepubliceerd voor leerlingen</label>
              <div className="flex gap-3"><button className={button} disabled={busy || categories.length === 0}>Opslaan</button><button type="button" onClick={() => setCard(emptyCard())} className="text-sm text-paper/60">Nieuw / annuleren</button></div>
              </fieldset>
            </form>
          </section>
          <section className="rounded-2xl border border-white/10 bg-surface p-5 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Overzicht kaarten</h2><div className="w-full max-w-xs"><GlassSelect label="Filter op onderwerp" disabled={busy} value={filter} onChange={setFilter} options={[{ value: "", label: "Alle onderwerpen" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} /></div></div>
            <div className="mt-4 flex items-center gap-3"><button type="button" disabled={busy || selectedIds.size === 0} onClick={() => void removeSelected()} className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-40">Verwijder geselecteerd ({selectedIds.size})</button><span className="text-xs text-paper/50">Selectie blijft behouden bij filteren.</span></div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-paper/50"><tr><th className="p-2"><input type="checkbox" aria-label="Selecteer alle zichtbare kaarten" disabled={busy || visibleCards.length === 0} checked={allVisibleSelected} onChange={(event) => { const checked = event.target.checked; setSelectedIds((old) => updateCardSelection(old, visibleCards.map((item) => item.id), checked)); }} /></th><th className="p-2">Onderwerp</th><th className="p-2">Vraag</th><th className="p-2">Volgorde</th><th className="p-2">Status</th><th className="p-2">Acties</th></tr></thead><tbody>
              {visibleCards.map((item) => <tr key={item.id} className="border-t border-white/5 transition-colors hover:bg-white/[0.02]"><td className="p-2"><input type="checkbox" aria-label={`Selecteer ${item.front}`} disabled={busy} checked={selectedIds.has(item.id)} onChange={(event) => { const checked = event.target.checked; setSelectedIds((old) => updateCardSelection(old, [item.id], checked)); }} /></td><td className="p-2">{categories.find((c) => c.id === item.category_id)?.name}</td><td className="p-2">{item.front}</td><td className="p-2">{item.sort_order}</td><td className="p-2">{item.is_published ? "Gepubliceerd" : "Concept"}</td><td className="space-x-3 whitespace-nowrap p-2"><button type="button" disabled={busy} className="text-lime" onClick={() => { setCard(item); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Bewerken</button><button type="button" disabled={busy} className="text-red-300" onClick={() => void removeCard(item)}>Verwijderen</button></td></tr>)}
            </tbody></table></div>
          </section>
        </div>
      )}
    </div>
  );
}
