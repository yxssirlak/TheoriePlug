"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { listAdminExams, loadAdminExam, prepareExamImage, saveAdminExam } from "../../app/exam-actions";
import {
  examSchema,
  EXAM_MAX_QUESTIONS,
  EXAM_PASSING_SCORE,
  EXAM_TIME_LIMIT_MINUTES,
  passingScoreForQuestionCount,
  type ExamDefinition,
  type ExamQuestion,
} from "../../lib/exam-simulator";
import { createClient } from "../../lib/supabase";
import Notification from "../ui/Notification";
import PageSkeleton from "../ui/PageSkeleton";
import { useDialogs } from "./Dialog";
import ExamSelect from "./exam-builder/ExamSelect";
import { ExamChoiceChips, ExamToggle } from "./exam-builder/ExamToggle";
import QuestionEditor from "./exam-builder/QuestionEditor";
import QuestionList from "./exam-builder/QuestionList";
import QuestionPreview from "./exam-builder/QuestionPreview";

type QuestionType = ExamQuestion["question_type"];
type PackageName = ExamDefinition["allowed_packages"][number];
const packages: { value: PackageName; label: string }[] = [
  { value: "start", label: "Start" },
  { value: "boost", label: "Boost" },
  { value: "max", label: "Max" },
];
const examInput = "mt-1.5 h-11 w-full rounded-xl border border-white/[0.09] bg-[#202024] px-3.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#CCFF00]/45 focus:ring-2 focus:ring-[#CCFF00]/10";
const quietButton = "inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-xs font-semibold text-white/75 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-[#CCFF00] disabled:opacity-45";
const primaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#CCFF00] px-4 text-sm font-bold text-[#10140a] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] disabled:cursor-not-allowed disabled:opacity-50";

function createOption(number: number, ordering = false): ExamQuestion["options"][number] {
  return {
    id: crypto.randomUUID(),
    option_text: ordering ? `Weggebruiker ${number}` : `Antwoord ${number}`,
    image_url: null,
    is_correct: !ordering && number === 1,
    coordinates_x: ordering ? 20 + number * 15 : null,
    coordinates_y: ordering ? 50 : null,
    correct_order: ordering ? number : null,
  };
}

function createQuestion(type: QuestionType): ExamQuestion {
  const ordering = type === "ordering";
  return {
    id: crypto.randomUUID(),
    question_text: "",
    image_url: null,
    question_type: type,
    correct_number: type === "number" ? 0 : null,
    explanation: "",
    options: type === "number" ? [] : Array.from({ length: ordering ? 3 : 2 }, (_, index) => createOption(index + 1, ordering)),
  };
}

function createExam(): ExamDefinition {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    time_limit_minutes: EXAM_TIME_LIMIT_MINUTES,
    passing_score: EXAM_PASSING_SCORE,
    allowed_packages: ["start", "boost", "max"],
    is_published: false,
    questions: [],
  };
}

function typeLabel(type: QuestionType) {
  return type === "multiple_choice" ? "Meerkeuze" : type === "number" ? "Getal" : "Voorrang";
}

