"use client";

import { useState } from "react";
import type { ExamQuestion } from "../../../lib/exam-simulator";
import ExamImage from "../../ui/ExamImage";
import OrderingQuestion from "../../dashboard/OrderingQuestion";
import ZoneQuestion from "../../dashboard/ZoneQuestion";

const button = "min-h-11 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-left text-sm text-white/80 transition hover:border-white/25 focus-visible:outline-2 focus-visible:outline-[#CCFF00]";

export default function QuestionPreview({ question, index, total, onBack }: {
  question: ExamQuestion;
  index: number;
  total: number;
  onBack: () => void;
}) {
  const [marked, setMarked] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [number, setNumber] = useState<number | null>(null);
  const [assigned, setAssigned] = useState<Record<string, number>>({});
  return (
    <section aria-labelledby="student-preview-title" className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#18181b]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-5 py-4">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-[#CCFF00]" aria-label="Terug naar de editor">←</button>
        <div className="mr-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#CCFF00]">Leerlingweergave</p>
          <h2 id="student-preview-title" className="mt-0.5 text-sm font-bold text-white">Vraag {index + 1} preview</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/55">Niet opgeslagen</span>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
        <div className="rounded-2xl border border-white/[0.07] bg-[#101013] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm text-white">Vraag {index + 1} <span className="font-normal text-white/40">van {total}</span></strong>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-white/65">30 min totaal</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-label="Voortgang examen" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index + 1}>
            <div className="h-full rounded-full bg-[#CCFF00] transition-[width]" style={{ width: `${total ? (index + 1) / total * 100 : 0}%` }} />
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/[0.07] bg-[#101013] p-4 sm:p-6">
          <h3 className="text-lg font-bold leading-relaxed text-white">{question.question_text || "De vraagtekst verschijnt hier."}</h3>
          {question.image_url && !["ordering", "single_drag", "hotspot"].includes(question.question_type) && (
            <div className="relative max-w-3xl overflow-hidden rounded-xl border border-white/10">
              <ExamImage path={question.image_url} alt="Media bij de vraag" className="block h-auto w-full" />
            </div>
          )}

          {["multiple_choice", "yes_no", "multiple_response"].includes(question.question_type) && (
            <div role={question.question_type === "multiple_response" ? "group" : "radiogroup"} aria-label="Antwoordopties" className="grid gap-2.5">
              {question.options.map((option, optionIndex) => (
                <button key={option.id} type="button" role={question.question_type === "multiple_response" ? "checkbox" : "radio"} aria-checked={question.question_type === "multiple_response" ? selectedMultiple.includes(option.id) : selected === option.id}
                  onClick={() => question.question_type === "multiple_response" ? setSelectedMultiple((current) => current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id]) : setSelected(option.id)}
                  className={`${button} flex items-center gap-3 ${(question.question_type === "multiple_response" ? selectedMultiple.includes(option.id) : selected === option.id) ? "border-[#CCFF00]/40 bg-[#CCFF00]/[0.07]" : ""}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${(question.question_type === "multiple_response" ? selectedMultiple.includes(option.id) : selected === option.id) ? "border-[#CCFF00] bg-[#CCFF00] text-[#10140a]" : "border-white/15 text-white/55"}`}>{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="min-w-0 flex-1">{option.option_text || `Antwoord ${optionIndex + 1}`}</span>
                  {option.image_url && <ExamImage path={option.image_url} alt="" className="max-h-20 max-w-28 rounded-lg object-cover" />}
                </button>
              ))}
            </div>
          )}
          {question.question_type === "number" && (
            <label className="block max-w-xs text-xs font-semibold text-white/55">Jouw antwoord
              <input type="number" step="any" value={number ?? ""} onChange={(event) => setNumber(event.target.value === "" ? null : Number(event.target.value))}
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#202024] px-4 text-sm text-white outline-none focus:border-[#CCFF00]/45 focus:ring-2 focus:ring-[#CCFF00]/10" />
            </label>
          )}
          {question.question_type === "ordering" && question.image_url && (
            <OrderingQuestion key={question.id} imageUrl={question.image_url} options={question.options} value={assigned} onChange={setAssigned} />
          )}
          {(question.question_type === "single_drag" || question.question_type === "hotspot") && question.image_url && <ZoneQuestion imageUrl={question.image_url} options={question.options} value={selected} onChange={setSelected} mode={question.question_type} />}
          <button type="button" aria-pressed={marked} onClick={() => setMarked((value) => !value)}
            className={`min-h-11 rounded-xl border px-4 py-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-[#CCFF00] ${marked ? "border-[#CCFF00]/30 bg-[#CCFF00]/10 text-[#eaff9b]" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25"}`}>
            Markeer voor later <span aria-hidden="true" className="ml-1">⚑</span>
          </button>
        </div>
        <p className="text-center text-[10px] text-white/30">Dit is een preview. Je antwoorden worden niet opgeslagen of nagekeken.</p>
      </div>
    </section>
  );
}
