"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { loadCourseTree, loadPackageTier } from "../../lib/course/data";
import { toMastery, toQuestion } from "../../lib/course/mappers";
import { nextMasteryScore } from "../../lib/course/mastery";
import { isAdaptive, type LessonQuestion, type PackageTier, type TopicNode, type UserMastery } from "../../lib/course/types";
import { useUser } from "../dashboard/user-context";
import AdaptiveBanner from "./AdaptiveBanner";
import CourseSidebar from "./CourseSidebar";
import LessonPlayer from "./LessonPlayer";
import Notification from "../ui/Notification";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tree: TopicNode[]; tier: PackageTier | null };

export default function VideoCourse() {
  const user = useUser();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<State>({ status: "loading" });
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [mastery, setMastery] = useState<UserMastery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<LessonQuestion[]>([]);
  const [lessonLinkError, setLessonLinkError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tree, tier, progress, masteryRows] = await Promise.all([
          loadCourseTree(supabase),
          loadPackageTier(supabase, user.id),
          supabase.from("user_progress").select("lesson_id").eq("user_id", user.id),
          supabase.from("user_mastery").select("*").eq("user_id", user.id),
        ]);
        if (cancelled) return;

        const done = new Set<string>((progress.data ?? []).map((row) => row.lesson_id));
        const firstOpen = tree.flatMap((t) => t.subtopics.flatMap((s) => s.lessons)).find((l) => !done.has(l.id));
        const firstAny = tree.flatMap((t) => t.subtopics.flatMap((s) => s.lessons))[0];
        const requestedLesson = new URLSearchParams(window.location.search).get("les");
        const linkedLesson = tree.flatMap((t) => t.subtopics.flatMap((s) => s.lessons)).find((l) => l.id === requestedLesson);

        setCompleted(done);
        setMastery((masteryRows.data ?? []).map(toMastery));
        setSelectedId((linkedLesson ?? firstOpen ?? firstAny)?.id ?? null);
        setLessonLinkError(Boolean(requestedLesson && !linkedLesson));
        setState({ status: "ready", tree, tier });
      } catch (error) {
        if (!cancelled) setState({ status: "error", message: error instanceof Error ? error.message : "Onbekende fout" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, user.id]);

  const tree = state.status === "ready" ? state.tree : null;
  const tier = state.status === "ready" ? state.tier : null;
  const adaptive = tier !== null && isAdaptive(tier);

  const flat = useMemo(
    () =>
      (tree ?? []).flatMap((topic) =>
        topic.subtopics.flatMap((subtopic) => subtopic.lessons.map((lesson) => ({ lesson, subtopic, topic }))),
      ),
    [tree],
  );
  const currentIndex = flat.findIndex((item) => item.lesson.id === selectedId);
  const current = currentIndex >= 0 ? flat[currentIndex] : null;

  // Testvragen worden alleen voor Boost/Max opgehaald (de database dwingt dit ook af)
  useEffect(() => {
    if (!adaptive || !selectedId) return;
    let cancelled = false;
    supabase
      .from("lesson_questions")
      .select("*")
      .eq("lesson_id", selectedId)
      .order("sort_order")
      .then(({ data }) => {
        if (!cancelled) setQuestions((data ?? []).map(toQuestion));
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, adaptive, selectedId]);

  const markComplete = useCallback(
    async (lessonId: string) => {
      if (completed.has(lessonId)) return;
      setCompleted((previous) => new Set(previous).add(lessonId));
      await supabase.from("user_progress").upsert({ user_id: user.id, lesson_id: lessonId });
    },
    [completed, supabase, user.id],
  );

  const recordQuiz = async (correct: number, total: number) => {
    if (!current) return;
    const existing = mastery.find((m) => m.subtopicId === current.subtopic.id);
    const score = nextMasteryScore(existing?.masteryScore ?? null, correct, total);
    const row = {
      user_id: user.id,
      topic_id: current.topic.id,
      subtopic_id: current.subtopic.id,
      attempts: (existing?.attempts ?? 0) + total,
      correct: (existing?.correct ?? 0) + correct,
      mastery_score: score,
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase.from("user_mastery").upsert(row, { onConflict: "user_id,subtopic_id" }).select().single();
    if (data) setMastery((previous) => [...previous.filter((m) => m.subtopicId !== row.subtopic_id), toMastery(data)]);
  };

  if (state.status === "loading") {
    return <p className="text-paper/60">Videocursus laden...</p>;
  }
  if (state.status === "error") {
    return (
      <Notification>
        De videocursus kon niet worden geladen: {state.message}
      </Notification>
    );
  }
  if (!tier) {
    return (
      <div className="rounded-3xl border border-lime/30 bg-surface p-8 text-center">
        <h1 className="font-display text-2xl font-extrabold">Geen actief pakket</h1>
        <p className="mt-2 text-paper/70">Met een pakket krijg je toegang tot de volledige videocursus.</p>
        <Link href="/#pakketten" className="mt-5 inline-block rounded-full bg-lime px-6 py-2.5 font-bold text-ink">
          Bekijk pakketten
        </Link>
      </div>
    );
  }
  if (state.tree.length === 0) {
    return <p className="text-paper/60">{lessonLinkError ? "De gekoppelde videoles is niet beschikbaar. De videocursus wordt nog gevuld." : "De videocursus wordt nog gevuld. Kom snel terug!"}</p>;
  }

  const select = (lessonId: string) => {
    setQuestions([]);
    setSelectedId(lessonId);
    setLessonLinkError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {lessonLinkError && <Notification type="warning" onDismiss={() => setLessonLinkError(false)}>De gekoppelde videoles is niet beschikbaar. Kies een andere les in het cursusoverzicht.</Notification>}
      <AdaptiveBanner tier={tier} tree={state.tree} mastery={mastery} completed={completed} onSelect={select} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {current ? (
            <LessonPlayer
              key={current.lesson.id}
              lesson={current.lesson}
              breadcrumb={`${current.topic.title} · ${current.subtopic.title}`}
              tier={tier}
              questions={questions}
              completed={completed.has(current.lesson.id)}
              hasNext={currentIndex < flat.length - 1}
              onComplete={() => markComplete(current.lesson.id)}
              onNext={() => select(flat[currentIndex + 1].lesson.id)}
              onQuizFinish={recordQuiz}
            />
          ) : (
            <p className="text-paper/60">Kies een video in het cursusoverzicht.</p>
          )}
        </div>

        <aside className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:self-start xl:overflow-y-auto">
          <CourseSidebar tree={state.tree} completed={completed} selectedLessonId={selectedId} onSelect={select} />
        </aside>
      </div>
    </div>
  );
}
