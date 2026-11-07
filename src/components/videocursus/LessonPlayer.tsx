"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { formatDuration } from "../../lib/course/mastery";
import { resolveVideo } from "../../lib/course/video";
import { isAdaptive, type Lesson, type LessonQuestion, type PackageTier } from "../../lib/course/types";
import LessonQuiz from "./LessonQuiz";
import RichText from "./RichText";
import BrandedVideoPlayer from "./BrandedVideoPlayer";

type Props = {
  lesson: Lesson;
  breadcrumb: string;
  tier: PackageTier;
  questions: LessonQuestion[];
  completed: boolean;
  hasNext: boolean;
  onComplete: () => void;
  onNext: () => void;
  onQuizFinish: (correct: number, total: number) => void;
};

// Wordt per les opnieuw opgebouwd (key={lesson.id}), zodat quizstatus nooit tussen lessen lekt
export default function LessonPlayer({
  lesson,
  breadcrumb,
  tier,
  questions,
  completed,
  hasNext,
  onComplete,
  onNext,
  onQuizFinish,
}: Props) {
  const [quizOpen, setQuizOpen] = useState(false);
  const adaptive = isAdaptive(tier);
  const quizAvailable = adaptive && questions.length > 0;
  const video = lesson.videoUrl ? resolveVideo(lesson.videoUrl) : null;

  const handleEnded = () => {
    onComplete();
    if (quizAvailable) setQuizOpen(true);
    else if (!adaptive && hasNext) onNext();
  };

  return (
    <div className="space-y-6">
      {video?.kind === "file" ? (
        <BrandedVideoPlayer key={video.src} src={video.src} title={lesson.title} onEnded={handleEnded} />
      ) : (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black">
        {video?.kind === "embed" && (
          <iframe
            src={video.src}
            title={lesson.title}
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full"
          />
        )}
        {!video && (
          <div className="flex aspect-video items-center justify-center text-paper/50">Deze video is nog niet beschikbaar.</div>
        )}
      </div>
      )}

      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-jade">{breadcrumb}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{lesson.title}</h1>
          {lesson.duration > 0 && <span className="rounded-full bg-paper/10 px-3 py-1 text-xs font-bold">{formatDuration(lesson.duration)}</span>}
          {completed && <span className="rounded-full bg-jade px-3 py-1 text-xs font-extrabold text-ink">✓ Afgerond</span>}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {quizAvailable && (
            <button
              onClick={() => setQuizOpen(true)}
              className="rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:scale-105"
            >
              Test je kennis over deze video
            </button>
          )}
          {!adaptive && (
            <span className="rounded-full border border-lime/40 px-4 py-2 text-xs font-semibold text-lime/90">
              Kennis-check na elke video met Boost of Max
            </span>
          )}
          {!completed && (
            <button onClick={onComplete} className="rounded-full border border-paper/20 px-5 py-2.5 text-sm font-bold transition-colors hover:border-jade hover:text-jade">
              Markeer als afgerond
            </button>
          )}
          {hasNext && (
            <button onClick={onNext} className="rounded-full border border-paper/20 px-5 py-2.5 text-sm font-bold transition-colors hover:border-lime hover:text-lime">
              Volgende video →
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {quizOpen && quizAvailable && (
          <LessonQuiz questions={questions} onFinish={onQuizFinish} onClose={() => setQuizOpen(false)} />
        )}
      </AnimatePresence>

      {lesson.description && (
        <section className="rounded-3xl border border-paper/10 bg-surface p-6">
          <h2 className="mb-3 font-display text-lg font-extrabold">Over deze video</h2>
          <RichText text={lesson.description} className="text-paper/80" />
        </section>
      )}

      {lesson.cheatSheetNotes && (
        <section className="rounded-3xl border border-lime/25 bg-lime/5 p-6">
          <h2 className="mb-3 font-display text-lg font-extrabold text-lime">Let op voor het CBR-examen</h2>
          <RichText text={lesson.cheatSheetNotes} className="text-paper/85" />
        </section>
      )}
    </div>
  );
}
