"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { LessonQuestion } from "../../lib/course/types";

type Props = {
  questions: LessonQuestion[];
  onFinish: (correct: number, total: number) => void;
  onClose: () => void;
};

export default function LessonQuiz({ questions, onFinish, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const answered = selected !== null;

  const choose = (option: number) => {
    if (answered) return;
    setSelected(option);
    if (option === question.correctOption) setCorrect((value) => value + 1);
  };

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    onFinish(correct, questions.length);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
      aria-label="Kennis-check"
      className="rounded-3xl border border-lime/30 bg-surface p-6 shadow-[0_0_40px_rgba(204,255,0,0.08)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold">
          Kennis-<span className="text-lime">check</span>
        </h2>
        {!finished && (
          <span className="text-sm font-semibold text-paper/60">
            Vraag {index + 1} van {questions.length}
          </span>
        )}
      </div>

      {finished ? (
        <div className="mt-6 text-center">
          <p className="font-display text-5xl font-extrabold text-lime">
            {correct}/{questions.length}
          </p>
          <p className="mt-3 text-paper/70">
            {correct === questions.length
              ? "Perfect! Dit onderwerp zit goed."
              : "Je voortgang is bijgewerkt. Foute antwoorden komen terug in je focuspunten."}
          </p>
          <button onClick={onClose} className="mt-5 rounded-full bg-lime px-6 py-2.5 font-bold text-ink transition-transform hover:scale-105">
            Sluiten
          </button>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-lg font-semibold">{question.question}</p>
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={question.imageUrl} alt="" className="mt-4 max-h-64 rounded-xl object-contain" />
          )}

          <ul className="mt-4 space-y-2.5">
            {question.options.map((option, i) => {
              const isCorrect = i === question.correctOption;
              const isChosen = i === selected;
              const style = !answered
                ? "border-paper/15 hover:border-lime/60 hover:bg-white/5"
                : isCorrect
                  ? "border-jade bg-jade/15"
                  : isChosen
                    ? "border-red-400 bg-red-500/10"
                    : "border-paper/10 opacity-60";
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    disabled={answered}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium transition-colors ${style}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper/10 text-sm font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>

          {answered && (
            <div className="mt-4 rounded-xl bg-paper/5 p-4 text-sm">
              <p className={`font-bold ${selected === question.correctOption ? "text-jade" : "text-red-300"}`}>
                {selected === question.correctOption ? "Goed!" : "Helaas, dat is niet juist."}
              </p>
              {question.explanation && <p className="mt-1 text-paper/70">{question.explanation}</p>}
              <button onClick={next} className="mt-3 rounded-full bg-lime px-5 py-2 font-bold text-ink transition-transform hover:scale-105">
                {index + 1 < questions.length ? "Volgende vraag" : "Afronden"}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}
