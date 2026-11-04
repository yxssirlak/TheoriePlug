"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "../../lib/supabase";
import { uploadMedia } from "../../lib/course/storage";
import { useDialogs } from "./Dialog";

type Row = Record<string, unknown> & { id: string; sort_order: number; is_published: boolean };

export type ContentField =
  | { key: string; label: string; kind: "text" | "textarea" | "image"; hint?: string }
  | { key: "options"; label: string; kind: "options" };

type Props = {
  table: string;
  title: string;
  intro: string;
  singular: string;
  fields: ContentField[];
  titleKey: string;
  defaults: Record<string, unknown>;
};

const inputClass =
  "w-full rounded-xl border border-paper/15 bg-white/5 px-4 py-2.5 text-paper placeholder:text-paper/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/30";
const primaryButton =
  "rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50";

export default function ContentManager({ table, title, intro, singular, fields, titleKey, defaults }: Props) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ id: number; type: "ok" | "error"; text: string } | null>(null);
  const { confirm, element: dialogs } = useDialogs();

  const notify = useCallback((type: "ok" | "error", text: string) => setToast({ id: Date.now(), type, text }), []);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.type === "error" ? 8000 : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from(table)
      .select("*")
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setToast({ id: Date.now(), type: "error", text: error.message });
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, table, version]);

  const add = async () => {
    const { data, error } = await supabase
      .from(table)
      .insert({ ...defaults, sort_order: rows.length })
      .select("id")
      .single();
    if (error) return notify("error", error.message);
    reload();
    setSelectedId(data.id);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + direction];
    if (!b) return;
    // Posities worden genormaliseerd zodat gelijke sort_order-waarden geen probleem zijn
    const first = await supabase.from(table).update({ sort_order: index + direction }).eq("id", a.id);
    const second = await supabase.from(table).update({ sort_order: index }).eq("id", b.id);
    const error = first.error ?? second.error;
    if (error) notify("error", error.message);
    else reload();
  };

  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => String(row[titleKey] ?? "").toLowerCase().includes(search.toLowerCase()));
  const selected = rows.find((row) => row.id === selectedId);

  return (
    <main className="p-6">
      {dialogs}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={() => setToast(null)}
            className={`fixed bottom-6 right-6 z-[90] flex max-w-sm cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl backdrop-blur ${
              toast.type === "ok" ? "border-jade/50 bg-[#0a1f1a]/95 text-jade" : "border-red-500/50 bg-[#2a0d12]/95 text-red-300"
            }`}
          >
            <span className="text-lg">{toast.type === "ok" ? "✓" : "⚠"}</span>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      <h1 className="font-display text-2xl font-extrabold">
        <span className="text-lime">{title}</span>
      </h1>
      <p className="mt-1 text-sm text-paper/55">{intro}</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-3 self-start">
          <div className="flex gap-2">
            <button onClick={add} className={primaryButton}>
              + {singular}
            </button>
            <input className={inputClass} placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading && <p className="text-paper/50">Laden...</p>}
          <ul className="space-y-1">
            {visible.map(({ row, index }) => (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-xl border border-paper/10 bg-white/[0.03] px-3 py-2">
                <button
                  onClick={() => setSelectedId(row.id)}
                  className={`truncate text-left text-sm ${selectedId === row.id ? "font-bold text-lime" : "text-paper/80 hover:text-paper"}`}
                >
                  {row.is_published ? "● " : "○ "}
                  {String(row[titleKey] || "(naamloos)")}
                </button>
                {!search && (
                  <span className="flex shrink-0">
                    <button aria-label="Omhoog" disabled={index === 0} onClick={() => move(index, -1)} className="px-1 text-paper/60 hover:text-lime disabled:opacity-20">▲</button>
                    <button aria-label="Omlaag" disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="px-1 text-paper/60 hover:text-lime disabled:opacity-20">▼</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!loading && rows.length === 0 && <p className="text-sm text-paper/50">Nog niets toegevoegd.</p>}
        </aside>

        <section className="min-w-0">
          {selected ? (
            <ItemEditor
              key={selected.id}
              row={selected}
              fields={fields}
              table={table}
              singular={singular}
              supabase={supabase}
              notify={notify}
              confirm={confirm}
              onSaved={reload}
              onDeleted={() => {
                setSelectedId(null);
                reload();
              }}
            />
          ) : (
            <p className="text-paper/50">Kies links een item om te bewerken. ● = gepubliceerd, ○ = concept.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function ItemEditor({
  row,
  fields,
  table,
  singular,
  supabase,
  notify,
  confirm,
  onSaved,
  onDeleted,
}: {
  row: Row;
  fields: ContentField[];
  table: string;
  singular: string;
  supabase: ReturnType<typeof createClient>;
  notify: (type: "ok" | "error", text: string) => void;
  confirm: (options: { title: string; message: string }) => Promise<boolean>;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [draft, setDraft] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const patch = (changes: Record<string, unknown>) => setDraft((d) => ({ ...d, ...changes }));

  const save = async () => {
    const payload: Record<string, unknown> = { is_published: draft.is_published };
    for (const field of fields) {
      if (field.kind === "options") {
        const options = draft.options as string[];
        if (options.some((option) => !option.trim())) return notify("error", "Vul alle antwoordopties in of verwijder lege opties.");
        payload.options = options;
        payload.correct_option = draft.correct_option;
      } else {
        const value = draft[field.key];
        payload[field.key] = typeof value === "string" && value.trim() === "" && field.kind !== "text" ? null : value;
      }
    }
    setBusy(true);
    const { error } = await supabase.from(table).update(payload).eq("id", row.id);
    setBusy(false);
    if (error) return notify("error", error.message);
    notify("ok", `${singular} opgeslagen.`);
    onSaved();
  };

  const remove = async () => {
    if (!(await confirm({ title: `${singular} verwijderen`, message: "Weet je zeker dat je dit wilt verwijderen?" }))) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", row.id);
    setBusy(false);
    if (error) return notify("error", error.message);
    onDeleted();
  };

  const upload = async (key: string, file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    try {
      patch({ [key]: await uploadMedia(supabase, file, `${table}/${row.id}`, setProgress) });
    } catch (error) {
      notify("error", `Uploaden mislukt: ${error instanceof Error ? error.message : "onbekend"}`);
    }
    setProgress(null);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-jade/30 bg-white/[0.03] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold">{singular} bewerken</h2>
        <button onClick={save} disabled={busy} className={primaryButton}>
          Opslaan
        </button>
      </div>

      {fields.map((field) => {
        if (field.kind === "text") {
          return (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-paper/80">{field.label}</span>
              <input className={inputClass} value={String(draft[field.key] ?? "")} onChange={(e) => patch({ [field.key]: e.target.value })} />
              {field.hint && <span className="mt-1 block text-xs text-paper/45">{field.hint}</span>}
            </label>
          );
        }
        if (field.kind === "textarea") {
          return (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-paper/80">{field.label}</span>
              <textarea rows={5} className={inputClass} value={String(draft[field.key] ?? "")} onChange={(e) => patch({ [field.key]: e.target.value })} />
              {field.hint && <span className="mt-1 block text-xs text-paper/45">{field.hint}</span>}
            </label>
          );
        }
        if (field.kind === "image") {
          const url = draft[field.key] as string | null;
          return (
            <div key={field.key}>
              <span className="mb-1.5 block text-sm font-semibold text-paper/80">{field.label}</span>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-paper/70 file:mr-3 file:rounded-full file:border-0 file:bg-lime file:px-4 file:py-2 file:font-bold file:text-ink"
                onChange={(e) => upload(field.key, e.target.files?.[0])}
              />
              {progress !== null && <span className="mt-1 block text-xs font-semibold text-lime">{Math.round(progress * 100)}% geüpload...</span>}
              {url && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-24 rounded-lg object-cover" />
                  <button type="button" onClick={() => patch({ [field.key]: null })} className="text-sm text-red-300">
                    Verwijderen
                  </button>
                </div>
              )}
            </div>
          );
        }
        const options = draft.options as string[];
        return (
          <div key="options" className="space-y-2">
            <span className="block text-sm font-semibold text-paper/80">{field.label} (kies het juiste antwoord)</span>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${row.id}`}
                  checked={draft.correct_option === index}
                  onChange={() => patch({ correct_option: index })}
                  aria-label={`Antwoord ${index + 1} is juist`}
                  className="h-4 w-4 accent-[#10b981]"
                />
                <input
                  className={inputClass}
                  value={option}
                  placeholder={`Antwoord ${index + 1}`}
                  onChange={(e) => patch({ options: options.map((o, i) => (i === index ? e.target.value : o)) })}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    aria-label="Optie verwijderen"
                    className="px-2 text-red-300"
                    onClick={() => {
                      const current = draft.correct_option as number;
                      patch({
                        options: options.filter((_, i) => i !== index),
                        correct_option: index === current ? 0 : index < current ? current - 1 : current,
                      });
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button type="button" onClick={() => patch({ options: [...options, ""] })} className="text-sm font-semibold text-lime">
                + Optie toevoegen
              </button>
            )}
          </div>
        );
      })}

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={Boolean(draft.is_published)} onChange={(e) => patch({ is_published: e.target.checked })} className="h-4 w-4 accent-[#ccff00]" />
        Gepubliceerd (zichtbaar voor leerlingen)
      </label>

      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className={primaryButton}>
          Opslaan
        </button>
        <button onClick={remove} disabled={busy} className="rounded-full border border-red-500/50 px-5 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10 disabled:opacity-50">
          Verwijderen
        </button>
      </div>
    </div>
  );
}
