"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export default function GlassSelect<T extends string>({ value, onChange, options, label, disabled = false, required = false }: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function choose(index: number) {
    if (disabled) return;
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setActive(selected); setOpen(true); }
      else setActive((previous) => Math.max(0, Math.min(options.length - 1, previous + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : options.length - 1);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div ref={ref} className="relative mt-1">
      <button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open && !disabled} aria-controls={listId}
        aria-activedescendant={open && !disabled ? `${listId}-${active}` : undefined} aria-required={required} aria-disabled={disabled}
        disabled={disabled} onKeyDown={keyDown} onClick={() => { setActive(selected); setOpen((old) => !old); }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-surface-raised px-3 py-2 text-left text-sm text-paper outline-none transition hover:border-white/20 focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30 disabled:opacity-50">
        <span className="truncate">{options[selected]?.label ?? "Kies een optie"}</span>
        <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-lime transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && !disabled && <ul id={listId} role="listbox" aria-label={label} className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-white/15 bg-surface p-1.5 shadow-2xl">
        {options.map((option, index) => <li id={`${listId}-${index}`} key={option.value} role="option" aria-selected={option.value === value}
          onPointerMove={() => setActive(index)} onClick={() => choose(index)}
          className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${index === active ? "bg-lime text-ink" : "text-paper/90 hover:bg-white/10"}`}>
          {option.label}{option.value === value && <span aria-hidden="true" className="float-right">✓</span>}
        </li>)}
      </ul>}
    </div>
  );
}
