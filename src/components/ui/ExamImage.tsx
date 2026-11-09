"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function ExamImage({ path, alt, className = "", autoPlay = true }: {
  path: string;
  alt: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<{ path: string; url?: string; error?: string } | null>(null);
  const isVideo = path.toLowerCase().endsWith(".mp4");
  useEffect(() => {
    let active = true;
    const refresh = () => {
      createClient().storage.from("exam-images").createSignedUrl(path, 3600).then(({ data, error }) => {
        if (active) setState(error ? { path, error: "Media laden mislukt." } : { path, url: data.signedUrl });
      }).catch(() => {
        if (active) setState({ path, error: "Media laden mislukt." });
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 45 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [path]);
  if (!state || state.path !== path) return <div role="status" className="aspect-video animate-pulse rounded-xl bg-white/[0.05] text-white/45">Media laden...</div>;
  if (state.error) return <p role="alert" className="text-red-400">{state.error}</p>;
  if (isVideo) {
    return <video src={state.url} aria-label={alt} autoPlay={autoPlay} muted loop playsInline preload="metadata" className={className} />;
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={state.url} alt={alt} className={className} />;
}
