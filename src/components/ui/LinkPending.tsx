"use client";

import { useLinkStatus } from "next/link";

export default function LinkPending() {
  const { pending } = useLinkStatus();
  return <span aria-live="polite" className="sr-only">{pending ? "Pagina laden..." : ""}</span>;
}
