"use client";

import VisualDropzoneEditor from "./VisualDropzoneEditor";
import type { ExamQuestion } from "../../../lib/exam-simulator";
import ExamImage from "../../ui/ExamImage";

type Option = ExamQuestion["options"][number];
const input = "mt-1.5 h-11 w-full rounded-xl border border-white/[0.09] bg-[#151518] px-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#CCFF00]/45 focus:ring-2 focus:ring-[#CCFF00]/10";
const smallButton = "inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/70 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-[#CCFF00] disabled:opacity-40";

const questionTypeLabel = {
  multiple_choice: "Meerkeuze",
  number: "Getalvraag",
  ordering: "Voorrangssituatie",
} as const;

function ImageUpload({ label, busy, onUpload }: {
  label: string;
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs font-semibold text-white/75 transition hover:border-[#CCFF00]/40 hover:text-white focus-within:ring-2 focus-within:ring-[#CCFF00]/30">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-[#CCFF00]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M3 12v4a1 1 0 001 1h12a1 1 0 001-1v-4" /></svg>
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

export default function QuestionEditor({ question, index, total, busy, onChange, onUpload, onDelete, onPreview }: {
  question: ExamQuestion;
  index: number;
  total: number;
  busy: boolean;
  onChange: (question: ExamQuestion) => void;
  onUpload: (file: File, apply: (path: string) => void) => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const replaceOption = (id: string, patch: Partial<Option>) => onChange({
    ...question,
    options: question.options.map((option) => option.id === id ? { ...option, ...patch } : option),
  });

  function addOption() {
    const ordering = question.question_type === "ordering";
    const number = question.options.length + 1;
    onChange({
      ...question,
      options: [...question.options, {
        id: crypto.randomUUID(),
        option_text: ordering ? `Weggebruiker ${number}` : `Antwoord ${number}`,
        image_url: null,
        is_correct: false,
        coordinates_x: ordering ? 50 : null,
        coordinates_y: ordering ? 50 : null,
        correct_order: ordering ? number : null,
      }],
    });
  }

  function removeOption(id: string) {
    const removed = question.options.find((option) => option.id === id);
    const options = question.options.filter((option) => option.id !== id);
    if (question.question_type === "ordering") {
      onChange({ ...question, options: options.map((option, order) => ({ ...option, correct_order: order + 1 })) });
    } else {
      onChange({
        ...question,
        options: options.map((option, order) => removed?.is_correct && order === 0 ? { ...option, is_correct: true } : option),
      });
    }
  }

  function updateChoice(selectedId: string) {
    onChange({ ...question, options: question.options.map((option) => ({ ...option, is_correct: option.id === selectedId })) });
  }

  return (
    <section aria-labelledby="question-editor-title" className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.09] bg-[#151518]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
        <div className="mr-auto flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFF00]/10 font-mono text-sm font-bold text-[#CCFF00]">{String(index + 1).padStart(2, "0")}</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/40">Vraag {index + 1} van {total}</p>
            <h2 id="question-editor-title" className="mt-0.5 text-sm font-bold text-white">{questionTypeLabel[question.question_type]}</h2>
          </div>
        </div>
        <button type="button" onClick={onPreview} className={smallButton}>
          <span aria-hidden="true" className="mr-1.5 text-[#CCFF00]">◉</span>Preview
        </button>
        <button type="button" onClick={onDelete} className="inline-flex h-10 items-center justify-center rounded-xl border border-red-300/10 px-3 text-xs font-semibold text-red-200/65 transition hover:border-red-300/30 hover:bg-red-300/[0.05] hover:text-red-100 focus-visible:outline-2 focus-visible:outline-red-300">
          Vraag verwijderen
        </button>
      </header>

      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <label htmlFor={`question-text-${question.id}`} className="block text-xs font-bold uppercase tracking-[0.13em] text-white/55">Vraagstelling</label>
          <textarea
            id={`question-text-${question.id}`}
            value={question.question_text}
            onChange={(event) => onChange({ ...question, question_text: event.target.value })}
            rows={3}
            maxLength={5000}
            placeholder="Formuleer de vraag voor de leerling…"
            className={`${input} h-auto min-h-24 resize-y py-3 leading-relaxed`}
          />
          <p className="mt-1.5 text-right text-[10px] text-white/30">{question.question_text.length} / 5000</p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.13em] text-white/55">{question.question_type === "ordering" ? "Kruispuntmedia en posities" : "Vraagmedia"}</h3>
              <p className="mt-1 text-[11px] text-white/35">{question.question_type === "ordering" ? "Plaats visuele antwoordzones op de media." : "Upload een afbeelding of geluidloze GIF/MP4-video."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ImageUpload
                label={question.image_url ? "Media vervangen" : "Media uploaden"}
                busy={busy}
                onUpload={(file) => onUpload(file, (path) => onChange({ ...question, image_url: path }))}
              />
              {question.image_url && <button type="button" onClick={() => onChange({ ...question, image_url: null })} className={smallButton}>Verwijderen</button>}
            </div>
          </div>
          {question.question_type === "ordering" ? (
            <VisualDropzoneEditor question={question} onChange={onChange} />
          ) : question.image_url ? (
            <div className="max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              <ExamImage path={question.image_url} alt="Media bij de vraag" className="block max-h-[360px] w-full object-contain" />
            </div>
          ) : (
            <div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] text-xs text-white/35">Geen media toegevoegd</div>
          )}
        </div>

        {question.question_type === "number" && (
          <div className="max-w-sm">
            <label htmlFor={`correct-number-${question.id}`} className="block text-xs font-bold uppercase tracking-[0.13em] text-white/55">Correct antwoord</label>
            <input id={`correct-number-${question.id}`} type="number" step="any" value={question.correct_number ?? ""}
              onChange={(event) => onChange({ ...question, correct_number: event.target.value === "" ? null : Number(event.target.value) })}
              className={input} placeholder="Vul het juiste getal in" />
          </div>
        )}

        {question.question_type === "multiple_choice" && (
          <section aria-labelledby={`choices-title-${question.id}`} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id={`choices-title-${question.id}`} className="text-xs font-bold uppercase tracking-[0.13em] text-white/55">Antwoordopties</h3>
                <p className="mt-1 text-[11px] text-white/35">Selecteer het juiste antwoord.</p>
              </div>
              {question.options.length < 4 && <button type="button" className={smallButton} onClick={addOption}>+ Optie toevoegen</button>}
            </div>
            <div role="radiogroup" aria-label="Correct antwoord" className="space-y-2.5">
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className={`rounded-2xl border p-3 transition-colors ${option.is_correct ? "border-[#CCFF00]/25 bg-[#CCFF00]/[0.035]" : "border-white/[0.07] bg-white/[0.02]"}`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={option.is_correct}
                      aria-label={`Antwoord ${String.fromCharCode(65 + optionIndex)}${option.is_correct ? ", correct" : ", markeer als correct"}`}
                      tabIndex={option.is_correct ? 0 : -1}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowLeft") {
                          event.preventDefault();
                          const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
                          const nextIndex = (optionIndex + direction + question.options.length) % question.options.length;
                          const next = question.options[nextIndex];
                          updateChoice(next.id);
                          document.getElementById(`correct-choice-${next.id}`)?.focus();
                        }
                      }}
                      id={`correct-choice-${option.id}`}
                      onClick={() => updateChoice(option.id)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] ${option.is_correct ? "border-[#CCFF00] bg-[#CCFF00] text-[#11170a]" : "border-white/20 text-white/50 hover:border-white/40"}`}
                    >
                      {String.fromCharCode(65 + optionIndex)}
                    </button>
                    <input aria-label={`Antwoord ${String.fromCharCode(65 + optionIndex)}`} value={option.option_text}
                      onChange={(event) => replaceOption(option.id, { option_text: event.target.value })}
                      className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[#CCFF00]"
                      placeholder="Typ een antwoord…" />
                    <button type="button" disabled={question.options.length <= 2} aria-label={`Verwijder antwoord ${String.fromCharCode(65 + optionIndex)}`}
                      onClick={() => removeOption(option.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none text-white/30 hover:bg-red-300/10 hover:text-red-200 disabled:opacity-20">×</button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 pl-11">
                    <ImageUpload label={option.image_url ? "Media vervangen" : "Media toevoegen"} busy={busy}
                      onUpload={(file) => onUpload(file, (path) => replaceOption(option.id, { image_url: path }))} />
                    {option.image_url && (
                      <div className="flex items-center gap-2">
                        <ExamImage path={option.image_url} alt="" autoPlay={false} className="h-9 w-12 rounded-lg object-cover" />
                        <button type="button" onClick={() => replaceOption(option.id, { image_url: null })} className="text-[10px] text-white/40 hover:text-red-200">Media wissen</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div>
          <label htmlFor={`explanation-${question.id}`} className="block text-xs font-bold uppercase tracking-[0.13em] text-white/55">Uitleg na afloop <span className="font-normal normal-case tracking-normal text-white/30">· optioneel</span></label>
          <textarea id={`explanation-${question.id}`} value={question.explanation}
            onChange={(event) => onChange({ ...question, explanation: event.target.value })}
            rows={2} maxLength={5000} placeholder="Licht het juiste antwoord toe…"
            className={`${input} h-auto min-h-20 resize-y py-3`} />
        </div>
      </div>
    </section>
  );
}
