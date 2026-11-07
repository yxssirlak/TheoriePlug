"use client";

import { useState } from "react";
import { formatDuration } from "../../lib/course/mastery";
import type { TopicNode } from "../../lib/course/types";

type Props = {
  tree: TopicNode[];
  completed: Set<string>;
  selectedLessonId: string | null;
  onSelect: (lessonId: string) => void;
};

function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-label={done ? "Afgerond" : "Nog niet afgerond"}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold ${
        done ? "border-jade bg-jade text-ink" : "border-paper/25 text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

export default function CourseSidebar({ tree, completed, selectedLessonId, onSelect }: Props) {
  // Openklappen volgt de gekozen les, maar de leerling kan zelf ook open/dicht klikken
  const selectedTopicId = tree.find((t) => t.subtopics.some((s) => s.lessons.some((l) => l.id === selectedLessonId)))?.id;
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === selectedTopicId;
  const toggle = (id: string) => setToggled((state) => ({ ...state, [id]: !isOpen(id) }));

  return (
    <nav aria-label="Cursusoverzicht" className="space-y-3">
      {tree.map((topic) => {
        const lessons = topic.subtopics.flatMap((s) => s.lessons);
        const done = lessons.filter((l) => completed.has(l.id)).length;
        const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
        const open = isOpen(topic.id);

        return (
          <div key={topic.id} className="overflow-hidden rounded-2xl border border-jade/20 bg-surface">
            <button
              type="button"
              onClick={() => toggle(topic.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-jade/5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-extrabold">{topic.title}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper/10">
                    <span className="block h-full rounded-full bg-lime transition-all" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="text-xs font-semibold text-paper/60">
                    {done}/{lessons.length}
                  </span>
                </span>
              </span>
              <span aria-hidden="true" className={`text-paper/50 transition-transform ${open ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {open && (
              <div className="border-t border-paper/10 pb-2">
                {topic.subtopics.map((subtopic) => (
                  <div key={subtopic.id} className="px-2 pt-3">
                    <p className="px-2 text-xs font-bold uppercase tracking-wider text-paper/45">{subtopic.title}</p>
                    <ul className="mt-1.5 space-y-0.5">
                      {subtopic.lessons.map((lesson) => {
                        const active = lesson.id === selectedLessonId;
                        return (
                          <li key={lesson.id}>
                            <button
                              type="button"
                              onClick={() => onSelect(lesson.id)}
                              aria-current={active ? "true" : undefined}
                              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                                active ? "bg-lime text-ink" : "text-paper/80 hover:bg-paper/5"
                              }`}
                            >
                              <Check done={completed.has(lesson.id)} />
                              <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                              {lesson.duration > 0 && (
                                <span className={`text-xs ${active ? "text-ink/60" : "text-paper/40"}`}>
                                  {formatDuration(lesson.duration)}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {subtopic.lessons.length === 0 && <li className="px-2.5 py-1 text-xs text-paper/40">Binnenkort</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
