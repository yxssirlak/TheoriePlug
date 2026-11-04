"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { usePublished } from "../../lib/course/usePublished";
import { ContentState, PageHeader } from "../dashboard/ContentState";

type Card = { id: string; front: string; back: string; category: string | null };

function Deck({ cards }: { cards: Card[] }) {
  const categories = useMemo(() => Array.from(new Set(cards.map((c) => c.category).filter(Boolean))) as string[], [cards]);
  const [category, setCategory] = useState<string>("");
  const [order, setOrder] = useState<number[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  
  // Voeg state toe om bij te houden of de kaart aan het "resetten" (omdraaien naar voorkant) is
  const [isAnimating, setIsAnimating] = useState(false);

  const filtered = useMemo(() => cards.filter((c) => !category || c.category === category), [cards, category]);
  const sequence = order && order.length === filtered.length ? order : filtered.map((_, i) => i);
  const card = filtered[sequence[Math.min(index, filtered.length - 1)]];

  const go = (delta: number) => {
    // Als de kaart al met de voorkant naar voren staat, of de animatie loopt al, ga direct
    if (!flipped || isAnimating) {
      setIndex((i) => (i + delta + filtered.length) % filtered.length);
      return;
    }

    // Blokkeer tijdelijk nieuwe acties
    setIsAnimating(true);
    // Draai de kaart eerst terug
    setFlipped(false);

    // Wacht tot de CSS-animatie (700ms) ongeveer klaar is voordat de tekst (index) wordt aangepast
    setTimeout(() => {
      setIndex((i) => (i + delta + filtered.length) % filtered.length);
      setIsAnimating(false);
    }, 450); // Iets sneller dan 700ms voelt vaak vlotter, pas aan naar 700 indien gewenst
  };

  const shuffle = () => {
    if (flipped) {
      setFlipped(false);
      setIsAnimating(true);
      setTimeout(() => {
        executeShuffle();
        setIsAnimating(false);
      }, 450);
    } else {
      executeShuffle();
    }
  };

  const executeShuffle = () => {
    const next = filtered.map((_, i) => i);
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setIndex(0);
  };

  // Zorg dat we niet op een lege index proberen te klikken als er gefilterd wordt
  useEffect(() => {
    setFlipped(false);
    setIndex(0);
  }, [category]);

  return (
    <div className="mx-auto max-w-2xl">
      {categories.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {["", ...categories].map((name) => (
            <button
              key={name || "alle"}
              onClick={() => {
                setCategory(name);
                setOrder(null);
              }}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                category === name ? "bg-lime text-ink" : "border border-paper/20 text-paper/70 hover:border-lime"
              }`}
            >
              {name || "Alle"}
            </button>
          ))}
        </div>
      )}

      {card && (
        <>
          <button
            onClick={() => !isAnimating && setFlipped((f) => !f)}
            aria-label="Draai de kaart om"
            className="block h-80 w-full [perspective:1400px]"
            disabled={isAnimating}
          >
            <div
              className="relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.4,0.2,0.2,1)] [transform-style:preserve-3d]"
              style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-[#18181B] p-10 text-center text-[#F4F4F5] shadow-xl [backface-visibility:hidden]">
                <Image
                  src="/brand/png/svg/logo-upright-b-limoen-tegel.svg"
                  alt=""
                  width={64}
                  height={64}
                  draggable={false}
                  className="pointer-events-none absolute top-[20%] left-1/2 h-14 w-14 select-none -translate-x-1/2 -translate-y-1/2"
                />
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-lime">Vraag</p>
                  <p className="whitespace-pre-line font-display text-2xl font-extrabold">{card.front}</p>
                  <p className="mt-5 text-xs text-[#F4F4F5]/40">Klik om te draaien</p>
                </div>
              </div>

              <div className="absolute inset-0 rounded-3xl bg-[#F4F4F5] p-3 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="flex h-full w-full items-center justify-center rounded-2xl border-4 border-[#10b981] p-8 text-center text-[#18181B]">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#10b981]">Antwoord</p>
                    <p className="whitespace-pre-line font-display text-2xl font-extrabold">{card.back}</p>
                  </div>
                </div>
              </div>
            </div>
          </button>

          <div className="mt-5 flex items-center justify-between gap-3">
            <button 
              onClick={() => go(-1)} 
              disabled={isAnimating}
              className="rounded-full border border-paper/20 px-5 py-2 text-sm font-bold hover:border-lime hover:text-lime disabled:opacity-50"
            >
              ← Vorige
            </button>
            <span className="text-sm font-semibold text-paper/60">
              {Math.min(index, filtered.length - 1) + 1} / {filtered.length}
            </span>
            <button 
              onClick={() => go(1)} 
              disabled={isAnimating}
              className="rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              Volgende →
            </button>
          </div>
          <button 
            onClick={shuffle} 
            disabled={isAnimating}
            className="group mx-auto mt-4 flex items-center gap-2 text-sm font-semibold text-paper/60 hover:text-lime disabled:opacity-50"
          >
            <Image src="/brand/png/svg/sticker-husselen.svg" alt="" width={64} height={64} className="h-7 w-7 transition-transform group-hover:rotate-180" />
            Husselen
          </button>
        </>
      )}
    </div>
  );
}

export default function FlashcardsView() {
  const state = usePublished<Card>("flashcards");
  return (
    <>
      <PageHeader title="Flashcards" text="Herhaal snel de belangrijkste regels en borden." />
      <ContentState state={state} empty="Er zijn nog geen flashcards beschikbaar. Kom snel terug!">
        {(items) => <Deck cards={items} />}
      </ContentState>
    </>
  );
}