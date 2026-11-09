"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { attemptAction, listStudentExams } from "../../app/exam-actions";
import { EXAM_MAX_QUESTIONS, EXAM_TIME_LIMIT_MINUTES } from "../../lib/exam-simulator";
import ExamImage from "../ui/ExamImage";
import Notification from "../ui/Notification";
import PageSkeleton from "../ui/PageSkeleton";
import { useDialogs } from "../admin/Dialog";
import { PageHeader } from "./ContentState";

type Exam = Awaited<ReturnType<typeof listStudentExams>>[number];
type Attempt = Awaited<ReturnType<typeof attemptAction>>;
type Answers = Record<string, unknown>;
const button = "rounded-xl border border-white/20 px-4 py-3 font-semibold hover:border-lime disabled:opacity-50";
const primary = "rounded-xl bg-lime px-5 py-3 font-bold text-ink disabled:opacity-50";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Er is een fout opgetreden.";

export default function ExamSimulator() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selected, setSelected] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [marks, setMarks] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [overview, setOverview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const current = useRef<Attempt | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const queued = useRef(0);
  const expired = useRef(false);
  const retryAfter = useRef(0);
  const changeNumber = useRef(0);
  const progress = useRef<{ answers: Answers; marks: string[] }>({ answers: {}, marks: [] });
  const offset = useRef(0);
  const { confirm, element } = useDialogs();

  const load = useCallback(async () => {
    try { setExams(await listStudentExams()); }
    catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    listStudentExams().then((items) => { if (active) setExams(items); })
      .catch((e: unknown) => { if (active) setError(errorText(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function applyAttempt(value: Attempt) {
    current.current = value;
    offset.current = Date.parse(value.server_time) - Date.now();
    setSeconds(Math.max(0, Math.ceil((Date.parse(value.deadline_at) - Date.parse(value.server_time)) / 1000)));
    setAttempt(value);
    if (value.status === "completed") setSaving(false);
  }
  async function begin(exam: Exam) {
    setBusy(true);
    try {
      const value = await attemptAction({ examId: exam.id, action: "start" });
      progress.current = { answers: value.answers, marks: value.marked_questions };
      setAnswers(value.answers); setMarks(value.marked_questions);
      setIndex(0); setOverview(false); setUnsaved(false); expired.current = false; applyAttempt(value);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  function persist(nextAnswers: Answers, nextMarks: string[], submit = false) {
    progress.current = { answers: nextAnswers, marks: nextMarks };
    const change = ++changeNumber.current;
    setUnsaved(true);
    queued.current++;
    setSaving(true);
    queue.current = queue.current.then(async () => {
      const active = current.current;
      if (!active || active.status !== "in_progress") return;
      const result = await attemptAction({ examId: active.exam_id, attemptId: active.id, action: submit ? "submit" : "save",
        answers: nextAnswers, marks: nextMarks, revision: active.revision });
      applyAttempt(result);
      if (result.status === "completed" && Date.parse(result.server_time) >= Date.parse(result.deadline_at)) {
        setError("De tijd is verstreken. De uitslag is gebaseerd op de laatst opgeslagen antwoorden.");
      }
      if (change === changeNumber.current || result.status === "completed") setUnsaved(false);
    }).catch((e: unknown) => {
      setError(`${errorText(e)} Je laatste antwoorden zijn mogelijk niet opgeslagen.`);
      expired.current = false;
      retryAfter.current = Date.now() + 5000;
    }).finally(() => {
      queued.current--;
      if (queued.current === 0) setSaving(false);
    });
    return queue.current;
  }
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((Date.parse(attempt.deadline_at) - Date.now() - offset.current) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !expired.current && Date.now() >= retryAfter.current) {
        expired.current = true;
        const latest = progress.current;
        void persist(latest.answers, latest.marks, true);
      }
    }, 500);
    return () => window.clearInterval(timer);
  // persist reads only refs; the timer is restarted when the server refreshes the deadline.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id, attempt?.status, attempt?.deadline_at]);
  useEffect(() => {
    if (!unsaved && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved, saving]);
  function answer(value: unknown) {
    if (!attempt || busy) return;
    const next = { ...progress.current.answers, [attempt.questions[index].id]: value };
    progress.current = { ...progress.current, answers: next };
    setAnswers(next);
    void persist(next, progress.current.marks);
  }
  function mark() {
    if (!attempt) return;
    const id = attempt.questions[index].id;
    const next = progress.current.marks.includes(id) ? progress.current.marks.filter((m) => m !== id) : [...progress.current.marks, id];
    progress.current = { ...progress.current, marks: next };
    setMarks(next); void persist(progress.current.answers, next);
  }
  async function finish() {
    if (!await confirm({ title: "Examen inleveren?", message: "Je kunt daarna je antwoorden niet meer aanpassen.", confirmLabel: "Inleveren", danger: false })) return;
    setBusy(true);
    await persist(progress.current.answers, progress.current.marks, true);
    setBusy(false);
  }
  async function backToExams() {
    setAttempt(null); current.current = null; setSelected(null); setLoading(true);
    await load();
  }
  if (loading) return <><PageHeader title="Oefenexamens" text="Oefen met een examensimulatie." /><PageSkeleton kind="exam" header={false} /></>;
  const notification = error && <Notification onDismiss={() => setError(null)}>{error}</Notification>;
  if (!selected) return <>{notification}<PageHeader title="Oefenexamens" text="Oefen met een examensimulatie." />
    {exams.length === 0 ? <p className="rounded-2xl bg-surface p-6 text-paper/70">Er zijn nog geen examens beschikbaar voor jouw pakket.</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{exams.map((exam) => <button key={exam.id} className="rounded-3xl border border-white/10 bg-surface p-6 text-left hover:border-lime" onClick={() => setSelected(exam)}><h2 className="text-xl font-bold">{exam.title}</h2><p className="mt-2 text-paper/60">{exam.description}</p><p className="mt-4 text-sm">{exam.time_limit_minutes} minuten · {exam.question_count} vragen</p><p className="mt-2 text-lime">{exam.active_attempt ? "Poging hervatten" : exam.best_score !== null ? `Hoogste score: ${exam.best_score} goed` : "Nog niet gemaakt"}</p></button>)}</div>}
  </>;
  if (!attempt) return <>{notification}<div className="max-w-2xl rounded-3xl border border-lime/30 bg-surface p-6"><button className={button} onClick={() => setSelected(null)}>← Alle examens</button><h1 className="mt-6 text-3xl font-bold">{selected.title}</h1><p className="mt-3 text-paper/70">{selected.description}</p><ul className="mt-5 list-disc space-y-2 pl-5 text-paper/80"><li>{selected.question_count} vragen · maximaal {EXAM_MAX_QUESTIONS} vragen · {EXAM_TIME_LIMIT_MINUTES} minuten totaal.</li><li>Je slaagt bij minimaal {selected.passing_score} van de {selected.question_count} vragen goed (88%).</li><li>Je kunt vragen markeren en terugkijken. De tijd loopt door als je de pagina verlaat.</li><li>Bij tijd verstreken wordt het laatst opgeslagen antwoord ingeleverd.</li></ul><button className={`${primary} mt-6`} disabled={busy} onClick={() => void begin(selected)}>{busy ? "Bezig..." : selected.active_attempt ? "Poging hervatten" : "Start examen"}</button></div></>;
  if (attempt.status === "completed") return <>{notification}<div className="max-w-3xl space-y-5 rounded-3xl border border-white/10 bg-surface p-6"><h1 className={`text-3xl font-bold ${(attempt.score ?? 0) >= attempt.passing_score ? "text-lime" : "text-red-400"}`}>{(attempt.score ?? 0) >= attempt.passing_score ? "Geslaagd" : "Gezakt"}</h1><p>{attempt.score} van {attempt.question_count} goed · Geslaagd bij minimaal {attempt.passing_score} goede antwoorden (88%).</p><div className="space-y-3">{attempt.result?.map((result, i) => <div key={result.question_id} className="rounded-xl bg-white/5 p-4"><strong className={result.correct ? "text-lime" : "text-red-400"}>{i + 1}. {result.correct ? "Goed" : "Fout"}</strong><p>{result.question_text}</p>{result.explanation && <p className="mt-2 text-sm text-paper/70">{result.explanation}</p>}</div>)}</div><button className={primary} onClick={() => void backToExams()}>Terug naar examens</button></div></>;
  const q = attempt.questions[index];
  if (!q) return <Notification>De vragen konden niet worden geladen. Herlaad de pagina.</Notification>;
  const numericAnswer = answers[q.id];
  const ordering = typeof answers[q.id] === "object" && answers[q.id] !== null && !Array.isArray(answers[q.id]) ? answers[q.id] as Record<string, number> : {};
  function place(id: string, value: number) {
    const next = { ...ordering };
    for (const key of Object.keys(next)) if (next[key] === value) delete next[key];
    if (value) next[id] = value; else delete next[id];
    answer(next);
  }
  return <>{element}{notification}<div className="mx-auto max-w-4xl space-y-5">
    <div className="rounded-2xl border border-white/10 bg-surface p-4"><div className="flex flex-wrap justify-between gap-2"><strong>Vraag {index + 1} van {attempt.question_count}</strong><strong aria-label="Resterende tijd">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></div><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-lime" style={{ width: `${(index + 1) / attempt.question_count * 100}%` }} /></div><p className="mt-2 text-xs text-paper/60">{saving ? "Antwoorden opslaan..." : unsaved ? "Niet opgeslagen" : "Antwoorden opgeslagen"}{unsaved && !saving && <button className="ml-3 text-lime underline" onClick={() => void persist(progress.current.answers, progress.current.marks)}>Opnieuw opslaan</button>}</p></div>
    {overview ? <div className="rounded-2xl bg-surface p-5"><h2 className="mb-4 text-xl font-bold">Overzicht</h2><div className="flex flex-wrap gap-2">{attempt.questions.map((item, i) => <button key={item.id} className={button} onClick={() => { setIndex(i); setOverview(false); }}>{i + 1}{marks.includes(item.id) ? " ⚑" : ""}{answers[item.id] !== undefined ? " ✓" : ""}</button>)}</div><button className={`${button} mt-5`} onClick={() => setOverview(false)}>Terug naar vraag</button></div> : <div className="space-y-5 rounded-2xl bg-surface p-5"><h1 className="text-xl font-bold">{q.question_text}</h1>
      {q.image_url && <div className="relative max-w-3xl"><ExamImage path={q.image_url} alt="Media bij de vraag" className="block h-auto w-full rounded-xl" />{q.question_type === "ordering" && q.options.map((o) => <div key={o.id} data-zone={o.id} aria-hidden="true" style={{ left: `${o.coordinates_x}%`, top: `${o.coordinates_y}%` }} className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-lime bg-ink/80 font-bold text-lime">{ordering[o.id] ?? "?"}</div>)}</div>}
      {q.question_type === "multiple_choice" && <div className="grid gap-3">{q.options.map((o, i) => <button key={o.id} onClick={() => answer(o.id)} className={`${button} text-left ${answers[q.id] === o.id ? "border-lime bg-lime/10" : ""}`}><span>{String.fromCharCode(65 + i)}. {o.option_text}</span>{o.image_url && <ExamImage path={o.image_url} alt={`Afbeelding antwoord ${String.fromCharCode(65 + i)}`} className="mt-2 max-h-36 rounded-xl" />}</button>)}</div>}
      {q.question_type === "number" && <label className="block">Je antwoord<input type="text" inputMode="decimal" className="mt-2 block w-full max-w-xs rounded-xl border border-white/20 bg-ink p-3" value={typeof numericAnswer === "string" ? numericAnswer : ""} onChange={(e) => { if (/^-?\d*(?:[.,]\d*)?$/.test(e.target.value) && e.target.value.length <= 64) answer(e.target.value); }} /></label>}
      {q.question_type === "ordering" && <><p className="text-paper/70">Sleep de nummers naar de posities op de media, of kies de volgorde hieronder.</p><div className="flex gap-3">{q.options.map((_, i) => <motion.button key={i} drag dragSnapToOrigin dragMomentum={false} onDragEnd={(_, info) => { const x = info.point.x - window.scrollX; const y = info.point.y - window.scrollY; const zone = Array.from(document.querySelectorAll<HTMLElement>("[data-zone]")).find((item) => { const rect = item.getBoundingClientRect(); return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; }); if (zone?.dataset.zone) place(zone.dataset.zone, i + 1); }} className="relative z-10 h-12 w-12 touch-none rounded-full bg-lime font-bold text-ink" aria-label={`Sleep volgordenummer ${i + 1}`}>{i + 1}</motion.button>)}</div><div className="grid gap-2">{q.options.map((o, i) => <label key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span>{o.option_text || `Positie ${i + 1}`} (X {o.coordinates_x}%, Y {o.coordinates_y}%)</span><select className="rounded-lg bg-ink p-2" value={ordering[o.id] ?? ""} onChange={(e) => place(o.id, Number(e.target.value))}><option value="">Kies</option>{q.options.map((_, n) => <option key={n} value={n + 1}>{n + 1}</option>)}</select></label>)}</div></>}
      <button className={button} onClick={mark}>{marks.includes(q.id) ? "Markering verwijderen" : "Markeer voor later"}</button>
    </div>}
    <div className="flex flex-wrap gap-2"><button className={button} disabled={index === 0 || busy} onClick={() => { setIndex(index - 1); setOverview(false); }}>Vorige</button><button className={button} disabled={busy} onClick={() => setOverview(!overview)}>Overzicht</button><button className={button} disabled={index >= attempt.questions.length - 1 || busy} onClick={() => { setIndex(index + 1); setOverview(false); }}>Volgende</button><button className={`${primary} ml-auto`} disabled={busy} onClick={() => void finish()}>{busy ? "Inleveren..." : "Inleveren"}</button></div>
  </div></>;
}
