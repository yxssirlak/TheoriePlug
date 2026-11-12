"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase";
import { loadCourseTree } from "../../../../lib/course/data";
import type { TopicNode } from "../../../../lib/course/types";
import LessonEditor, { Field, inputClass, primaryButton } from "../../../../components/admin/LessonEditor";
import { useDialogs } from "../../../../components/admin/Dialog";
import { SkeletonList } from "../../../../components/ui/PageSkeleton";
import Notification from "../../../../components/ui/Notification";

type Selection = { kind: "topic" | "subtopic" | "lesson"; id: string } | null;
type Table = "topics" | "subtopics" | "lessons";

const slugify = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "onderwerp";

export default function AdminCoursePage() {
  const [supabase] = useState(() => createClient());
  const [tree, setTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [message, setMessage] = useState<{ id: number; type: "ok" | "error"; text: string; action?: { label: string; onClick: () => void } } | null>(null);
  const [version, setVersion] = useState(0);
  const { prompt, confirm, element: dialogs } = useDialogs();

  const notify = useCallback(
    (type: "ok" | "error", text: string, action?: { label: string; onClick: () => void }) =>
      setMessage({ id: Date.now(), type, text, action }),
    [],
  );
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    loadCourseTree(supabase)
      .then((data) => {
        if (cancelled) return;
        setTree(data);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        setMessage({ id: Date.now(), type: "error", text: error instanceof Error ? error.message : "Laden mislukt" });
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, version]);

  const run = async (action: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await action;
    if (error) notify("error", error.message);
    else reload();
    return !error;
  };

  const addTopic = async () => {
    const title = await prompt({ title: "Nieuw hoofdonderwerp", label: "Naam van het hoofdonderwerp", confirmLabel: "Toevoegen" });
    if (!title) return;
    await run(
      supabase.from("topics").insert({ title, slug: `${slugify(title)}-${Date.now().toString(36)}`, sort_order: tree.length }),
    );
  };
  const addSubtopic = async (topic: TopicNode) => {
    const title = await prompt({ title: `Nieuw subonderwerp in ${topic.title}`, label: "Naam van het subonderwerp", confirmLabel: "Toevoegen" });
    if (!title) return;
    await run(supabase.from("subtopics").insert({ topic_id: topic.id, title, sort_order: topic.subtopics.length }));
  };
  const addLesson = async (subtopicId: string, count: number) => {
    const title = await prompt({ title: "Nieuwe video", label: "Titel van de video", confirmLabel: "Toevoegen" });
    if (!title) return;
    const { data, error } = await supabase.from("lessons").insert({ subtopic_id: subtopicId, title, sort_order: count }).select("id").single();
    if (error) return notify("error", error.message);
    reload();
    setSelection({ kind: "lesson", id: data.id });
  };

  const rename = async (table: Table, id: string, current: string) => {
    const title = await prompt({ title: "Naam wijzigen", label: "Nieuwe naam", value: current });
    if (title) await run(supabase.from(table).update({ title }).eq("id", id));
  };
  const remove = async (table: Table, id: string, title: string) => {
    if (!(await confirm({ title: "Verwijderen", message: `"${title}" en alles eronder wordt verwijderd.` }))) return;
    if (await run(supabase.from(table).delete().eq("id", id))) setSelection(null);
  };

  // Volgorde wisselen: beide items krijgen de sort_order van de ander
  const move = async (table: Table, list: { id: string; order: number }[], index: number, direction: -1 | 1) => {
    const a = list[index];
    const b = list[index + direction];
    if (!b) return;
    const first = await supabase.from(table).update({ sort_order: b.order === a.order ? a.order + direction : b.order }).eq("id", a.id);
    const second = await supabase.from(table).update({ sort_order: a.order }).eq("id", b.id);
    const error = first.error ?? second.error;
    if (error) notify("error", error.message);
    else reload();
  };

  const selectedLesson =
    selection?.kind === "lesson"
      ? tree.flatMap((t) => t.subtopics.flatMap((s) => s.lessons)).find((l) => l.id === selection.id)
      : undefined;
  const selectedTopic = selection?.kind === "topic" ? tree.find((t) => t.id === selection.id) : undefined;

  const Arrows = ({ table, list, index }: { table: Table; list: { id: string; order: number }[]; index: number }) => (
    <span className="flex">
      <button aria-label="Omhoog" disabled={index === 0} onClick={() => move(table, list, index, -1)} className="px-1 text-paper/60 hover:text-lime disabled:opacity-20">
        ▲
      </button>
      <button aria-label="Omlaag" disabled={index === list.length - 1} onClick={() => move(table, list, index, 1)} className="px-1 text-paper/60 hover:text-lime disabled:opacity-20">
        ▼
      </button>
    </span>
  );

  const small = "text-xs font-semibold text-paper/60 hover:text-lime";

  return (
    <main className="p-6 text-paper">
      {dialogs}

      {message && (
        <Notification key={message.id} type={message.type === "ok" ? "success" : "error"} onDismiss={() => setMessage(null)}>
            {message.text}
            {message.action && (
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  message.action?.onClick();
                }}
                className="ml-2 rounded-full bg-lime px-4 py-1.5 text-xs font-bold text-ink transition-transform hover:scale-105"
              >
                {message.action.label}
              </button>
            )}
        </Notification>
      )}

      <div className="grid gap-6 p-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-3 self-start">
          <button onClick={addTopic} className={primaryButton}>
            + Hoofdonderwerp
          </button>
          {loading && <div role="status" aria-label="Cursus laden"><span className="sr-only">Cursus laden...</span><SkeletonList /></div>}
          {tree.map((topic, ti) => (
            <div key={topic.id} className="rounded-2xl border border-white/10 bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelection({ kind: "topic", id: topic.id })}
                  className={`truncate text-left font-bold ${selection?.id === topic.id ? "text-lime" : ""}`}
                >
                  {topic.title}
                </button>
                <Arrows table="topics" list={tree} index={ti} />
              </div>
              <div className="mt-1 flex gap-3">
                <button className={small} onClick={() => rename("topics", topic.id, topic.title)}>Naam</button>
                <button className={small} onClick={() => addSubtopic(topic)}>+ Subonderwerp</button>
                <button className="text-xs font-semibold text-red-300" onClick={() => remove("topics", topic.id, topic.title)}>Verwijder</button>
              </div>

              <div className="mt-3 space-y-2 border-l border-paper/10 pl-3">
                {topic.subtopics.map((sub, si) => (
                  <div key={sub.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-paper/85">{sub.title}</span>
                      <Arrows table="subtopics" list={topic.subtopics} index={si} />
                    </div>
                    <div className="flex gap-3">
                      <button className={small} onClick={() => rename("subtopics", sub.id, sub.title)}>Naam</button>
                      <button className={small} onClick={() => addLesson(sub.id, sub.lessons.length)}>+ Video</button>
                      <button className="text-xs font-semibold text-red-300" onClick={() => remove("subtopics", sub.id, sub.title)}>Verwijder</button>
                    </div>
                    <ul className="mt-1 space-y-0.5 pl-2">
                      {sub.lessons.map((lesson, li) => (
                        <li key={lesson.id} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelection({ kind: "lesson", id: lesson.id })}
                            className={`truncate text-left text-sm ${selection?.id === lesson.id ? "font-bold text-lime" : "text-paper/70 hover:text-paper"}`}
                          >
                            {lesson.isPublished ? "● " : "○ "}
                            {lesson.title}
                          </button>
                          <Arrows table="lessons" list={sub.lessons} index={li} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!loading && tree.length === 0 && <p className="text-sm text-paper/50">Nog geen onderwerpen. Begin met een hoofdonderwerp.</p>}
        </aside>

        <section className="min-w-0">
          {selectedLesson && (
            <LessonEditor
              key={selectedLesson.id}
              lesson={selectedLesson}
              supabase={supabase}
              notify={notify}
              onChanged={reload}
              onDeleted={() => {
                setSelection(null);
                reload();
              }}
            />
          )}
          {selectedTopic && <TopicEditor key={selectedTopic.id} topic={selectedTopic} onSave={(changes) => run(supabase.from("topics").update(changes).eq("id", selectedTopic.id))} />}
          {!selection && <p className="text-paper/50">Kies links een onderwerp of video om te bewerken. ● = gepubliceerd, ○ = concept.</p>}
        </section>
      </div>
    </main>
  );
}

function TopicEditor({
  topic,
  onSave,
}: {
  topic: TopicNode;
  onSave: (changes: { title: string; icon: string | null; description: string | null }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(topic.title);
  const [icon, setIcon] = useState(topic.icon ?? "");
  const [description, setDescription] = useState(topic.description ?? "");
  return (
    <div className="max-w-xl space-y-4 rounded-3xl border border-white/10 bg-surface p-6">
      <h2 className="font-display text-xl font-extrabold">Hoofdonderwerp bewerken</h2>
      <Field label="Titel">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Icoon (emoji)">
        <input className={inputClass} value={icon} onChange={(e) => setIcon(e.target.value)} />
      </Field>
      <Field label="Beschrijving">
        <textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <button className={primaryButton} onClick={() => title.trim() && onSave({ title, icon: icon || null, description: description || null })}>
        Opslaan
      </button>

    </div>
  );
}
