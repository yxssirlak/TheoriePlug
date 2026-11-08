import type { ReactNode } from "react";

export type SkeletonKind =
  | "dashboard" | "video" | "flashcards" | "exam" | "cards" | "sheet" | "settings"
  | "admin-dashboard" | "admin-editor" | "admin-flashcards" | "users" | "kilometers"
  | "marketing" | "marketing-page" | "auth" | "checkout" | "coming-soon";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-paper/10 motion-reduce:animate-none ${className}`} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <div role="status" aria-label="Gegevens laden" className="space-y-2 rounded-2xl border border-white/10 bg-surface p-4"><span className="sr-only">Gegevens laden...</span><Skeleton className="h-9 w-full" /><SkeletonList rows={rows} /></div>;
}

function Header() {
  return <div className="space-y-3"><Skeleton className="h-9 w-48 max-w-full" /><Skeleton className="h-4 w-80 max-w-full" /></div>;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-4 rounded-3xl border border-white/10 bg-surface p-6 ${className}`}>{children}</div>;
}

function Lines() {
  return <><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></>;
}

export function SkeletonContent({ kind }: { kind: SkeletonKind }) {
  switch (kind) {
    case "video":
      return <div className="space-y-6"><Skeleton className="h-24 w-full" /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5"><Skeleton className="aspect-video w-full rounded-3xl" /><Panel><Lines /></Panel></div><Panel><SkeletonList rows={6} /></Panel></div></div>;
    case "flashcards":
      return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-5"><Panel><Lines /></Panel><Skeleton className="h-[28rem] w-full rounded-3xl" /></div><Panel><SkeletonList rows={5} /></Panel></div>;
    case "exam":
      return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Panel key={i}><Lines /><Skeleton className="h-12 w-40 rounded-full" /></Panel>)}</div>;
    case "cards":
      return <div className="grid gap-5 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Panel key={i}><Skeleton className="aspect-video w-full" /><Lines /></Panel>)}</div>;
    case "sheet":
      return <div className="space-y-5"><div className="flex justify-between"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></div><Panel><Skeleton className="h-16 w-full" /><div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-video w-full" />)}</div></Panel></div>;
    case "settings":
      return <Panel className="max-w-2xl"><Skeleton className="h-6 w-56" /><SkeletonList rows={3} /><Skeleton className="h-11 w-40 rounded-full" /></Panel>;
    case "admin-editor":
      return <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]"><div className="space-y-3"><Skeleton className="h-11 w-full" /><SkeletonList /></div><Panel><Lines /><Skeleton className="h-40 w-full" /></Panel></div>;
    case "admin-flashcards":
      return <div className="grid gap-6 xl:grid-cols-2">{[0, 1].map((i) => <Panel key={i}><Skeleton className="h-6 w-44" /><SkeletonList rows={5} /></Panel>)}</div>;
    case "users":
      return <TableSkeleton />;
    case "kilometers":
      return <div className="space-y-6"><Panel><Skeleton className="h-6 w-52" /><div className="grid gap-4 sm:grid-cols-2"><SkeletonList rows={3} /><SkeletonList rows={3} /></div></Panel><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div><TableSkeleton /></div>;
    case "admin-dashboard":
      return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Panel key={i}><Skeleton className="h-8 w-12" /><Skeleton className="h-4 w-32" /></Panel>)}</div>;
    case "dashboard":
      return <div className="space-y-8"><Skeleton className="h-40 w-full rounded-3xl" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div><div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div></div>;
    case "auth":
      return <Panel className="mx-auto mt-12 max-w-md"><Skeleton className="mx-auto h-12 w-44" /><Lines /><SkeletonList rows={2} /><Skeleton className="h-12 w-full" /></Panel>;
    case "checkout":
      return <div className="grid gap-6 lg:grid-cols-2"><Panel><Lines /><SkeletonList rows={5} /></Panel><Panel><Lines /><SkeletonList rows={3} /></Panel></div>;
    case "marketing":
      return <div className="space-y-8"><Skeleton className="h-20 w-full" /><Panel className="min-h-[55vh]"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-6 w-1/2" /><Skeleton className="h-12 w-40 rounded-full" /></Panel></div>;
    case "marketing-page":
      return <div className="min-h-screen"><Skeleton className="h-20 w-full" /><div className="space-y-6 px-4 pt-16 sm:px-10"><Skeleton className="h-14 w-96 max-w-full" /><div className="max-w-2xl space-y-4"><Lines /></div><div className="grid max-w-3xl gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-square rounded-3xl" />)}</div></div></div>;
    case "coming-soon":
      return <Panel className="mx-auto mt-16 max-w-xl"><Lines /><Skeleton className="h-12 w-48" /></Panel>;
  }
}

export default function PageSkeleton({ kind, header = true }: { kind: SkeletonKind; header?: boolean }) {
  return <div role="status" aria-label="Pagina laden" className="space-y-7"><span className="sr-only">Pagina laden...</span>{header && <Header />}<SkeletonContent kind={kind} /></div>;
}

export function skeletonForPath(path: string): SkeletonKind {
  const kinds: Record<string, SkeletonKind> = {
    "/dashboard": "dashboard", "/videocursus": "video", "/flashcards": "flashcards",
    "/oefenexamens": "exam", "/cheat-sheet": "sheet",
    "/instellingen": "settings", "/voortgang": "coming-soon",
    "/admin": "admin-dashboard", "/admin/cursus": "admin-editor",
    "/admin/oefenexamens": "admin-editor", "/admin/cheat-sheet": "admin-editor",
    "/admin/flashcards": "admin-flashcards", "/admin/gebruikers": "users",
    "/admin/km-declaratie": "kilometers",
  };
  return kinds[path] ?? "dashboard";
}
