"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { listAdminExams, loadAdminExam, prepareExamImage, saveAdminExam } from "../../app/exam-actions";
import { examSchema, type ExamDefinition, type ExamQuestion } from "../../lib/exam-simulator";
import { createClient } from "../../lib/supabase";
import ExamImage from "../ui/ExamImage";
import Notification from "../ui/Notification";
import PageSkeleton from "../ui/PageSkeleton";
import { useDialogs } from "./Dialog";

const field = "w-full rounded-xl border border-white/10 bg-surface-raised px-3 py-2 text-paper";
const button = "rounded-xl border border-white/20 px-4 py-2 text-sm font-bold hover:border-lime disabled:opacity-50";
const primary = "rounded-xl bg-lime px-5 py-2 font-bold text-ink disabled:opacity-50";
type Option = ExamQuestion["options"][number];
const option = (n: number, ordering = false): Option => ({
  id: crypto.randomUUID(), option_text: ordering ? "Weggebruiker" : `Antwoord ${n}`,
  image_url: null, is_correct: !ordering && n === 1,
  coordinates_x: ordering ? 20 * n : null, coordinates_y: ordering ? 50 : null, correct_order: ordering ? n : null,
});
const question = (type: ExamQuestion["question_type"]): ExamQuestion => ({
  id: crypto.randomUUID(), question_text: "", image_url: null, question_type: type,
  correct_number: type === "number" ? 0 : null, explanation: "",
  options: type === "number" ? [] : Array.from({ length: type === "ordering" ? 3 : 2 }, (_, i) => option(i + 1, type === "ordering")),
});
const newExam = (): ExamDefinition => ({
  id: crypto.randomUUID(), title: "", description: "", time_limit_minutes: 30, passing_score: 1,
  allowed_packages: ["start", "boost", "max"], is_published: false, questions: [],
});

