"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toQuestion } from "../../lib/course/mappers";
import { readVideoDuration, uploadMedia } from "../../lib/course/storage";
import type { Lesson, LessonQuestion } from "../../lib/course/types";
import { useDialogs } from "./Dialog";

export const inputClass =
  "w-full rounded-xl border border-paper/15 bg-white/5 px-4 py-2.5 text-paper placeholder:text-paper/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/30";
export const primaryButton =
  "rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";
export const dangerButton =
  "rounded-full border border-red-500/50 px-5 py-2 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50";
const fileClass =
  "block w-full text-sm text-paper/70 file:mr-3 file:rounded-full file:border-0 file:bg-lime file:px-4 file:py-2 file:font-bold file:text-ink";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-paper/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-paper/45">{hint}</span>}
    </label>
  );
}

type Notify = (type: "ok" | "error", text: string, action?: { label: string; onClick: () => void }) => void;

function QuestionEditor({
  question,
  supabase,
  notify,
  onChanged,
}: {
  question: LessonQuestion;
  supabase: SupabaseClient;
  notify: Notify;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState(question);
  const [busy, setBusy] = useState(false);
  const { confirm, element: dialogs } = useDialogs();
  const patch = (changes: Partial<LessonQuestion>) => setDraft((d) => ({ ...d, ...changes }));

  const setOption = (index: number, value: string) =>
    patch({ options: draft.options.map((option, i) => (i === index ? value : option)) });

  const removeOption = (index: number) => {
    const options = draft.options.filter((_, i) => i !== index);
    let correctOption = draft.correctOption;
    if (index === correctOption) correctOption = 0;
    else if (index < correctOption) correctOption -= 1;
    patch({ options, correctOption });
  };

  const save = async () => {
    if (!draft.question.trim()) return notify("error", "Vul de vraag in.");
    if (draft.options.some((option) => !option.trim())) return notify("error", "Vul alle antwoordopties in of verwijder lege opties.");
    setBusy(true);
    const { error } = await supabase
      .from("lesson_questions")
      .update({
        question: draft.question,
        image_url: draft.imageUrl,
        options: draft.options,
        correct_option: draft.correctOption,
        explanation: draft.explanation,
        topic_tag: draft.topicTag,
      })
      .eq("id", draft.id);
    setBusy(false);
    notify(error ? "error" : "ok", error ? error.message : "Vraag opgeslagen.");
  };

  const remove = async () => {
    if (!(await confirm({ title: "Vraag verwijderen", message: "Weet je zeker dat je deze vraag wilt verwijderen?" }))) return;
    setBusy(true);
    const { error } = await supabase.from("lesson_questions").delete().eq("id", draft.id);
    setBusy(false);
    if (error) return notify("error", error.message);
    onChanged();
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      patch({ imageUrl: await uploadMedia(supabase, file, `questions/${draft.lessonId}`) });
    } catch (error) {
      notify("error", `Uploaden mislukt: ${error instanceof Error ? error.message : "onbekend"}`);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-paper/10 bg-ink/50 p-4">
      {dialogs}
      <Field label="Vraag">
        <textarea rows={2} className={inputClass} value={draft.question} onChange={(e) => patch({ question: e.target.value })} />
      </Field>

      <div className="space-y-2">
        <span className="block text-sm font-semibold text-paper/80">Antwoordopties (kies het juiste antwoord)</span>
        {draft.options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correct-${draft.id}`}
              checked={draft.correctOption === index}
              onChange={() => patch({ correctOption: index })}
              aria-label={`Antwoord ${index + 1} is juist`}
              className="h-4 w-4 accent-[#10b981]"
            />
            <input className={inputClass} value={option} onChange={(e) => setOption(index, e.target.value)} placeholder={`Antwoord ${index + 1}`} />
            {draft.options.length > 2 && (
              <button type="button" onClick={() => removeOption(index)} aria-label="Optie verwijderen" className="px-2 text-red-300">
                ✕
              </button>
            )}
          </div>
        ))}
        {draft.options.length < 4 && (
          <button type="button" onClick={() => patch({ options: [...draft.options, ""] })} className="text-sm font-semibold text-lime">
            + Optie toevoegen
          </button>
        )}
      </div>

      <Field label="Korte uitleg (getoond na het antwoord)">
        <textarea rows={2} className={inputClass} value={draft.explanation ?? ""} onChange={(e) => patch({ explanation: e.target.value })} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Onderwerp-tag" hint="Bijv. voorrang, borden">
          <input className={inputClass} value={draft.topicTag ?? ""} onChange={(e) => patch({ topicTag: e.target.value })} />
        </Field>
        <Field label="Afbeelding (optioneel)">
          <input type="file" accept="image/*" className={fileClass} onChange={(e) => uploadImage(e.target.files?.[0])} />
        </Field>
      </div>
      {draft.imageUrl && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.imageUrl} alt="" className="h-20 rounded-lg object-cover" />
          <button type="button" onClick={() => patch({ imageUrl: null })} className="text-sm text-red-300">
            Afbeelding verwijderen
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className={primaryButton}>
          Vraag opslaan
        </button>
        <button onClick={remove} disabled={busy} className={dangerButton}>
          Verwijderen
        </button>
      </div>
    </div>
  );
}

export default function LessonEditor({
  lesson,
  supabase,
  notify,
  onChanged,
  onDeleted,
}: {
  lesson: Lesson;
  supabase: SupabaseClient;
  notify: Notify;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState(lesson);
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const { confirm, element: dialogs } = useDialogs();
  const patch = (changes: Partial<Lesson>) => setDraft((d) => ({ ...d, ...changes }));

  const loadQuestions = async () => {
    const { data, error } = await supabase.from("lesson_questions").select("*").eq("lesson_id", lesson.id).order("sort_order").order("created_at");
    if (error) notify("error", error.message);
    else setQuestions((data ?? []).map(toQuestion));
  };

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("lesson_questions")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("sort_order")
      .order("created_at")
      .then(({ data }) => {
        if (!cancelled) setQuestions((data ?? []).map(toQuestion));
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, lesson.id]);

  const save = async (source: Lesson = draft) => {
    if (!source.title.trim()) return notify("error", "Vul een titel in.");
    setBusy(true);
    const { error } = await supabase
      .from("lessons")
      .update({
        title: source.title,
        description: source.description,
        video_url: source.videoUrl,
        duration_seconds: source.duration,
        cheat_sheet_notes: source.cheatSheetNotes,
        is_published: source.isPublished,
      })
      .eq("id", source.id);
    setBusy(false);
    if (error) return notify("error", error.message);
    notify("ok", "Video opgeslagen.");
    onChanged();
  };

  const remove = async () => {
    if (!(await confirm({ title: "Video verwijderen", message: `"${draft.title}" en alle bijbehorende vragen worden verwijderd.` }))) return;
    setBusy(true);
    const { error } = await supabase.from("lessons").delete().eq("id", draft.id);
    setBusy(false);
    if (error) return notify("error", error.message);
    onDeleted();
  };

  const uploadVideo = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      const [url, duration] = await Promise.all([
        uploadMedia(supabase, file, `lessons/${draft.id}`, setProgress),
        readVideoDuration(file),
      ]);
      const updated = { ...draft, videoUrl: url, duration: duration || draft.duration };
      patch({ videoUrl: updated.videoUrl, duration: updated.duration });
      notify("ok", "Video geüpload.", { label: "Opslaan", onClick: () => save(updated) });
    } catch (error) {
      notify("error", `Uploaden mislukt: ${error instanceof Error ? error.message : "onbekend"}`);
    }
    setProgress(null);
    setBusy(false);
  };

  const addQuestion = async () => {
    const { error } = await supabase.from("lesson_questions").insert({
      lesson_id: lesson.id,
      question: "Nieuwe vraag",
      options: ["Antwoord A", "Antwoord B", "Antwoord C"],
      correct_option: 0,
      sort_order: questions.length,
    });
    if (error) return notify("error", error.message);
    loadQuestions();
  };

  const minutes = Math.floor(draft.duration / 60);
  const seconds = draft.duration % 60;

  return (
    <div className="space-y-6">
      {dialogs}
      <section className="space-y-4 rounded-3xl border border-jade/30 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold">Video bewerken</h2>
          <button onClick={() => save()} disabled={busy} className={primaryButton}>
            Opslaan
          </button>
        </div>
        <Field label="Titel">
          <input className={inputClass} value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>

        <Field label="Video-URL" hint="YouTube, Vimeo of een direct videobestand (mp4/webm)">
          <input className={inputClass} placeholder="https://..." value={draft.videoUrl ?? ""} onChange={(e) => patch({ videoUrl: e.target.value })} />
        </Field>
        <Field label="Of upload een videobestand" hint="De duur wordt automatisch ingevuld">
          <input type="file" accept="video/*" disabled={busy} className={fileClass} onChange={(e) => uploadVideo(e.target.files?.[0])} />
          {progress !== null && (
            <div className="mt-3" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-3 overflow-hidden rounded-full bg-paper/10">
                <div className="h-full rounded-full bg-lime transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <span className="mt-1 block text-xs font-semibold text-lime">{Math.round(progress * 100)}% geüpload...</span>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
          <Field label="Minuten">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={minutes}
              onChange={(e) => patch({ duration: Math.max(0, Number(e.target.value)) * 60 + seconds })}
            />
          </Field>
          <Field label="Seconden">
            <input
              type="number"
              min={0}
              max={59}
              className={inputClass}
              value={seconds}
              onChange={(e) => patch({ duration: minutes * 60 + Math.min(59, Math.max(0, Number(e.target.value))) })}
            />
          </Field>
        </div>

        <Field label="Beschrijving (onder de video)" hint='Begin een regel met "- " voor een bulletpoint'>
          <textarea rows={6} className={inputClass} value={draft.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
        </Field>
        <Field label="Let op voor het CBR-examen" hint='Aandachtspunten; begin een regel met "- " voor een bulletpoint'>
          <textarea rows={4} className={inputClass} value={draft.cheatSheetNotes ?? ""} onChange={(e) => patch({ cheatSheetNotes: e.target.value })} />
        </Field>

        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={draft.isPublished} onChange={(e) => patch({ isPublished: e.target.checked })} className="h-4 w-4 accent-[#ccff00]" />
          Gepubliceerd (zichtbaar voor leerlingen)
        </label>

        <div className="flex gap-3">
          <button onClick={() => save()} disabled={busy} className={primaryButton}>
            Video opslaan
          </button>
          <button onClick={remove} disabled={busy} className={dangerButton}>
            Verwijderen
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-lime/25 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold">Kennis-check vragen</h2>
            <p className="text-sm text-paper/55">Alleen zichtbaar voor Boost- en Max-leerlingen na deze video.</p>
          </div>
          <button onClick={addQuestion} className={primaryButton}>
            + Vraag
          </button>
        </div>
        {questions.map((question) => (
          <QuestionEditor key={question.id} question={question} supabase={supabase} notify={notify} onChanged={loadQuestions} />
        ))}
        {questions.length === 0 && <p className="text-sm text-paper/50">Nog geen vragen. Voeg 2 tot 4 vragen toe.</p>}
      </section>
    </div>
  );
}
