"use client";

import { useEffect, useState } from "react";
import { loadExamReview } from "../../app/exam-actions";
import { reviewOrderingAnswer, type ReviewQuestion } from "../../lib/exam-review";
import ExamImage from "../ui/ExamImage";

type Result = { question_id: string; question_text: string; correct: boolean; explanation: string };
type ReviewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; questions: ReviewQuestion[] };

function OrderingReviewImage({ question, answer, correct }: {
  question: ReviewQuestion;
  answer: unknown;
  correct: boolean;
}) {
  if (!question.image_url) return <p className="text-sm text-red-300">De afbeelding bij deze vraag ontbreekt.</p>;
  return (
    <div className="relative">
      <ExamImage path={question.image_url} alt={correct ? "Juiste volgorde op de afbeelding" : "Jouw volgorde op de afbeelding"} className="block h-auto w-full rounded-xl" />
      {question.options.map((option, index) => {
        const number = correct ? option.correct_order : reviewOrderingAnswer(answer, option.id);
        return (
          <div key={option.id} style={{ left: `${option.coordinates_x ?? 50}%`, top: `${option.coordinates_y ?? 50}%` }}
            aria-label={`Positie ${index + 1}: ${number === null ? "niet ingevuld" : `nummer ${number}`}`}
            className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow-lg ${number === null ? "border-white/60 bg-ink/90 text-white" : "border-lime bg-lime text-ink"}`}>
            {number ?? "–"}
          </div>
        );
      })}
    </div>
  );
}

function ReviewDetail({ question, result, answer, index }: {
  question: ReviewQuestion;
  result: Result;
  answer: unknown;
  index: number;
}) {
  return (
    <section aria-labelledby="review-question-title" className="min-w-0 space-y-5 rounded-3xl border border-white/10 bg-surface p-5 sm:p-6">
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${result.correct ? "text-lime" : "text-red-400"}`}>Vraag {index + 1} · {result.correct ? "Goed" : "Fout"}</p>
        <h2 id="review-question-title" className="mt-2 text-xl font-bold">{question.question_text}</h2>
      </div>
      {question.image_url && !["ordering", "single_drag", "hotspot"].includes(question.question_type) && <ExamImage path={question.image_url} alt="Media bij de vraag" className="block h-auto w-full rounded-xl" />}
      {(question.question_type === "single_drag" || question.question_type === "hotspot") && question.image_url && <div className="space-y-3">
        <div className="relative">
          <ExamImage path={question.image_url} alt="Afbeelding met jouw en de juiste antwoordpositie" className="block h-auto w-full rounded-xl" />
          {question.options.map((option, i) => <div key={option.id} style={{ left: `${option.coordinates_x ?? 50}%`, top: `${option.coordinates_y ?? 50}%` }}
            className={`absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-bold shadow-lg ${option.is_correct ? "border-lime bg-lime text-ink" : answer === option.id ? "border-red-300 bg-red-500 text-white" : "border-white/60 bg-ink text-white"}`}>{i + 1}</div>)}
        </div>
        <ul className="space-y-2">{question.options.map((option, i) => <li key={option.id} className="rounded-xl border border-white/10 p-3 text-sm">{i + 1}. {option.option_text || `Positie ${i + 1}`}{answer === option.id && <span className={option.is_correct ? " ml-2 text-lime" : " ml-2 text-red-300"}>Jouw antwoord</span>}{option.is_correct && <span className="ml-2 text-lime">Juiste antwoord</span>}</li>)}</ul>
        {typeof answer !== "string" && <p className="text-sm text-paper/60">Je hebt geen antwoord gegeven.</p>}
      </div>}
      {["multiple_choice", "yes_no", "multiple_response"].includes(question.question_type) && (
        <div className="space-y-2" aria-label="Antwoorden">
          {question.options.map((option, optionIndex) => {
            const chosen = Array.isArray(answer) ? answer.includes(option.id) : answer === option.id;
            const color = option.is_correct ? "border-lime/60 bg-lime/10" : chosen ? "border-red-400/60 bg-red-400/10" : "border-white/10";
            return <div key={option.id} className={`rounded-xl border p-4 ${color}`}>
              <p className="font-semibold">{String.fromCharCode(65 + optionIndex)}. {option.option_text || "Afbeelding als antwoord"}</p>
              {option.image_url && <ExamImage path={option.image_url} alt={`Afbeelding bij antwoord ${String.fromCharCode(65 + optionIndex)}`} className="mt-3 max-h-40 rounded-lg" />}
              {(chosen || option.is_correct) && <p className="mt-2 text-xs font-bold">{chosen && <span className={option.is_correct ? "text-lime" : "text-red-300"}>Jouw antwoord{option.is_correct ? " · Goed" : " · Fout"}</span>}{chosen && option.is_correct ? null : option.is_correct && <span className="text-lime">Juiste antwoord</span>}</p>}
            </div>;
          })}
          {typeof answer !== "string" && (!Array.isArray(answer) || answer.length === 0) && <p className="text-sm text-paper/60">Je hebt geen antwoord gegeven.</p>}
        </div>
      )}
      {question.question_type === "number" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 ${result.correct ? "border-lime/40 bg-lime/10" : "border-red-400/40 bg-red-400/10"}`}>
            <p className="text-xs font-bold uppercase text-paper/60">Jouw antwoord</p>
            <p className="mt-2 font-bold">{typeof answer === "string" && answer.trim() ? answer : "Geen antwoord"}</p>
          </div>
          <div className="rounded-xl border border-lime/40 bg-lime/10 p-4">
            <p className="text-xs font-bold uppercase text-paper/60">Juiste antwoord</p>
            <p className="mt-2 font-bold text-lime">{question.correct_number ?? "Niet beschikbaar"}</p>
          </div>
        </div>
      )}
      {question.question_type === "ordering" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><h3 className="text-sm font-bold">Jouw volgorde</h3><OrderingReviewImage question={question} answer={answer} correct={false} /></div>
            <div className="space-y-2"><h3 className="text-sm font-bold text-lime">Juiste volgorde</h3><OrderingReviewImage question={question} answer={answer} correct /></div>
          </div>
          <ul className="space-y-2">{question.options.map((option, optionIndex) => {
            const chosen = reviewOrderingAnswer(answer, option.id);
            return <li key={option.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm">
              <span>{option.option_text || `Positie ${optionIndex + 1}`}</span>
              <span>Jij: <strong className={chosen === option.correct_order ? "text-lime" : "text-red-300"}>{chosen ?? "–"}</strong> · Juist: <strong className="text-lime">{option.correct_order ?? "–"}</strong></span>
            </li>;
          })}</ul>
        </div>
      )}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-bold">Uitleg</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-paper/70">{question.explanation.trim() || "Er is geen uitleg toegevoegd voor deze vraag."}</p>
      </div>
    </section>
  );
}

export default function ExamResults({ attemptId, score, passingScore, questionCount, results, answers, onBack }: {
  attemptId: string;
  score: number | null;
  passingScore: number;
  questionCount: number;
  results: Result[] | null;
  answers: Record<string, unknown>;
  onBack: () => void;
}) {
  const [review, setReview] = useState<ReviewState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(results?.find((result) => !result.correct)?.question_id ?? results?.[0]?.question_id ?? null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    loadExamReview(attemptId).then((response) => {
      if (!active) return;
      setReview(response.ok ? { status: "ready", questions: response.questions } : { status: "error", message: response.error });
    }).catch((error: unknown) => {
      console.error("Examen nakijken mislukt:", error);
      if (active) setReview({ status: "error", message: "De vragen konden niet worden geladen. Probeer het opnieuw." });
    });
    return () => { active = false; };
  }, [attemptId, retry]);

  const selectedIndex = results?.findIndex((result) => result.question_id === selectedId) ?? -1;
  const selectedResult = selectedIndex >= 0 ? results?.[selectedIndex] : undefined;
  const selectedQuestion = review.status === "ready" ? review.questions.find((question) => question.id === selectedId) : undefined;
  const passed = score !== null && score >= passingScore;

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-white/10 bg-surface p-5 sm:p-6">
        <h1 className={`text-2xl font-bold ${passed ? "text-lime" : "text-paper"}`}>{passed ? "Goed gedaan, je bent geslaagd!" : "Helaas, nog niet geslaagd"}</h1>
        <p className="mt-2 text-paper/70">{score === null ? "Je score is niet beschikbaar." : `${score} van de ${questionCount} vragen goed · Je slaagt bij minimaal ${passingScore} goed.`}</p>
        {!passed && <p className="mt-2 text-sm text-paper/60">Bekijk je antwoorden en uitleg, en probeer het daarna opnieuw.</p>}
      </header>
      {!results?.length ? <p role="alert" className="rounded-2xl border border-red-400/30 bg-surface p-5 text-red-300">De resultaten van deze poging zijn niet beschikbaar.</p> : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
          <aside className="rounded-3xl border border-white/10 bg-surface p-5">
            <h2 className="text-lg font-bold">Vragen nakijken</h2>
            <p className="mt-1 text-sm text-paper/60">Kies een vraag om je antwoord en de uitleg te bekijken.</p>
            <ol className="mt-4 max-h-[34rem] space-y-2 overflow-y-auto">{results.map((result, index) => (
              <li key={result.question_id}>
                <button type="button" aria-pressed={selectedId === result.question_id} onClick={() => setSelectedId(result.question_id)}
                  className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-lime ${selectedId === result.question_id ? "border-lime/50 bg-lime/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"}`}>
                  <span className={`block text-xs font-bold ${result.correct ? "text-lime" : "text-red-400"}`}>{index + 1}. {result.correct ? "Goed" : "Fout"}</span>
                  <span className="mt-1 block line-clamp-2 text-sm font-semibold text-paper">{result.question_text}</span>
                </button>
              </li>
            ))}</ol>
            <button type="button" onClick={onBack} className="mt-5 rounded-xl bg-lime px-5 py-3 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">Terug naar examens</button>
          </aside>
          {review.status === "loading" ? <div role="status" className="rounded-3xl border border-white/10 bg-surface p-6 text-paper/70">Vragen laden...</div> : review.status === "error" ? (
            <div role="alert" className="rounded-3xl border border-red-400/30 bg-surface p-6 text-red-300">
              <p>{review.message}</p>
              <button type="button" onClick={() => { setReview({ status: "loading" }); setRetry((value) => value + 1); }} className="mt-4 rounded-xl border border-white/20 px-4 py-2 text-paper">Opnieuw proberen</button>
            </div>
          ) : selectedQuestion && selectedResult ? <ReviewDetail question={selectedQuestion} result={selectedResult} answer={answers[selectedQuestion.id]} index={selectedIndex} /> : (
            <p role="alert" className="rounded-3xl border border-red-400/30 bg-surface p-6 text-red-300">Deze vraag is niet gevonden in de opgeslagen examenpoging.</p>
          )}
        </div>
      )}
      {!results?.length && <button type="button" onClick={onBack} className="rounded-xl bg-lime px-5 py-3 font-bold text-ink">Terug naar examens</button>}
    </div>
  );
}
