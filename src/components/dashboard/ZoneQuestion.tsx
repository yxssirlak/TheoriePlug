"use client";

import { useRef, useState } from "react";
import ExamImage from "../ui/ExamImage";

type Zone = { id: string; option_text: string; coordinates_x: number | null; coordinates_y: number | null };

export default function ZoneQuestion({ imageUrl, options, value, onChange, mode }: {
  imageUrl: string;
  options: Zone[];
  value: string | null;
  onChange: (id: string) => void;
  mode: "hotspot" | "single_drag";
}) {
  const image = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  function drop(x: number, y: number) {
    const rect = image.current?.getBoundingClientRect();
    if (!rect) return;
    const nearest = options.map((option) => ({
      id: option.id,
      distance: Math.hypot(x - (rect.left + rect.width * (option.coordinates_x ?? 50) / 100), y - (rect.top + rect.height * (option.coordinates_y ?? 50) / 100)),
    })).sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance <= 36) onChange(nearest.id);
  }

  return <div className="space-y-4">
    <p className="text-sm text-paper/70">{mode === "single_drag" ? "Sleep de markering naar een positie of kies een positie met de knoppen." : "Kies de juiste positie op de afbeelding."}</p>
    {mode === "single_drag" && <button type="button" aria-label="Sleep deze markering naar een positie op de afbeelding"
      onPointerDown={(event) => {
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ x: event.clientX, y: event.clientY });
      }}
      onPointerMove={(event) => { if (pointer.current === event.pointerId) setDrag({ x: event.clientX, y: event.clientY }); }}
      onPointerUp={(event) => {
        if (pointer.current === event.pointerId) drop(event.clientX, event.clientY);
        pointer.current = null;
        setDrag(null);
      }}
      onPointerCancel={() => { pointer.current = null; setDrag(null); }}
      onLostPointerCapture={() => { pointer.current = null; setDrag(null); }}
      className="flex h-12 w-12 touch-none cursor-grab items-center justify-center rounded-full border-2 border-lime bg-lime text-xl font-black text-ink active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime">●</button>}
    {drag && <span aria-hidden="true" style={{ left: drag.x, top: drag.y }} className="pointer-events-none fixed z-50 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-lime bg-lime text-xl font-black text-ink shadow-xl">●</span>}
    <div ref={image} className="relative max-w-3xl">
      <ExamImage path={imageUrl} alt="Afbeelding bij de vraag met antwoordposities" className="block h-auto w-full rounded-xl" />
      {options.map((option, index) => <button key={option.id} type="button" aria-label={`${option.option_text || `Positie ${index + 1}`}${value === option.id ? ", geselecteerd" : ""}`} aria-pressed={value === option.id}
        onClick={() => onChange(option.id)} style={{ left: `${option.coordinates_x ?? 50}%`, top: `${option.coordinates_y ?? 50}%` }}
        className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${value === option.id ? "border-lime bg-lime text-ink" : "border-white bg-ink/80 text-white hover:border-lime"}`}>
        {value === option.id ? "●" : index + 1}
      </button>)}
    </div>
  </div>;
}
