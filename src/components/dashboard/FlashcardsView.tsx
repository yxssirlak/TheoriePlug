"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { availableCards, cardsForCategory, completedCategoryIds, fetchAllPages, nextQueue, shuffleCards, type Flashcard, type FlashcardCategory, type FlashcardProgress, type MasteryLevel } from "../../lib/flashcards";
import { PageHeader } from "./ContentState";
import { useUser } from "./user-context";
import Notification from "../ui/Notification";

type Data = { categories: FlashcardCategory[]; cards: Flashcard[]; progress: FlashcardProgress[] };
type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: Data };

export default function FlashcardsView() {
  const user = useUser();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    Promise.all([
      fetchAllPages<FlashcardCategory>((from, to) => supabase.from("flashcard_categories").select("id,name,slug,sort_order,lesson_id").order("sort_order").order("name").order("id").range(from, to)),
      fetchAllPages<Flashcard>((from, to) => supabase.from("flashcards").select("id,category_id,front,back,image_url,explanation,sort_order,is_published").eq("is_published", true).order("sort_order").order("created_at").order("id").range(from, to)),
      fetchAllPages<FlashcardProgress>((from, to) => supabase.from("user_flashcard_progress").select("flashcard_id,mastery_level").eq("user_id", user.id).order("flashcard_id").range(from, to)),
    ]).then(([categories, cards, progress]) => {
      if (!active) return;
      setState({ status: "ready", data: { categories, cards, progress } });
    }).catch((error: unknown) => {
      if (active) setState({ status: "error", message: error instanceof Error ? error.message : "Onbekende fout" });
    });
    return () => { active = false; };
  }, [user.id]);

  return (
    <>
      <PageHeader title="Flashcards" text="Oefen per onderwerp en ontdek wat je al beheerst." />
      {state.status === "loading" && <p className="text-paper/60">Flashcards laden...</p>}
      {state.status === "error" && <Notification>Laden mislukt: {state.message}</Notification>}
      {state.status === "ready" && <Deck data={state.data} userId={user.id} />}
    </>
  );
}