export default function ExamBuilder() {
  const [list, setList] = useState<Awaited<ReturnType<typeof listAdminExams>>>([]);
  const [exam, setExam] = useState<ExamDefinition | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [savedDefinition, setSavedDefinition] = useState("");
  const reduceMotion = useReducedMotion();
  const { confirm, element } = useDialogs();

  function fail(error: unknown) {
    setMessage({
      text: error instanceof Error ? error.message : "Er is een fout opgetreden.",
      type: "error",
    });
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const items = await listAdminExams();
        if (!active) return;
        setList(items);
        if (items[0]) {
          try {
            const value = await loadAdminExam(items[0].id);
            if (active) {
              setSavedDefinition(JSON.stringify(value));
              setExam(value);
              setSelectedQuestionId(value.questions[0]?.id ?? null);
            }
          } catch (error) {
            if (active) fail(error);
          }
        }
      } catch (error) {
        if (active) fail(error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  const question = exam?.questions.find((item) => item.id === selectedQuestionId) ?? null;
  const questionIndex = question ? exam?.questions.findIndex((item) => item.id === question.id) ?? -1 : -1;
  const changed = Boolean(exam && (!list.some((item) => item.id === exam.id) || JSON.stringify(exam) !== savedDefinition));
  const examOptions = [
    ...(exam ? [{
      value: exam.id,
      label: exam.title || "Nieuw examen",
      detail: list.some((item) => item.id === exam.id) ? "Huidig examen" : "Concept · nog niet opgeslagen",
    }] : []),
    ...list.filter((item) => item.id !== exam?.id).map((item) => ({
      value: item.id,
      label: item.title,
      detail: item.is_published ? "Gepubliceerd" : "Concept",
    })),
  ];

  function updateExam(patch: Partial<ExamDefinition>) {
    setExam((current) => current ? { ...current, ...patch } : current);
  }

  function updateQuestion(next: ExamQuestion) {
    setExam((current) => current
      ? { ...current, questions: current.questions.map((item) => item.id === next.id ? next : item) }
      : current);
  }

  function moveQuestion(from: number, to: number) {
    setExam((current) => {
      if (!current || from < 0 || from >= current.questions.length || to < 0 || to >= current.questions.length || from === to) return current;
      const questions = [...current.questions];
      questions.splice(to, 0, questions.splice(from, 1)[0]);
      return { ...current, questions };
    });
  }

  async function upload(file: File, apply: (path: string) => void) {
    if (!exam) return;
    setBusy(true);
    try {
      const { path, token } = await prepareExamImage(exam.id, file.type, file.size);
      const { error } = await createClient().storage.from("exam-images").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw new Error(`Upload mislukt: ${error.message}`);
      apply(path);
      setMessage({ type: "success", text: "Media geüpload." });
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!exam) return;
    const parsed = examSchema.safeParse(exam);
    if (!parsed.success) {
      fail(new Error(parsed.error.issues[0]?.message ?? "Vul alle velden correct in."));
      return;
    }
    setBusy(true);
    try {
      await saveAdminExam(parsed.data);
      setSavedDefinition(JSON.stringify(parsed.data));
      setExam(parsed.data);
      setList((current) => [
        { id: parsed.data.id, title: parsed.data.title, is_published: parsed.data.is_published },
        ...current.filter((item) => item.id !== parsed.data.id),
      ]);
      try {
        setList(await listAdminExams());
        setMessage({ type: "success", text: "Examen opgeslagen." });
      } catch (error) {
        setMessage({
          type: "error",
          text: `Examen opgeslagen, maar het overzicht kon niet worden ververst: ${error instanceof Error ? error.message : "onbekende fout"}`,
        });
      }
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  async function selectExam(id: string) {
    if (!exam || id === exam.id) return;
    if (changed && !await confirm({
      title: "Niet-opgeslagen wijzigingen",
      message: "Je wijzigingen gaan verloren als je een ander examen opent.",
      confirmLabel: "Verder",
      danger: true,
    })) return;
    setBusy(true);
    try {
      const value = await loadAdminExam(id);
      setSavedDefinition(JSON.stringify(value));
      setExam(value);
      setSelectedQuestionId(value.questions[0]?.id ?? null);
      setPreview(false);
      setMessage(null);
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  }

  async function createNewExam() {
    if (exam && changed && !await confirm({
      title: "Niet-opgeslagen wijzigingen",
      message: "Je wijzigingen gaan verloren als je een nieuw examen opent.",
      confirmLabel: "Verder",
      danger: true,
    })) return;
    const value = createExam();
    setSavedDefinition(JSON.stringify(value));
    setExam(value);
    setSelectedQuestionId(null);
    setPreview(false);
    setMessage(null);
  }

  function addQuestion(type: QuestionType) {
    if (!exam) return;
    if (exam.questions.length >= EXAM_MAX_QUESTIONS) {
      fail(new Error(`Een examen kan maximaal ${EXAM_MAX_QUESTIONS} vragen bevatten.`));
      return;
    }
    const next = createQuestion(type);
    setExam({ ...exam, questions: [...exam.questions, next] });
    setSelectedQuestionId(next.id);
    setPreview(false);
  }

  async function deleteQuestion() {
    if (!question || !exam) return;
    if (!await confirm({
      title: "Vraag verwijderen?",
      message: "Deze vraag wordt bij het opslaan uit dit examen verwijderd.",
      confirmLabel: "Verwijderen",
    })) return;
    const index = exam.questions.findIndex((item) => item.id === question.id);
    const questions = exam.questions.filter((item) => item.id !== question.id);
    setExam({ ...exam, questions });
    setSelectedQuestionId(questions[Math.min(index, questions.length - 1)]?.id ?? null);
    setPreview(false);
  }

  useEffect(() => {
    if (!exam || !changed) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [exam, changed]);

  if (loading) return <div className="-m-4 min-h-screen bg-[#0e0e11] p-6 sm:-m-6 lg:-m-10"><PageSkeleton kind="admin-editor" /></div>;

  return (
    <main className="-m-4 min-h-screen bg-[#0e0e11] px-4 py-6 text-white sm:-m-6 sm:px-6 sm:py-8 lg:-m-10 lg:px-10 lg:py-10">
      {element}
      {message && <Notification type={message.type} onDismiss={() => setMessage(null)}>{message.text}</Notification>}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-[1500px] space-y-6"
      >
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Exam Builder</h1>
            <p className="mt-2 max-w-xl text-sm text-white/50">Stel een CBR-oefenexamen samen, vraag voor vraag.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <div className="min-w-0 flex-1 sm:min-w-[220px] xl:w-64">
              <ExamSelect label="Huidig examen" value={exam?.id ?? ""} options={examOptions}
                onChange={(id) => void selectExam(id)} disabled={busy || examOptions.length === 0} />
            </div>
            <button type="button" className={quietButton} onClick={() => void createNewExam()} disabled={busy}>+ Nieuw examen</button>
            <button type="button" className={primaryButton} onClick={() => void save()} disabled={busy || !exam}>
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#10140a]/25 border-t-[#10140a]" /> : <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 3h10l3 3v11H3V3z" /><path d="M6 3v5h8V3M6 17v-6h8v6" /></svg>}
              {busy ? "Bezig…" : "Examen opslaan"}
            </button>
          </div>
        </header>

        {exam ? (
          <>
            <fieldset disabled={busy} className="contents">
            <section aria-labelledby="exam-settings-title" className="rounded-3xl border border-white/[0.09] bg-[#18181b] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#CCFF00]/65">Examenconfiguratie</p>
                  <h2 id="exam-settings-title" className="mt-1 text-sm font-bold text-white">Instellingen</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${changed ? "bg-amber-300" : "bg-[#CCFF00]"}`} />
                  <span className="text-[10px] font-semibold text-white/45">{changed ? "Niet opgeslagen" : "Opgeslagen"}</span>
                  <ExamToggle checked={exam.is_published} onChange={(is_published) => updateExam({ is_published })}
                    label={exam.is_published ? "Gepubliceerd" : "Concept"} disabled={busy} />
                </div>
              </div>
              {exam.is_published && exam.questions.length === 0 && (
                <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-3.5 py-2.5 text-xs text-amber-100/80">
                  Voeg minimaal één vraag toe voordat je dit examen kunt publiceren.
                </p>
              )}
              {exam.questions.length > EXAM_MAX_QUESTIONS && (
                <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-3.5 py-2.5 text-xs text-amber-100/80">
                  Dit bestaande concept bevat meer dan {EXAM_MAX_QUESTIONS} vragen. Verwijder er eerst {exam.questions.length - EXAM_MAX_QUESTIONS} om het te kunnen opslaan.
                </p>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <label className="min-w-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  Examentitel
                  <input value={exam.title} maxLength={200} onChange={(event) => updateExam({ title: event.target.value })} className={examInput} placeholder="Bijv. Theorie-examen auto" />
                </label>
                <label className="min-w-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  Korte omschrijving
                  <input value={exam.description} maxLength={5000} onChange={(event) => updateExam({ description: event.target.value })} className={examInput} placeholder="Waar gaat dit examen over?" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex h-[68px] items-center justify-between rounded-xl border border-white/[0.07] bg-[#202024] px-4">
                    <span><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Examentijd</span><span className="mt-1 block text-xs text-white/55">Eén timer voor het hele examen</span></span>
                    <strong className="text-sm text-white">{EXAM_TIME_LIMIT_MINUTES} min</strong>
                  </div>
                  <div className="flex h-[68px] items-center justify-between rounded-xl border border-white/[0.07] bg-[#202024] px-4">
                    <span><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Slaaggrens</span><span className="mt-1 block text-xs text-white/55">88% goed</span></span>
                    <strong className="text-sm text-[#CCFF00]">{passingScoreForQuestionCount(exam.questions.length)} / {exam.questions.length}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/[0.06] pt-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Toegangspakketten</p>
                  <ExamChoiceChips values={packages} selected={exam.allowed_packages} disabled={busy} onChange={(value) => updateExam({
                    allowed_packages: exam.allowed_packages.includes(value)
                      ? exam.allowed_packages.filter((item) => item !== value)
                      : [...exam.allowed_packages, value],
                  })} />
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-white/35">
                  <span className="font-mono text-white/60">{exam.questions.length}</span> / {EXAM_MAX_QUESTIONS} vragen
                  <span aria-hidden="true">·</span>
                  {EXAM_TIME_LIMIT_MINUTES} minuten
                </div>
              </div>
            </section>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,350px)_minmax(0,1fr)]">
              <div className="space-y-5 xl:sticky xl:top-24">
                <QuestionList questions={exam.questions} selectedId={selectedQuestionId}
                  onSelect={(id) => { setSelectedQuestionId(id); setPreview(false); }}
                  onReorder={(questions) => updateExam({ questions })} onMove={moveQuestion} />
                <section aria-labelledby="add-question-title" className="rounded-3xl border border-white/[0.08] bg-[#18181b] p-4">
                  <h2 id="add-question-title" className="text-xs font-bold uppercase tracking-[0.13em] text-white/50">Vraag toevoegen</h2>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["multiple_choice", "number", "ordering"] as const).map((type) => (
                      <button key={type} type="button" onClick={() => addQuestion(type)} disabled={exam.questions.length >= EXAM_MAX_QUESTIONS || busy}
                        className="group rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 py-3 text-center transition hover:border-[#CCFF00]/30 hover:bg-[#CCFF00]/[0.04] focus-visible:outline-2 focus-visible:outline-[#CCFF00] disabled:opacity-35">
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-[#CCFF00] transition group-hover:bg-[#CCFF00]/10">{type === "multiple_choice" ? "A" : type === "number" ? "123" : "↕"}</span>
                        <span className="mt-2 block text-[10px] font-semibold text-white/60 group-hover:text-white">{typeLabel(type)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {question ? (
                  <motion.div key={`${question.id}-${preview ? "preview" : "editor"}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                    className="min-w-0">
                    {preview ? (
                      <QuestionPreview question={question} index={questionIndex} total={exam.questions.length} onBack={() => setPreview(false)} />
                    ) : (
                      <QuestionEditor question={question} index={questionIndex} total={exam.questions.length} busy={busy}
                        onChange={updateQuestion} onUpload={upload} onDelete={() => void deleteQuestion()} onPreview={() => setPreview(true)} />
                    )}
                  </motion.div>
                ) : (
                  <motion.section key="empty-editor" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#18181b]/65 px-6 py-12 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CCFF00]/15 bg-[#CCFF00]/[0.04] text-2xl text-[#CCFF00]">✳</span>
                    <h2 className="mt-5 text-lg font-bold text-white">{exam.questions.length ? "Selecteer een vraag" : "Begin met je eerste vraag"}</h2>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/45">{exam.questions.length ? "Kies een vraag in het overzicht om de inhoud aan te passen of de leerlingweergave te bekijken." : "Kies links een vraagtype. Je kunt later de media, antwoordopties en eventuele dropzones instellen."}</p>
                    {!exam.questions.length && <div className="mt-5 flex flex-wrap justify-center gap-2">{(["multiple_choice", "number", "ordering"] as const).map((type) => <button key={type} type="button" onClick={() => addQuestion(type)} disabled={busy} className={quietButton}>+ {typeLabel(type)}</button>)}</div>}
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
              <p className="text-[11px] text-white/35">Wijzigingen worden pas zichtbaar voor leerlingen na opslaan.</p>
              <button type="button" className={primaryButton} onClick={() => void save()} disabled={busy}>
                {busy ? "Opslaan…" : "Examen opslaan"}
              </button>
            </div>
            </fieldset>
          </>
        ) : (
          <section className="flex min-h-[440px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#18181b]/65 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CCFF00]/15 bg-[#CCFF00]/[0.04] text-2xl text-[#CCFF00]">✳</span>
            <h2 className="mt-5 text-lg font-bold text-white">Je examenruimte staat klaar</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/45">{list.length ? "Kies een examen uit de lijst of start een nieuwe builder." : "Maak een nieuw examen aan en voeg daarna examenvragen, media en eventueel visuele dropzones toe."}</p>
            <button type="button" onClick={() => void createNewExam()} disabled={busy} className={`${primaryButton} mt-5`}>+ Nieuw examen</button>
          </section>
        )}
      </motion.div>
    </main>
  );
}
