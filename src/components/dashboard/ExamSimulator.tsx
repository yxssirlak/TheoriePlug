"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { attemptAction, listStudentExams } from "../../app/exam-actions";
import { EXAM_MAX_QUESTIONS, EXAM_TIME_LIMIT_MINUTES } from "../../lib/exam-simulator";
import { answerStatus, remainingMinutes } from "../../lib/exam-interaction";
import ExamImage from "../ui/ExamImage";
import Notification from "../ui/Notification";
import PageSkeleton from "../ui/PageSkeleton";
import { useDialogs } from "../admin/Dialog";
import { PageHeader } from "./ContentState";
import OrderingQuestion from "./OrderingQuestion";
import { useUser } from "./user-context";
import ExamResults from "./ExamResults";
import ZoneQuestion from "./ZoneQuestion";

type Exam = Awaited<ReturnType<typeof listStudentExams>>[number];
type Attempt = Awaited<ReturnType<typeof attemptAction>>;
type Answers = Record<string, unknown>;
const button = "rounded-xl border border-white/20 px-4 py-3 font-semibold hover:border-lime disabled:opacity-50";
const primary = "rounded-xl bg-lime px-5 py-3 font-bold text-ink disabled:opacity-50";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Er is een fout opgetreden.";

export default function ExamSimulator() {
  const user = useUser();
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
  if (attempt.status === "completed") return <>{notification}<ExamResults key={attempt.id} attemptId={attempt.id} score={attempt.score} passingScore={attempt.passing_score} questionCount={attempt.question_count} results={attempt.result} answers={attempt.answers} onBack={() => void backToExams()} /></>;
  const q = attempt.questions[index];
  if (!q) return <Notification>De vragen konden niet worden geladen. Herlaad de pagina.</Notification>;
  const numericAnswer = answers[q.id];
  const ordering = typeof answers[q.id] === "object" && answers[q.id] !== null && !Array.isArray(answers[q.id]) ? answers[q.id] as Record<string, number> : {};
  return <>{element}{notification}<div className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-4xl flex-col gap-5">
    <header className="rounded-2xl border border-white/10 bg-surface p-4">
      <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <span className="block truncate text-base font-bold text-paper">{user.name.trim().split(/\s+/)[0]}</span>
          <span className="block text-[10px] font-bold uppercase tracking-widest text-paper/50">B Theorie</span>
        </div>
        <div className="order-first col-span-2 text-center sm:order-none sm:col-span-1">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-paper/50">Resterende tijd</span>
          <div aria-label={`Resterende tijd: ${remainingMinutes(seconds)} minuten`}>
            <strong aria-hidden="true" className="block font-mono text-xl text-lime">{remainingMinutes(seconds)}</strong>
            <span aria-hidden="true" className="block text-xs text-paper/60">minuten</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className={`${button} px-3 py-2 text-sm ${marks.includes(q.id) ? "border-amber-400 bg-amber-400/15 text-amber-300" : ""}`} onClick={mark} disabled={busy} aria-pressed={marks.includes(q.id)} aria-label={marks.includes(q.id) ? "Markering verwijderen" : "Markeer voor later"} title={marks.includes(q.id) ? "Markering verwijderen" : "Markeer voor later"}>⚑ <span className="hidden sm:inline">{marks.includes(q.id) ? "Gemarkeerd" : "Markeer"}</span></button>
          <button type="button" className={`${button} px-3 py-2 text-sm ${overview ? "border-lime text-lime" : ""}`} aria-label="Overzicht" aria-pressed={overview} onClick={() => setOverview(!overview)}>▦ <span className="hidden sm:inline">Overzicht</span></button>
        </div>
      </div>
    </header>
    {unsaved && !saving && <p role="status" className="text-sm text-amber-300">Antwoorden niet opgeslagen.<button className="ml-3 text-lime underline" onClick={() => void persist(progress.current.answers, progress.current.marks)}>Opnieuw opslaan</button></p>}
    {overview ? <section className="rounded-2xl border border-white/10 bg-surface p-5"><h2 className="mb-4 text-xl font-bold">Overzicht</h2>
      <div className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-paper/70"><span><span className="text-lime">●</span> Ingevuld</span><span><span className="text-amber-300">⚑</span> Gemarkeerd</span><span><span className="text-sky-300">◐</span> Deels ingevuld</span><span><span className="text-paper/50">○</span> Niet ingevuld</span></div>
      <div className="flex flex-wrap gap-2">{attempt.questions.map((item, i) => {
        const status = answerStatus(item, answers[item.id]);
        const marked = marks.includes(item.id);
        const statusText = status === "answered" ? "ingevuld" : status === "partial" ? "deels ingevuld" : "niet ingevuld";
        const color = marked ? "border-amber-400/70 bg-amber-400/15 text-amber-200" : status === "answered" ? "border-lime/60 bg-lime/15 text-lime" : status === "partial" ? "border-sky-400/60 bg-sky-400/10 text-sky-200" : "border-white/20 text-paper/70";
        return <button key={item.id} type="button" aria-label={`Vraag ${i + 1}, ${statusText}${marked ? ", gemarkeerd" : ""}`} aria-current={index === i ? "step" : undefined} className={`min-h-12 min-w-12 rounded-xl border px-3 font-bold transition focus-visible:outline-2 focus-visible:outline-lime ${color} ${index === i ? "ring-2 ring-white/50" : ""}`} onClick={() => { setIndex(i); setOverview(false); }}>{i + 1}<span aria-hidden="true" className="ml-1">{status === "answered" ? "✓" : status === "partial" ? "◐" : ""}{marked ? "⚑" : ""}</span></button>;
      })}</div>
      <div className="mt-5 flex flex-wrap gap-3"><button className={button} onClick={() => setOverview(false)}>Terug naar vraag</button><button className={`${primary} ml-auto`} disabled={busy} onClick={() => void finish()}>{busy ? "Inleveren..." : "Examen inleveren"}</button></div>
    </section> : <section className="space-y-5 rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"><h1 className="text-xl font-bold">{q.question_text}</h1>
      {q.image_url && !["ordering", "single_drag", "hotspot"].includes(q.question_type) && <div className="max-w-3xl"><ExamImage path={q.image_url} alt="Media bij de vraag" className="block h-auto w-full rounded-xl" /></div>}
      {["multiple_choice", "yes_no", "multiple_response"].includes(q.question_type) && <div className="grid gap-3">{q.options.map((o, i) => {
        const multiple = q.question_type === "multiple_response";
        const currentAnswer = answers[q.id];
        const selectedAnswers = Array.isArray(currentAnswer) ? currentAnswer.filter((id): id is string => typeof id === "string") : [];
        const selected = multiple ? selectedAnswers.includes(o.id) : currentAnswer === o.id;
        return <button key={o.id} type="button" aria-pressed={selected} onClick={() => answer(multiple ? selected ? selectedAnswers.filter((id) => id !== o.id) : [...selectedAnswers, o.id] : o.id)} className={`${button} text-left ${selected ? "border-lime bg-lime/10" : ""}`}><span>{String.fromCharCode(65 + i)}. {o.option_text}</span>{o.image_url && <ExamImage path={o.image_url} alt={`Afbeelding antwoord ${String.fromCharCode(65 + i)}`} className="mt-2 max-h-36 rounded-xl" />}</button>;
      })}</div>}
      {q.question_type === "number" && <label className="block">Je antwoord<input type="text" inputMode="decimal" className="mt-2 block w-full max-w-xs rounded-xl border border-white/20 bg-ink p-3" value={typeof numericAnswer === "string" ? numericAnswer : ""} onChange={(e) => { if (/^-?\d*(?:[.,]\d*)?$/.test(e.target.value) && e.target.value.length <= 64) answer(e.target.value); }} /></label>}
      {q.question_type === "ordering" && q.image_url && <OrderingQuestion key={q.id} imageUrl={q.image_url} options={q.options} value={ordering} onChange={answer} />}
      {q.question_type === "ordering" && !q.image_url && <p role="alert" className="text-red-300">De afbeelding voor deze sleepvraag ontbreekt.</p>}
      {(q.question_type === "single_drag" || q.question_type === "hotspot") && (q.image_url ? <ZoneQuestion key={q.id} imageUrl={q.image_url} options={q.options} value={typeof answers[q.id] === "string" ? answers[q.id] as string : null} onChange={answer} mode={q.question_type} /> : <p role="alert" className="text-red-300">De afbeelding bij deze vraag ontbreekt.</p>)}
    </section>}
    <nav aria-label="Vragennavigatie" className="sticky bottom-20 z-30 mt-auto grid grid-cols-3 items-center gap-2 rounded-2xl border border-white/10 bg-surface/95 p-3 shadow-xl backdrop-blur lg:bottom-4">
      <button className={`${button} justify-self-start`} disabled={index === 0 || busy} onClick={() => { setIndex(index - 1); setOverview(false); }}>← Vorige</button>
      <span className="text-center text-sm font-bold text-paper/70">Vraag {index + 1} van {attempt.question_count}</span>
      {index < attempt.questions.length - 1 ? <button className={`${primary} justify-self-end`} disabled={busy} onClick={() => { setIndex(index + 1); setOverview(false); }}>Volgende →</button> : <button className={`${primary} justify-self-end`} disabled={busy} onClick={() => void finish()}>{busy ? "Bezig..." : "Inleveren"}</button>}
    </nav>
  </div></>;
}