function Deck({ data, userId }: { data: Data; userId: string }) {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, MasteryLevel>>(() => Object.fromEntries(data.progress.map((item) => [item.flashcard_id, item.mastery_level])));
  const [cards, setCards] = useState<Flashcard[]>(() => availableCards(data.cards, completedCategoryIds(data.cards, Object.fromEntries(data.progress.map((item) => [item.flashcard_id, item.mastery_level])))));
  const [queue, setQueue] = useState<string[]>(() => availableCards(data.cards, completedCategoryIds(data.cards, Object.fromEntries(data.progress.map((item) => [item.flashcard_id, item.mastery_level])))).map((card) => card.id));
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState({ hard: 0, doubt: 0, mastered: 0 });
  const [flipped, setFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = saving || isAnimating || isShuffling;
  const completed = useMemo(() => completedCategoryIds(data.cards, progress), [data.cards, progress]);
  const allAvailable = useMemo(() => availableCards(data.cards, completed), [data.cards, completed]);
  const card = data.cards.find((item) => item.id === queue[0]);
  const category = data.categories.find((item) => item.id === (categoryId ?? card?.category_id));
  const percent = cards.length ? Math.floor(mastered.size / cards.length * 100) : 0;

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (event.code !== "Space" || event.repeat || busy || !card ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest("button, input, textarea, select, a")))) return;
      event.preventDefault();
      setFlipped((old) => !old);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, card]);
  function later(action: () => void, delay: number) {
    const timer = setTimeout(action, delay);
    timers.current.push(timer);
  }
  function switchCategory(id: string | null) {
    const selected = id === null ? availableCards(data.cards, completed) : cardsForCategory(data.cards, id);
    const alreadyCompleted = id !== null && completed.has(id);
    setCategoryId(id);
    setCards(selected);
    setQueue(alreadyCompleted ? [] : selected.map((item) => item.id));
    setFlipped(false);
    setMastered(new Set(alreadyCompleted ? selected.map((item) => item.id) : []));
    setCounts({ hard: 0, doubt: 0, mastered: 0 });
    setError(null);
  }
  async function restartCategory(id: string) {
    if (busy) return;
    setSaving(true);
    setError(null);
    try {
      const { error: resetError } = await createClient().rpc("reset_flashcard_category", { p_category_id: id });
      if (resetError) throw new Error(resetError.message);
      const selected = cardsForCategory(data.cards, id);
      const ids = new Set(selected.map((item) => item.id));
      setProgress((old) => Object.fromEntries(Object.entries(old).filter(([cardId]) => !ids.has(cardId))));
      setCategoryId(id);
      setCards(selected);
      setQueue(selected.map((item) => item.id));
      setMastered(new Set());
      setCounts({ hard: 0, doubt: 0, mastered: 0 });
      setFlipped(false);
    } catch (caught) {
      setError(`Opnieuw starten mislukt: ${caught instanceof Error ? caught.message : "onbekende fout"}`);
    } finally {
      setSaving(false);
    }
  }
  function shuffle() {
    if (busy) return;
    setIsShuffling(true);
    if (flipped) {
      setIsAnimating(true);
      setFlipped(false);
    }
    later(() => {
      setQueue((previousQueue) => shuffleCards(previousQueue));
      setIsAnimating(false);
      later(() => setIsShuffling(false), 400);
    }, flipped ? 450 : 0);
  }
  async function rate(level: MasteryLevel) {
    if (!card || busy || !flipped) return;
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await createClient().from("user_flashcard_progress").upsert({
        user_id: userId, flashcard_id: card.id, mastery_level: level, last_reviewed_at: new Date().toISOString(),
      }, { onConflict: "user_id,flashcard_id" });
      if (saveError) throw new Error(saveError.message);
      const nextProgress = { ...progress, [card.id]: level };
      setProgress(nextProgress);
      setCounts((old) => ({ ...old, [level]: old[level] + 1 }));
      const completedAfterRating = completedCategoryIds(data.cards, nextProgress);
      const skipped = categoryId === null
        ? cards.filter((item) => item.id !== card.id && queue.includes(item.id) && completedAfterRating.has(item.category_id))
        : [];
      if (level === "mastered") setMastered((old) => new Set([...old, card.id, ...skipped.map((item) => item.id)]));
      setFlipped(false);
      setIsAnimating(true);
      later(() => {
        const skippedIds = new Set(skipped.map((item) => item.id));
        setQueue((old) => nextQueue(old, level).filter((id) => !skippedIds.has(id)));
        setIsAnimating(false);
      }, 450);
    } catch (caught) {
      setError(`Voortgang opslaan mislukt: ${caught instanceof Error ? caught.message : "onbekende fout"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 space-y-5">
        <div className="rounded-3xl border border-white/10 bg-surface p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold">{card ? `Kaart ${Math.min(mastered.size + 1, cards.length)} van ${cards.length}` : cards.length ? "Sessie voltooid" : categoryId === null && data.cards.length ? "Alle onderwerpen afgerond" : "Geen kaarten"}</p><p className="text-sm text-paper/60">{cards.length ? `${percent}% voltooid · ${mastered.size} van ${cards.length} beheerst` : "Geen kaarten om te oefenen"}</p></div>
            <button type="button" onClick={shuffle} disabled={busy || queue.length < 2} className="group flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-paper/70 hover:border-lime hover:text-lime disabled:opacity-40">
              <Image src="/brand/png/svg/sticker-husselen.svg" alt="" width={32} height={32} className="h-7 w-7 transition-transform group-hover:rotate-180" /> Husselen
            </button>
          </div>
          <div role="progressbar" aria-label="Sessievoortgang" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime shadow-[0_0_12px_rgba(204,255,0,0.8)] transition-all duration-500" style={{ width: `${percent}%` }} /></div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="text-red-400">🔴 Nog lastig {counts.hard}</span><span className="text-yellow-400">🟡 Twijfel {counts.doubt}</span><span className="text-lime">🟢 Beheerst {counts.mastered}</span></div>
          <p className="mt-2 text-xs text-paper/50">Tellingen zijn beoordelingen in deze sessie; herhalingen tellen mee.</p>
        </div>
        {error && <Notification onDismiss={() => setError(null)}>{error}</Notification>}
        {card ? (
          <>
            <button type="button" onClick={() => setFlipped((old) => !old)} aria-label={flipped ? "Toon vraag" : "Toon antwoord"} disabled={busy} className={`block h-[28rem] w-full [perspective:1400px] transition-transform duration-300 ${isShuffling ? "animate-wiggle scale-95 opacity-80" : ""}`}>
              <div className="relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.4,0.2,0.2,1)] motion-reduce:duration-0 [transform-style:preserve-3d]" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border border-white/10 bg-[#141417] px-6 pb-6 pt-20 text-center shadow-xl [backface-visibility:hidden]">
                  <Image src="/brand/png/svg/logo-upright-c-los-limoen.svg" alt="" width={64} height={64} className="absolute left-5 top-5 h-14 w-14 object-contain sm:left-7 sm:top-6" />
                  <span className="absolute right-5 top-7 max-w-[60%] text-right text-xs font-bold uppercase tracking-wider text-lime sm:right-7 sm:top-9">{category?.name}</span>
                  {card.image_url && <div className="relative mb-4 h-36 w-full max-w-sm"><Image src={card.image_url} alt="" fill unoptimized className="object-contain" /></div>}
                  <p className="whitespace-pre-line font-display text-xl font-extrabold sm:text-2xl">{card.front}</p><p className="mt-5 text-xs text-paper/50">Klik of druk op spatie om te draaien</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border border-white/10 bg-[#141417] px-6 pb-6 pt-20 text-center shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <Image src="/brand/png/svg/logo-upright-c-los-limoen.svg" alt="" width={64} height={64} className="absolute left-5 top-5 h-14 w-14 object-contain sm:left-7 sm:top-6" />
                  <span className="absolute right-5 top-7 max-w-[60%] text-right text-xs font-bold uppercase tracking-wider text-lime sm:right-7 sm:top-9">{category?.name}</span>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-jade">Antwoord</p><p className="whitespace-pre-line font-display text-xl font-extrabold sm:text-2xl">{card.back}</p>
                  {card.explanation && <div className="mt-5 w-full rounded-2xl border border-white/5 bg-surface-raised p-4 text-left"><p className="mb-2 text-xs font-bold uppercase text-jade">Uitgebreide uitleg</p><p className="whitespace-pre-line text-sm text-white/80">{card.explanation}</p></div>}
                </div>
              </div>
            </button>
            {flipped && <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" disabled={busy} onClick={() => void rate("hard")} className="group relative overflow-hidden rounded-2xl border border-red-500/25 bg-red-500/5 p-4 text-left text-red-400 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_8px_28px_rgba(239,68,68,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:translate-y-0 disabled:opacity-50">
                <span aria-hidden="true" className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/10 text-lg font-bold transition-transform group-hover:rotate-[-12deg]">↻</span>
                <span className="block font-bold">Nog lastig</span><span className="mt-1 block text-xs text-paper/50">Opnieuw oefenen</span>
              </button>
              <button type="button" disabled={busy} onClick={() => void rate("doubt")} className="group relative overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-left text-amber-400 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-[0_8px_28px_rgba(234,179,8,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:translate-y-0 disabled:opacity-50">
                <span aria-hidden="true" className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-400/25 bg-yellow-400/10 text-lg font-bold transition-transform group-hover:rotate-12">?</span>
                <span className="block font-bold">Twijfel</span><span className="mt-1 block text-xs text-paper/50">Later herhalen</span>
              </button>
              <button type="button" disabled={busy} onClick={() => void rate("mastered")} className="group relative overflow-hidden rounded-2xl border border-lime/30 bg-lime/5 p-4 text-left text-lime transition-all duration-300 hover:-translate-y-1 hover:border-lime hover:bg-lime/10 hover:shadow-[0_8px_28px_rgba(204,255,0,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime disabled:translate-y-0 disabled:opacity-50">
                <span aria-hidden="true" className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-lime/25 bg-lime/10 text-lg font-bold transition-transform group-hover:scale-110">✓</span>
                <span className="block font-bold">Ik ken hem!</span><span className="mt-1 block text-xs text-paper/50">Kaart beheerst</span>
              </button>
            </div>}
          </>
        ) : <div className="rounded-3xl border border-white/10 bg-[#18181B] p-10 text-center">
          <p>{cards.length ? "Goed gedaan! Je hebt alle kaarten in deze sessie beheerst." : categoryId === null && data.cards.length ? "Alle onderwerpen zijn afgerond. Kies een onderwerp om opnieuw te oefenen." : "Er zijn nog geen gepubliceerde kaarten in dit onderwerp."}</p>
          {cards.length > 0 && categoryId !== null && <button type="button" disabled={busy} onClick={() => void restartCategory(categoryId)} className="mt-4 rounded-full bg-lime px-5 py-2 font-bold text-ink disabled:opacity-50">Opnieuw oefenen</button>}
          {cards.length > 0 && categoryId === null && allAvailable.length > 0 && <button type="button" disabled={busy} onClick={() => switchCategory(null)} className="mt-4 rounded-full bg-lime px-5 py-2 font-bold text-ink disabled:opacity-50">Verder oefenen</button>}
          {categoryId === null && allAvailable.length === 0 && data.cards.length > 0 && <p className="mt-3 text-sm text-paper/60">Start een afgerond onderwerp opnieuw om de kaarten terug te zetten.</p>}
        </div>}
      </section>
      <aside className="space-y-4 xl:order-last">
        <div className="rounded-3xl border border-white/10 bg-surface p-4 backdrop-blur-xl">
          <h2 className="mb-3 font-display text-lg font-bold">Onderwerpen</h2>
          {data.categories.length === 0 && <p className="text-sm text-paper/60">Er zijn nog geen onderwerpen beschikbaar.</p>}
          <div className="space-y-2">
            <button type="button" disabled={busy} onClick={() => switchCategory(null)} aria-pressed={categoryId === null} className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm font-bold disabled:opacity-50 ${categoryId === null ? "border-lime/60 bg-lime/10 text-lime shadow-[0_0_15px_rgba(204,255,0,0.15)]" : "border-white/5 bg-white/[0.03] text-paper/70 hover:border-white/20 hover:text-white"}`}><span>Alle kaarten</span><span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs">{allAvailable.length} {allAvailable.length === 1 ? "kaart" : "kaarten"}</span></button>
            {data.categories.map((item) => {
            const count = data.cards.filter((entry) => entry.category_id === item.id).length;
            return <button key={item.id} type="button" disabled={busy} onClick={() => switchCategory(item.id)} aria-pressed={categoryId === item.id} className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm font-bold disabled:opacity-50 ${categoryId === item.id ? "border-lime/60 bg-lime/10 text-lime shadow-[0_0_15px_rgba(204,255,0,0.15)]" : "border-white/5 bg-white/[0.03] text-paper/70 hover:border-white/20 hover:text-white"}`}><span>{item.name}</span><span className="flex shrink-0 items-center gap-2">{completed.has(item.id) && <span aria-label="Afgerond" title="Afgerond" className="flex h-6 w-6 items-center justify-center rounded-full bg-lime/15 text-lime">✓</span>}<span className="rounded-full bg-white/10 px-2 py-1 text-xs">{count} {count === 1 ? "kaart" : "kaarten"}</span></span></button>;
          })}</div>
        </div>
        {category?.lesson_id && <Link href={`/videocursus?les=${encodeURIComponent(category.lesson_id)}`} className="block rounded-3xl border border-jade/30 bg-jade/10 p-5 hover:border-jade"><p className="font-bold text-jade">Moeite met dit onderwerp?</p><p className="mt-1 text-sm text-paper/80">Bekijk de bijbehorende videoles →</p></Link>}
      </aside>
    </div>
  );
}
