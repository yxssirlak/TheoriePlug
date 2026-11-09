"use client";

import { useRef, useState, type PointerEvent } from "react";
import { placeOrderingNumber, removeOrderingNumber, type OrderingAnswer } from "../../lib/exam-interaction";
import ExamImage from "../ui/ExamImage";

type Zone = { id: string; coordinates_x: number | null; coordinates_y: number | null };
type Drag = { pointerId: number; value: number; startX: number; startY: number; moved: boolean };

export default function OrderingQuestion({ imageUrl, options, value, onChange }: {
  imageUrl: string;
  options: Zone[];
  value: OrderingAnswer;
  onChange: (value: OrderingAnswer) => void;
}) {
  const image = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ value: number; x: number; y: number } | null>(null);

  function pointerDown(event: PointerEvent<HTMLButtonElement>, number: number) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, value: number, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 5) active.moved = true;
    if (active.moved) setGhost({ value: active.value, x: event.clientX, y: event.clientY });
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    setGhost(null);
    if (!active.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const zones = image.current?.querySelectorAll<HTMLButtonElement>("[data-order-zone]");
    const target = Array.from(zones ?? []).find((zone) => {
      const rect = zone.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (target?.dataset.orderZone) {
      onChange(placeOrderingNumber(value, target.dataset.orderZone, active.value));
      setSelected(null);
    }
  }

  function selectNumber(number: number) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setSelected((current) => current === number ? null : number);
  }

  const handlers = (number: number) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => pointerDown(event, number),
    onPointerMove: pointerMove,
    onPointerUp: pointerUp,
    onPointerCancel: () => { drag.current = null; setGhost(null); },
    onLostPointerCapture: () => { drag.current = null; setGhost(null); },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-paper/70">Sleep de nummers naar de juiste posities. Je kunt ook een nummer kiezen en daarna op een positie klikken.</p>
      <div ref={image} className="relative max-w-3xl">
        <ExamImage path={imageUrl} alt="Situatie bij de vraag" className="block h-auto w-full select-none rounded-xl" />
        {options.map((option, index) => {
          const number = value[option.id];
          return (
            <button key={option.id} type="button" data-order-zone={option.id}
              style={{ left: `${option.coordinates_x ?? 50}%`, top: `${option.coordinates_y ?? 50}%` }}
              aria-label={`Positie ${index + 1}, ${number ? `nummer ${number}` : "nog leeg"}${selected !== null ? `, plaats nummer ${selected}` : ""}`}
              aria-pressed={number !== undefined && selected === number}
              {...(number !== undefined ? handlers(number) : {})}
              onClick={() => {
                if (suppressClick.current) { suppressClick.current = false; return; }
                if (selected !== null) {
                  onChange(placeOrderingNumber(value, option.id, selected));
                  setSelected(null);
                } else if (number !== undefined) setSelected(number);
              }}
              className={`absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-2 font-bold shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-lime/50 ${number !== undefined ? "cursor-grab border-lime bg-lime text-ink active:cursor-grabbing" : "border-lime bg-ink/85 text-lime"} ${selected === number && number !== undefined ? "ring-4 ring-lime/50" : ""}`}>
              {number ?? <span aria-hidden="true">+</span>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3" aria-label="Beschikbare volgordenummers">
        {options.map((_, index) => index + 1).filter((number) => !Object.values(value).includes(number)).map((number) => (
          <button key={number} type="button" {...handlers(number)} onClick={() => selectNumber(number)}
            aria-label={`Nummer ${number} kiezen of slepen`} aria-pressed={selected === number}
            className={`h-12 w-12 touch-none cursor-grab rounded-full bg-lime font-bold text-ink shadow-lg active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${selected === number ? "ring-4 ring-lime/50" : ""}`}>
            {number}
          </button>
        ))}
        {selected !== null && Object.values(value).includes(selected) && (
          <button type="button" className="rounded-xl border border-white/20 px-3 py-2 text-sm text-paper/80 hover:border-lime focus-visible:outline-2 focus-visible:outline-lime"
            onClick={() => { onChange(removeOrderingNumber(value, selected)); setSelected(null); }}>
            Nummer {selected} terugleggen
          </button>
        )}
      </div>
      {ghost && <div aria-hidden="true" style={{ left: ghost.x, top: ghost.y }} className="pointer-events-none fixed z-[150] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lime font-bold text-ink shadow-xl ring-4 ring-lime/30">{ghost.value}</div>}
    </div>
  );
}
