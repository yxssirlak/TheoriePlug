"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import type { ExamQuestion } from "../../../lib/exam-simulator";
import ExamImage from "../../ui/ExamImage";

type Option = ExamQuestion["options"][number];
const button = "inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/75 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-[#CCFF00] disabled:opacity-40";

export default function VisualDropzoneEditor({ question, onChange }: {
  question: ExamQuestion;
  onChange: (question: ExamQuestion) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(question.options[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  function setPosition(id: string, clientX: number, clientY: number) {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const x = Math.round(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 1000))) / 10;
    const y = Math.round(Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 1000))) / 10;
    onChange({
      ...question,
      options: question.options.map((option) => option.id === id
        ? { ...option, coordinates_x: x, coordinates_y: y }
        : option),
    });
  }

  function nudgePosition(id: string, dx: number, dy: number) {
    onChange({
      ...question,
      options: question.options.map((option) => option.id === id
        ? {
          ...option,
          coordinates_x: Math.round(Math.max(0, Math.min(100, (option.coordinates_x ?? 50) + dx)) * 10) / 10,
          coordinates_y: Math.round(Math.max(0, Math.min(100, (option.coordinates_y ?? 50) + dy)) * 10) / 10,
        }
        : option),
    });
  }

  function addAt(clientX: number, clientY: number) {
    if (question.options.length >= 4) return;
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const id = crypto.randomUUID();
    const x = Math.round(Math.max(0, Math.min(100, (clientX - rect.left) / rect.width * 1000))) / 10;
    const y = Math.round(Math.max(0, Math.min(100, (clientY - rect.top) / rect.height * 1000))) / 10;
    const next: Option = {
      id,
      option_text: `Weggebruiker ${question.options.length + 1}`,
      image_url: null,
      is_correct: false,
      coordinates_x: x,
      coordinates_y: y,
      correct_order: question.options.length + 1,
    };
    onChange({ ...question, options: [...question.options, next] });
    setSelectedId(id);
    setAdding(false);
  }

  function removeZone(id: string) {
    if (question.options.length <= 3) return;
    const options = question.options.filter((option) => option.id !== id)
      .map((option, index) => ({ ...option, correct_order: index + 1 }));
    onChange({ ...question, options });
    if (selectedId === id) setSelectedId(options[0]?.id ?? null);
  }

  function reorder(from: number, to: number) {
    if (to < 0 || to >= question.options.length) return;
    const options = [...question.options];
    [options[from], options[to]] = [options[to], options[from]];
    onChange({ ...question, options: options.map((option, index) => ({ ...option, correct_order: index + 1 })) });
  }

  return (
    <section aria-labelledby="dropzone-title" className="space-y-4 rounded-2xl border border-white/[0.07] bg-black/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="dropzone-title" className="text-sm font-bold text-white">Dropzones op de kruispuntmedia</h3>
          <p className="mt-1 max-w-lg text-xs leading-relaxed text-white/45">Voeg een positie toe door op de media te klikken. Sleep daarna de genummerde markeringen op de juiste plek.</p>
        </div>
        <button type="button" className={`${button} ${adding ? "border-[#CCFF00]/40 bg-[#CCFF00]/10 text-[#eaff9b]" : ""}`}
          disabled={!question.image_url || question.options.length >= 4} aria-pressed={adding} onClick={() => setAdding((current) => !current)}>
          {adding ? "Klik op de media…" : !question.image_url ? "Upload eerst media" : question.options.length >= 4 ? "Maximaal 4 posities" : "+ Positie plaatsen"}
        </button>
      </div>
      <div
        ref={canvas}
        onClick={(event) => {
          if (!adding) return;
          addAt(event.clientX, event.clientY);
        }}
        className={`relative max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#101013] ${adding ? "cursor-crosshair ring-2 ring-[#CCFF00]/35" : ""}`}
      >
        {question.image_url ? (
          <ExamImage path={question.image_url} alt="Kruispuntmedia met bewerkbare dropzones" className="block h-auto w-full select-none" />
        ) : (
          <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-white/40">Upload eerst kruispuntmedia om dropzones te plaatsen.</div>
        )}
        {question.image_url && question.options.map((option) => {
          const active = option.id === selectedId;
          return (
            <motion.button
              key={option.id}
              type="button"
              aria-label={`Positie ${option.correct_order ?? 1}, X ${option.coordinates_x ?? 50} procent, Y ${option.coordinates_y ?? 50} procent. Sleep om te verplaatsen; gebruik de pijltjestoetsen om te verschuiven.`}
              aria-pressed={active}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(option.id);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                activePointer.current = event.pointerId;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (activePointer.current !== event.pointerId) return;
                event.stopPropagation();
                setPosition(option.id, event.clientX, event.clientY);
              }}
              onPointerUp={(event) => {
                if (activePointer.current === event.pointerId) activePointer.current = null;
              }}
              onPointerCancel={() => { activePointer.current = null; }}
              onLostPointerCapture={() => { activePointer.current = null; }}
              onKeyDown={(event) => {
                const delta = event.shiftKey ? 5 : 1;
                const directions: Record<string, [number, number]> = {
                  ArrowLeft: [-delta, 0],
                  ArrowRight: [delta, 0],
                  ArrowUp: [0, -delta],
                  ArrowDown: [0, delta],
                };
                const direction = directions[event.key];
                if (!direction) return;
                event.preventDefault();
                nudgePosition(option.id, ...direction);
              }}
              style={{ left: `${option.coordinates_x ?? 50}%`, top: `${option.coordinates_y ?? 50}%` }}
              whileHover={reduceMotion ? undefined : { scale: 1.1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 font-mono text-sm font-black shadow-[0_6px_20px_rgba(0,0,0,.45)] outline-none ${active ? "border-[#CCFF00] bg-[#CCFF00] text-[#11170a] ring-4 ring-[#CCFF00]/25" : "border-white/80 bg-[#101013]/90 text-white hover:border-[#CCFF00] hover:text-[#CCFF00]"} cursor-grab active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-[#CCFF00]/40`}
            >
              {option.correct_order}
            </motion.button>
          );
        })}
        {adding && <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#CCFF00]/25 bg-[#101013]/90 px-3 py-1.5 text-xs font-semibold text-[#eaff9b] shadow-lg">Klik om positie {question.options.length + 1} te plaatsen</span>}
      </div>
      {question.options.length > 0 && (
        <ol className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option, index) => (
            <li key={option.id} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${option.id === selectedId ? "border-[#CCFF00]/30 bg-[#CCFF00]/[0.05]" : "border-white/[0.07] bg-white/[0.02]"}`}>
              <button type="button" aria-label={`Selecteer positie ${option.correct_order}`} onClick={() => setSelectedId(option.id)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${option.id === selectedId ? "bg-[#CCFF00] text-[#10140a]" : "bg-white/10 text-white/75"}`}>{option.correct_order}</button>
              <input aria-label={`Naam van positie ${option.correct_order}`} value={option.option_text}
                onChange={(event) => onChange({ ...question, options: question.options.map((item) => item.id === option.id ? { ...item, option_text: event.target.value } : item) })}
                className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white outline-none placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[#CCFF00]"
                placeholder="Naam weggebruiker" />
              <span className="shrink-0 font-mono text-[9px] text-white/30">{option.coordinates_x ?? "—"}% · {option.coordinates_y ?? "—"}%</span>
              <div className="flex shrink-0 flex-col">
                <button type="button" aria-label={`Positie ${option.correct_order} eerder in juiste volgorde`} disabled={index === 0} onClick={() => reorder(index, index - 1)} className="px-1 text-[10px] leading-3 text-white/40 hover:text-[#CCFF00] disabled:opacity-20">↑</button>
                <button type="button" aria-label={`Positie ${option.correct_order} later in juiste volgorde`} disabled={index === question.options.length - 1} onClick={() => reorder(index, index + 1)} className="px-1 text-[10px] leading-3 text-white/40 hover:text-[#CCFF00] disabled:opacity-20">↓</button>
              </div>
              <button type="button" aria-label={`Verwijder positie ${option.correct_order}`} disabled={question.options.length <= 3} onClick={() => removeZone(option.id)} className="rounded px-1.5 text-sm text-white/35 hover:text-red-300 disabled:opacity-20">×</button>
            </li>
          ))}
        </ol>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/30">
        {selectedId ? (() => {
          const selected = question.options.find((item) => item.id === selectedId);
          return `Geselecteerd: positie ${selected?.correct_order ?? "—"} · X ${selected?.coordinates_x ?? "—"}% · Y ${selected?.coordinates_y ?? "—"}% · sleep of gebruik de pijltjestoetsen`;
        })() : "Selecteer een positie om te bewerken"}
      </p>
    </section>
  );
}
