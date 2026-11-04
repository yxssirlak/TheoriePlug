import type { ReactNode } from "react";
import type { UsePublishedState } from "../../lib/course/usePublished";

export function PageHeader({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-1 text-paper/60">{text}</p>
    </div>
  );
}

// Toont laad-, fout- en leegstatus; rendert `children` pas als er items zijn
export function ContentState<T>({ state, empty, children }: { state: UsePublishedState<T>; empty: string; children: (items: T[]) => ReactNode }) {
  if (state.status === "loading") return <p className="text-paper/60">Laden...</p>;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
        Kon de inhoud niet laden: {state.message}
      </p>
    );
  }
  if (state.items.length === 0) {
    return <p className="rounded-2xl border border-paper/10 bg-white/[0.03] p-6 text-paper/60">{empty}</p>;
  }
  return <>{children(state.items)}</>;
}
