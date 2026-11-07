import type { ReactNode } from "react";
import type { UsePublishedState } from "../../lib/course/usePublished";
import Notification from "../ui/Notification";
import PageSkeleton, { type SkeletonKind } from "../ui/PageSkeleton";

export function PageHeader({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <p className="mt-1 text-paper/60">{text}</p>
    </div>
  );
}

// Toont laad-, fout- en leegstatus; rendert `children` pas als er items zijn
export function ContentState<T>({ state, empty, skeleton, children }: { state: UsePublishedState<T>; empty: string; skeleton: SkeletonKind; children: (items: T[]) => ReactNode }) {
  if (state.status === "loading") return <PageSkeleton kind={skeleton} header={false} />;
  if (state.status === "error") {
    return (
      <Notification>
        Kon de inhoud niet laden: {state.message}
      </Notification>
    );
  }
  if (state.items.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-surface p-6 text-paper/60">{empty}</p>;
  }
  return <>{children(state.items)}</>;
}
