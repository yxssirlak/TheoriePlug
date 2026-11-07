"use client";

import { useLinkStatus } from "next/link";

export default function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-live="polite" className="absolute right-1 top-1">{pending && <><span aria-hidden="true" className="block h-2 w-2 animate-pulse rounded-full bg-lime motion-reduce:animate-none" /><span className="sr-only">Pagina laden...</span></>}</span>;
}
