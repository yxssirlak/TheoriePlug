"use client";

import { useEffect, useState } from "react";
import { createClient } from "../supabase";

type State<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; items: T[] };
export type UsePublishedState<T> = State<T>;

// Leerlingen zien alleen gepubliceerde items; de RLS-policy vereist daarnaast een actief pakket
export function usePublished<T>(table: string): State<T> {
  const [state, setState] = useState<State<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from(table)
      .select("*")
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        setState(error ? { status: "error", message: error.message } : { status: "ready", items: (data ?? []) as T[] });
      });
    return () => {
      cancelled = true;
    };
  }, [table]);

  return state;
}
