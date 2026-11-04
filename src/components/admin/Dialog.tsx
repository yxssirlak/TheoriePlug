"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

const inputClass =
  "w-full rounded-xl border border-paper/15 bg-white/5 px-4 py-2.5 text-paper placeholder:text-paper/30 outline-none transition-all focus:border-lime focus:ring-2 focus:ring-lime/30";

type DialogState =
  | { kind: "prompt"; title: string; label: string; value: string; confirmLabel: string }
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; danger: boolean };

type Resolver = (result: string | boolean | null) => void;

export function useDialogs() {
  const [state, setState] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<Resolver | null>(null);

  const open = useCallback((next: DialogState) => {
    return new Promise<string | boolean | null>((resolve) => {
      resolver.current = resolve;
      if (next.kind === "prompt") setValue(next.value);
      setState(next);
    });
  }, []);

  const prompt = useCallback(
    (options: { title: string; label: string; value?: string; confirmLabel?: string }) =>
      open({ kind: "prompt", title: options.title, label: options.label, value: options.value ?? "", confirmLabel: options.confirmLabel ?? "Opslaan" }) as Promise<string | null>,
    [open],
  );

  const confirm = useCallback(
    (options: { title: string; message: string; confirmLabel?: string; danger?: boolean }) =>
      open({ kind: "confirm", title: options.title, message: options.message, confirmLabel: options.confirmLabel ?? "Verwijderen", danger: options.danger ?? true }) as Promise<boolean>,
    [open],
  );

  const close = (result: string | boolean | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (state?.kind === "prompt") {
      const trimmed = value.trim();
      if (trimmed) close(trimmed);
    } else {
      close(true);
    }
  };

  const element = (
    <AnimatePresence>
      {state && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && close(state.kind === "confirm" ? false : null)}
          onKeyDown={(event) => event.key === "Escape" && close(state.kind === "confirm" ? false : null)}
        >
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
            onSubmit={submit}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-md rounded-3xl border border-lime/30 bg-[#0a121e] p-6 text-paper shadow-[0_0_60px_rgba(204,255,0,0.12)]"
          >
            <h2 className="font-display text-xl font-extrabold">{state.title}</h2>

            {state.kind === "prompt" ? (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-semibold text-paper/80">{state.label}</span>
                <input autoFocus className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} />
              </label>
            ) : (
              <p className="mt-3 text-paper/70">{state.message}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => close(state.kind === "confirm" ? false : null)}
                className="rounded-full border border-paper/20 px-5 py-2 text-sm font-bold transition-colors hover:border-paper/50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                autoFocus={state.kind === "confirm"}
                disabled={state.kind === "prompt" && !value.trim()}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 ${
                  state.kind === "confirm" && state.danger ? "bg-red-500 text-white" : "bg-lime text-ink"
                }`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { prompt, confirm, element };
}