export default function ExamBuilder() {
  const [list, setList] = useState<Awaited<ReturnType<typeof listAdminExams>>>([]);
  const [exam, setExam] = useState<ExamDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const saved = useRef("");
  const { confirm, element } = useDialogs();
  const fail = (error: unknown) => setMessage({ text: error instanceof Error ? error.message : "Er is een fout opgetreden.", type: "error" });
  useEffect(() => {
    let active = true;
    listAdminExams().then((items) => { if (active) setList(items); })
      .catch((error: unknown) => { if (active) fail(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const updateQuestion = (index: number, next: ExamQuestion) => setExam((prev) => prev && ({ ...prev, questions: prev.questions.map((q, i) => i === index ? next : q) }));
  const move = (from: number, to: number) => setExam((prev) => {
    if (!prev || to < 0 || to >= prev.questions.length || from === to) return prev;
    const questions = [...prev.questions];
    questions.splice(to, 0, questions.splice(from, 1)[0]);
    return { ...prev, questions };
  });
  async function upload(file: File, apply: (path: string) => void) {
    if (!exam) return;
    setBusy(true);
    try {
      const { path, token } = await prepareExamImage(exam.id, file.type, file.size);
      const { error } = await createClient().storage.from("exam-images").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw new Error(`Upload mislukt: ${error.message}`);
      apply(path);
    } catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function save() {
    if (!exam) return;
    const parsed = examSchema.safeParse(exam);
    if (!parsed.success) return fail(new Error(parsed.error.issues[0]?.message ?? "Vul alle velden correct in."));
    setBusy(true);
    try {
      await saveAdminExam(parsed.data);
      saved.current = JSON.stringify(parsed.data);
      setExam(parsed.data);
      try {
        setList(await listAdminExams());
        setMessage({ type: "success", text: "Examen opgeslagen." });
      } catch (error) {
        setMessage({ type: "error", text: `Examen opgeslagen, maar het overzicht kon niet worden ververst: ${error instanceof Error ? error.message : "onbekende fout"}` });
      }
    }
    catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function select(id: string) {
    if (exam && JSON.stringify(exam) !== saved.current && !await confirm({ title: "Niet-opgeslagen wijzigingen", message: "Je wijzigingen gaan verloren als je een ander examen opent.", confirmLabel: "Verder", danger: true })) return;
    setBusy(true);
    try { const value = await loadAdminExam(id); saved.current = JSON.stringify(value); setExam(value); setPosition(null); } catch (error) { fail(error); } finally { setBusy(false); }
  }
  async function create() {
    if (exam && JSON.stringify(exam) !== saved.current && !await confirm({ title: "Niet-opgeslagen wijzigingen", message: "Je wijzigingen gaan verloren als je een nieuw examen opent.", confirmLabel: "Verder", danger: true })) return;
    const value = newExam();
    saved.current = JSON.stringify(value);
    setExam(value); setPosition(null);
  }
  useEffect(() => {
    if (!exam || JSON.stringify(exam) === saved.current) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [exam]);
  function setCoordinates(event: MouseEvent<HTMLDivElement>, index: number, q: ExamQuestion) {
    if (!position) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
    updateQuestion(index, { ...q, options: q.options.map((o) => o.id === position ? { ...o, coordinates_x: Math.round(x), coordinates_y: Math.round(y) } : o) });
  }
  if (loading) return <main className="p-6"><PageSkeleton kind="admin-editor" /></main>;
  return <main className="space-y-6 p-6">
    {element}
    {message && <Notification type={message.type} onDismiss={() => setMessage(null)}>{message.text}</Notification>}
    <div><h1 className="font-display text-3xl font-extrabold">Oefenexamens beheren</h1><p className="text-paper/60">Maak examens en bepaal welke pakketten toegang hebben.</p></div>
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <button className={primary} disabled={busy} onClick={() => void create()}>Nieuw examen</button>
        {list.map((item) => <button key={item.id} className={`${button} block w-full text-left`} disabled={busy} onClick={() => void select(item.id)}>{item.title} <span className="block text-xs text-paper/50">{item.is_published ? "Gepubliceerd" : "Concept"}</span></button>)}
      </aside>
      {exam && <fieldset disabled={busy} className="min-w-0 space-y-6 rounded-3xl border border-white/10 bg-surface p-5">
        <h2 className="text-xl font-bold">Exameninstellingen</h2>
        <label className="block">Titel<input className={field} value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} /></label>
        <label className="block">Beschrijving<textarea className={field} value={exam.description} onChange={(e) => setExam({ ...exam, description: e.target.value })} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Tijd in minuten<input className={field} type="number" min="1" max="240" value={exam.time_limit_minutes} onChange={(e) => setExam({ ...exam, time_limit_minutes: Number(e.target.value) })} /></label>
          <label>Aantal goed om te slagen<input className={field} type="number" min="1" value={exam.passing_score} onChange={(e) => setExam({ ...exam, passing_score: Number(e.target.value) })} /></label>
        </div>
        <fieldset><legend>Pakketten met toegang</legend><div className="flex flex-wrap gap-4">{(["start", "boost", "max"] as const).map((pack) => <label key={pack}><input type="checkbox" checked={exam.allowed_packages.includes(pack)} onChange={(e) => setExam({ ...exam, allowed_packages: e.target.checked ? [...exam.allowed_packages, pack] : exam.allowed_packages.filter((p) => p !== pack) })} /> {pack.toUpperCase()}</label>)}</div></fieldset>
        <label className="block"><input type="checkbox" checked={exam.is_published} onChange={(e) => setExam({ ...exam, is_published: e.target.checked })} /> Publiceren voor leerlingen</label>
        <div className="flex flex-wrap items-center gap-2"><h2 className="mr-auto text-xl font-bold">Vragen ({exam.questions.length})</h2>{(["multiple_choice", "number", "ordering"] as const).map((type) => <button key={type} className={button} onClick={() => setExam({ ...exam, questions: [...exam.questions, question(type)] })}>+ {type === "multiple_choice" ? "Meerkeuze" : type === "number" ? "Getal" : "Volgorde"}</button>)}</div>
        {exam.questions.map((q, index) => <article key={q.id} draggable onDragStart={() => setDrag(index)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, index); setDrag(null); }} className="space-y-4 rounded-2xl border border-white/15 p-4">
          <div className="flex flex-wrap items-center gap-2"><strong className="mr-auto">Vraag {index + 1} · {q.question_type === "multiple_choice" ? "Meerkeuze" : q.question_type === "number" ? "Getal" : "Volgorde"} ⋮⋮</strong>
            <button className={button} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Vraag omhoog">↑</button><button className={button} disabled={index === exam.questions.length - 1} onClick={() => move(index, index + 1)} aria-label="Vraag omlaag">↓</button>
            <button className={button} onClick={async () => { if (await confirm({ title: "Vraag verwijderen?", message: "Deze vraag wordt bij het opslaan uit dit examen verwijderd.", confirmLabel: "Verwijderen" })) setExam((prev) => prev && ({ ...prev, questions: prev.questions.filter((item) => item.id !== q.id) })); }}>Verwijder</button>
          </div>
          <label className="block">Vraag<textarea className={field} value={q.question_text} onChange={(e) => updateQuestion(index, { ...q, question_text: e.target.value })} /></label>
          <label className="block">Afbeelding <input className="block text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, (path) => setExam((prev) => prev && ({ ...prev, questions: prev.questions.map((item) => item.id === q.id ? { ...item, image_url: path } : item) }))); }} /></label>
          {q.image_url && <button className={button} onClick={() => updateQuestion(index, { ...q, image_url: null })}>Afbeelding verwijderen</button>}
          {q.image_url && <div className="relative max-w-2xl" onClick={(e) => q.question_type === "ordering" && setCoordinates(e, index, q)}><ExamImage path={q.image_url} alt="Vraagafbeelding" className="block h-auto w-full rounded-xl" />{q.question_type === "ordering" && q.options.map((o) => <span key={o.id} style={{ left: `${o.coordinates_x}%`, top: `${o.coordinates_y}%` }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime px-2 font-bold text-ink">{o.correct_order}</span>)}</div>}
          {q.question_type === "number" && <label className="block">Correct getal<input className={field} type="number" value={q.correct_number ?? ""} onChange={(e) => updateQuestion(index, { ...q, correct_number: e.target.value === "" ? null : Number(e.target.value) })} /></label>}
          {q.question_type === "ordering" && <p className="text-sm text-paper/70">Selecteer een positie en klik op de afbeelding, of vul de percentages in. Het positienummer is de juiste volgorde.</p>}
          {q.options.map((o, oi) => <div key={o.id} className="space-y-2 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-2">{q.question_type === "multiple_choice" ? <label><input type="radio" name={`correct-${q.id}`} checked={o.is_correct} onChange={() => updateQuestion(index, { ...q, options: q.options.map((item) => ({ ...item, is_correct: item.id === o.id })) })} /> Juist</label> : <button className={button} onClick={() => setPosition(o.id)}>Positie {oi + 1}{position === o.id ? " ✓" : ""}</button>}
              <input aria-label="Antwoordtekst" className={field} value={o.option_text} onChange={(e) => updateQuestion(index, { ...q, options: q.options.map((item) => item.id === o.id ? { ...item, option_text: e.target.value } : item) })} />
              {q.question_type === "ordering" && <button className={button} disabled={oi === 0} aria-label="Positie eerder in de juiste volgorde" onClick={() => { const items = [...q.options]; [items[oi - 1], items[oi]] = [items[oi], items[oi - 1]]; updateQuestion(index, { ...q, options: items.map((item, i) => ({ ...item, correct_order: i + 1 })) }); }}>↑</button>}
              <button className={button} disabled={q.options.length <= (q.question_type === "ordering" ? 3 : 2)} onClick={() => updateQuestion(index, { ...q, options: q.options.filter((item) => item.id !== o.id).map((item, i) => q.question_type === "ordering" ? { ...item, correct_order: i + 1 } : item.is_correct || !o.is_correct ? item : { ...item, is_correct: i === 0 }) })}>×</button>
            </div>
            {q.question_type === "ordering" ? <div className="flex gap-2">{(["coordinates_x", "coordinates_y"] as const).map((key) => <label key={key}>{key === "coordinates_x" ? "X %" : "Y %"}<input className={field} type="number" min="0" max="100" value={o[key] ?? ""} onChange={(e) => updateQuestion(index, { ...q, options: q.options.map((item) => item.id === o.id ? { ...item, [key]: e.target.value === "" ? null : Number(e.target.value) } : item) })} /></label>)}</div> : <><label>Optieafbeelding <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, (path) => setExam((prev) => prev && ({ ...prev, questions: prev.questions.map((item) => item.id === q.id ? { ...item, options: item.options.map((v) => v.id === o.id ? { ...v, image_url: path } : v) } : item) }))); }} /></label>{o.image_url && <><ExamImage path={o.image_url} alt="Optieafbeelding" className="max-h-32 rounded-xl" /><button className={button} onClick={() => updateQuestion(index, { ...q, options: q.options.map((item) => item.id === o.id ? { ...item, image_url: null } : item) })}>Optieafbeelding verwijderen</button></>}</>}
          </div>)}
          {q.question_type !== "number" && q.options.length < 4 && <button className={button} onClick={() => updateQuestion(index, { ...q, options: [...q.options, option(q.options.length + 1, q.question_type === "ordering")] })}>Optie toevoegen</button>}
          <label className="block">Uitleg na afloop<textarea className={field} value={q.explanation} onChange={(e) => updateQuestion(index, { ...q, explanation: e.target.value })} /></label>
        </article>)}
        <button className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Bezig..." : "Examen opslaan"}</button>
      </fieldset>}
    </div>
  </main>;
}
