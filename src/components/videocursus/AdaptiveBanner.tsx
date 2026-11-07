"use client";

import Link from "next/link";
import { WEAK_THRESHOLD } from "../../lib/course/mastery";
import { isAdaptive, type PackageTier, type TopicNode, type UserMastery } from "../../lib/course/types";

type Props = {
  tier: PackageTier;
  tree: TopicNode[];
  mastery: UserMastery[];
  completed: Set<string>;
  onSelect: (lessonId: string) => void;
};

export default function AdaptiveBanner({ tier, tree, mastery, completed, onSelect }: Props) {
  if (!isAdaptive(tier)) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-lime/30 bg-gradient-to-br from-lime/15 via-[#18181b] to-[#18181b] p-6">
        <span className="rounded-full bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink">Boost &amp; Max</span>
        <h2 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">Upgrade naar Adaptief</h2>
        <p className="mt-2 max-w-xl text-paper/70">
          Krijg na elke video een korte kennis-check en zie precies welke onderwerpen je nog moet oefenen. Wij zetten de juiste video&apos;s voor je klaar.
        </p>
        <Link
          href="/#pakketten"
          className="mt-4 inline-block rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-ink transition-transform hover:scale-105"
        >
          Bekijk pakketten
        </Link>
      </section>
    );
  }

  const subtopics = tree.flatMap((topic) => topic.subtopics.map((subtopic) => ({ topic, subtopic })));
  const focus = mastery
    .filter((m) => m.masteryScore < WEAK_THRESHOLD)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 3)
    .map((m) => {
      const match = subtopics.find((item) => item.subtopic.id === m.subtopicId);
      if (!match || match.subtopic.lessons.length === 0) return null;
      const lesson = match.subtopic.lessons.find((l) => !completed.has(l.id)) ?? match.subtopic.lessons[0];
      return { m, topic: match.topic, subtopic: match.subtopic, lesson };
    })
    .filter((item) => item !== null);

  return (
    <section className="rounded-3xl border border-jade/30 bg-gradient-to-br from-jade/15 via-[#18181b] to-[#18181b] p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-jade px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink">Adaptief</span>
        <h2 className="font-display text-xl font-extrabold sm:text-2xl">Jouw persoonlijke focuspunten</h2>
      </div>

      {focus.length === 0 ? (
        <p className="mt-3 text-paper/70">
          {mastery.length === 0
            ? "Maak de kennis-check na een video, dan laten we hier zien waar je extra aandacht aan moet geven."
            : "Top, je scoort overal goed. Blijf oefenen om dat zo te houden."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {focus.map(({ m, topic, subtopic, lesson }) => (
            <li key={m.subtopicId}>
              <button
                type="button"
                onClick={() => onSelect(lesson.id)}
                className="group h-full w-full rounded-2xl border border-paper/10 bg-ink/60 p-4 text-left transition-all hover:border-lime/60 hover:bg-ink"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-paper/50">{topic.title}</span>
                <span className="mt-1 block font-display font-extrabold leading-snug">{subtopic.title}</span>
                <span className="mt-3 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper/10">
                    <span className="block h-full rounded-full bg-red-400" style={{ width: `${m.masteryScore}%` }} />
                  </span>
                  <span className="text-xs font-bold text-red-300">{m.masteryScore}%</span>
                </span>
                <span className="mt-3 block text-sm font-semibold text-lime group-hover:underline">Bekijk: {lesson.title} →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
