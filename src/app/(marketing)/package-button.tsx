"use client";

import { useRef, type PointerEvent } from "react";

type PackageButtonProps = {
  featured: boolean;
};

export default function PackageButton({ featured }: PackageButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse" || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.12;

    buttonRef.current.style.setProperty("--magnetic-x", `${Math.max(-5, Math.min(5, x))}px`);
    buttonRef.current.style.setProperty("--magnetic-y", `${Math.max(-5, Math.min(5, y))}px`);
  }

  function resetPosition() {
    buttonRef.current?.style.setProperty("--magnetic-x", "0px");
    buttonRef.current?.style.setProperty("--magnetic-y", "0px");
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPosition}
      style={{ transform: "translate3d(var(--magnetic-x, 0px), var(--magnetic-y, 0px), 0)" }}
      className={`group relative isolate w-full overflow-hidden rounded-full py-4 font-bold transition-[transform,box-shadow,background-color,border-color,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink motion-reduce:transition-none ${
        featured
          ? "bg-lime text-ink shadow-[0_0_18px_rgba(204,255,0,0.2)] hover:shadow-[0_0_30px_rgba(204,255,0,0.55)]"
          : "border border-paper/30 bg-paper/10 text-paper hover:border-jade hover:bg-jade hover:text-ink hover:shadow-[0_0_24px_rgba(16,185,129,0.4)]"
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[450%] motion-reduce:transition-none"
      />
      <span className="relative">Kies dit pakket</span>
    </button>
  );
}
