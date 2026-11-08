"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function ExamImage({ path, alt, className = "" }: { path: string; alt: string; className?: string }) {
  const [state, setState] = useState<{ path: string; url?: string; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      createClient().storage.from("exam-images").createSignedUrl(path, 3600).then(({ data, error }) => {
        if (active) setState(error ? { path, error: "Afbeelding laden mislukt." } : { path, url: data.signedUrl });
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 45 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [path]);
  if (!state || state.path !== path) return <div role="status" className="aspect-video animate-pulse rounded-xl bg-paper/10">Afbeelding laden...</div>;
  if (state.error) return <p role="alert" className="text-red-400">{state.error}</p>;
  // Supabase signed URLs are dynamic and expire.
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={state.url} alt={alt} className={className} />;
}
