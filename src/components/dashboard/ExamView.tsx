"use client";

import { useState } from "react";
import { usePublished } from "../../lib/course/usePublished";
import { ContentState, PageHeader } from "../dashboard/ContentState";

type Question = {
  id: string;
  question: string;
  image_url: string | null;
  options: string[];
  correct_option: number;
  explanation: string | null;
};

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Exam({ pool }: { pool: Question[] }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const start = () => {
    setQuestions(shuffled(pool).slice(0, 25));
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  if (!questions) {
    return (
      <div className="max-w-xl rounded-3xl border border-lime/30 bg-surface p-8">
        <h2 className="font-display text-2xl font-extrabold">Klaar voor een oefenexamen?</h2>
        <p className="mt-2 text-paper/70">
          Je krijgt {Math.min(25, pool.length)} vragen uit een bank van {pool.length}. Je ziet na elk antwoord direct de uitleg.
        </p>
        <button onClick={start} className="mt-6 rounded-full bg-lime px-6 py-3 font-bold text-ink hover:scale-105">
          Start oefenexamen
        </button>
      </div>
    );
  }

  const finished = index >= questions.length;
  if (finished) {
    return (
      <div className="max-w-xl rounded-3xl border border-lime/30 bg-surface p-8 text-center">
        <p className="font-display text-5xl font-extrabold text-lime">
          {score}/{questions.length}
        </p>
        <p className="mt-2 text-paper/70">{score / questions.length >= 0.88 ? "Geslaagd! Dat is een prima score." : "Nog even oefenen, je kunt het!"}</p>
        <button onClick={start} className="mt-6 rounded-full bg-lime px-6 py-3 font-bold text-ink hover:scale-105">
          Opnieuw proberen
        </button>
      </div>
    );
  }

  const q = questions[index];
  const answered = picked !== null;

  return (
    <div className="max-w-2xl rounded-3xl border border-jade/30 bg-surface p-6 sm:p-8">
      <p className="text-sm font-semibold text-jade">
        Vraag {index + 1} van {questions.length}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper/10">
        <div className="h-full bg-lime transition-all" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <h2 className="mt-5 font-display text-xl font-extrabold">{q.question}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q.image_url && <img src={q.image_url} alt="" className="mt-4 max-h-64 w-full rounded-2xl object-cover" />}

      <div className="mt-5 space-y-2">
        {q.options.map((option, i) => {
          const isCorrect = i === q.correct_option;
          const style = !answered
            ? "border-paper/15 hover:border-lime"
            : isCorrect
              ? "border-jade bg-jade/15"
              : i === picked
                ? "border-red-500 bg-red-500/15"
                : "border-paper/10 opacity-60";
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                if (isCorrect) setScore((s) => s + 1);
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left font-semibold transition-colors ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <>
          {q.explanation && <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-paper/80">{q.explanation}</p>}
          <button
            onClick={() => {
              setPicked(null);
              setIndex((i) => i + 1);
            }}
            className="mt-5 rounded-full bg-lime px-6 py-2.5 font-bold text-ink hover:scale-105"
          >
            {index + 1 === questions.length ? "Resultaat bekijken" : "Volgende vraag →"}
          </button>
        </>
      )}
    </div>
  );
}

export default function ExamView() {
  const state = usePublished<Question>("exam_questions");
  return (
    <>
      <PageHeader title="Oefenexamens" text="Oefen met vragen zoals bij het CBR." />
      <ContentState state={state} skeleton="exam" empty="Er zijn nog geen examenvragen beschikbaar. Kom snel terug!">
        {(items) => <Exam pool={items} />}
      </ContentState>
    </>
  );
}
