"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export default function Notification({ children, type = "error", onDismiss }: {
  children: ReactNode;
  type?: "error" | "success" | "warning" | "deleted";
  onDismiss?: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div role={type === "error" ? "alert" : "status"} className={`fixed bottom-4 right-4 z-[90] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-2xl backdrop-blur-xl sm:bottom-6 sm:right-6 ${
      type === "error" || type === "deleted" ? "border-red-500/50 bg-[#2a0d12]/95 text-red-300" : type === "warning" ? "border-yellow-500/50 bg-[#29210a]/95 text-yellow-200" : "border-jade/50 bg-[#0a1f1a]/95 text-jade"
    }`}>
      <span aria-hidden="true">{type === "success" ? "✓" : type === "deleted" ? "✕" : "⚠"}</span><div className="min-w-0 flex-1">{children}</div>
      {onDismiss && <button type="button" aria-label="Melding sluiten" onClick={onDismiss} className="text-current opacity-70 hover:opacity-100">✕</button>}
    </div>, document.body,
  );
}
