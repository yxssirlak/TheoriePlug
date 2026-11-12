"use client";

import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import type { ExamQuestion } from "../../../lib/exam-simulator";
import ExamImage from "../../ui/ExamImage";

function SortableQuestion({ question, index, total, selected, onSelect, onMove }: {
  question: ExamQuestion;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();
  const preview = question.question_text.trim().slice(0, 40);

  return (
    <Reorder.Item
      as="li"
      value={question}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, zIndex: 2, boxShadow: "0 16px 40px rgba(0,0,0,.4)" }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      className={`relative flex items-stretch gap-2 rounded-2xl border p-2 transition-colors ${selected ? "border-[#CCFF00]/45 bg-[#CCFF00]/[0.07]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        aria-label={`Bewerk vraag ${index + 1}: ${preview || "Nieuwe vraag"}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] font-mono text-xs font-bold text-white/50">{String(index + 1).padStart(2, "0")}</span>
        {question.image_url ? (
          <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
            <ExamImage path={question.image_url} alt="" autoPlay={false} className="h-full w-full object-cover" />
          </span>
        ) : (
          <span aria-hidden="true" className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 text-white/25">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5h16v14H4z" /><path d="m5 17 5-5 3 3 2-2 4 4" /><circle cx="9" cy="9" r="1.5" /></svg>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-white/90">{preview || "Vraagtekst toevoegen"}{question.question_text.trim().length > 40 ? "…" : ""}</span>
          <span className="mt-1 block text-[10px] font-medium text-white/40">Examenvraag</span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
        <button type="button" aria-label={`Vraag ${index + 1} omhoog`} disabled={index === 0} onClick={() => onMove(index, index - 1)} className="rounded px-1.5 text-xs text-white/35 hover:text-[#CCFF00] focus-visible:outline-2 focus-visible:outline-[#CCFF00] disabled:opacity-20">↑</button>
        <button
          type="button"
          aria-label={`Vraag ${index + 1} verslepen`}
          onPointerDown={(event) => controls.start(event)}
          className="cursor-grab rounded-lg p-1.5 text-white/35 hover:bg-white/[0.07] hover:text-[#CCFF00] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-[#CCFF00]"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor"><circle cx="5" cy="3" r="1" /><circle cx="11" cy="3" r="1" /><circle cx="5" cy="8" r="1" /><circle cx="11" cy="8" r="1" /><circle cx="5" cy="13" r="1" /><circle cx="11" cy="13" r="1" /></svg>
        </button>
        <button type="button" aria-label={`Vraag ${index + 1} omlaag`} disabled={index === total - 1} onClick={() => onMove(index, index + 1)} className="rounded px-1.5 text-xs text-white/35 hover:text-[#CCFF00] focus-visible:outline-2 focus-visible:outline-[#CCFF00] disabled:opacity-20">↓</button>
      </div>
    </Reorder.Item>
  );
}

export default function QuestionList({ questions, selectedId, onSelect, onReorder, onMove }: {
  questions: ExamQuestion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (questions: ExamQuestion[]) => void;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <section aria-labelledby="question-list-title" className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#18181b]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
        <div>
          <h2 id="question-list-title" className="text-sm font-bold text-white">Vragenoverzicht</h2>
          <p className="mt-1 text-xs text-white/40">Sleep om te herschikken</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-white/60">{questions.length}</span>
      </div>
      {questions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-xl text-[#CCFF00]">＋</span>
          <p className="mt-3 text-sm font-semibold text-white/75">Nog geen vragen</p>
          <p className="mt-1 text-xs text-white/40">Voeg een vraag toe om te beginnen.</p>
        </div>
      ) : (
        <Reorder.Group as="ol" axis="y" values={questions} onReorder={onReorder} className="space-y-2 p-2.5">
          {questions.map((question, index) => (
            <SortableQuestion key={question.id} question={question} index={index} total={questions.length} selected={selectedId === question.id}
              onSelect={() => onSelect(question.id)} onMove={onMove} />
          ))}
        </Reorder.Group>
      )}
      <div className="flex items-center gap-2 border-t border-white/[0.07] px-4 py-3 text-[11px] text-white/35">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#CCFF00]" />
        Verslepen of gebruik omhoog/omlaag
      </div>
    </section>
  );
}
