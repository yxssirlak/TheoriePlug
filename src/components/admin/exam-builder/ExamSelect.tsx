"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type SelectOption<T extends string> = { value: T; label: string; detail?: string };

export default function ExamSelect<T extends string>({
  value,
  options,
  label,
  onChange,
  disabled = false,
}: {
  value: T;
  options: SelectOption<T>[];
  label: string;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const reduceMotion = useReducedMotion();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function choose(index: number) {
    const option = options[index];
    if (!option || disabled) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActive(selectedIndex);
        setOpen(true);
      } else {
        setActive((current) => Math.max(0, Math.min(options.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
      }
    } else if (open && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : options.length - 1);
    } else if (open && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open && !disabled}
        aria-controls={listId}
        aria-activedescendant={open && !disabled ? `${listId}-${active}` : undefined}
        aria-disabled={disabled}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={() => {
          setActive(selectedIndex);
          setOpen((current) => !current);
        }}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#202024] px-3.5 text-left text-sm text-white outline-none transition hover:border-white/20 focus-visible:border-[#CCFF00] focus-visible:ring-2 focus-visible:ring-[#CCFF00]/25 disabled:opacity-50"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{options[selectedIndex]?.label ?? "Kies een optie"}</span>
          {options[selectedIndex]?.detail && <span className="mt-0.5 block truncate text-xs text-white/45">{options[selectedIndex].detail}</span>}
        </span>
        <svg aria-hidden="true" className={`h-4 w-4 shrink-0 text-[#CCFF00] transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && !disabled && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={label}
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.14 }}
            className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-white/10 bg-[#202024] p-1.5 shadow-2xl shadow-black/50"
          >
            {options.map((option, index) => (
              <li
                id={`${listId}-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
                className={`cursor-pointer rounded-xl px-3 py-2.5 text-sm transition-colors ${index === active ? "bg-[#CCFF00] text-[#10140a]" : "text-white/85 hover:bg-white/5"}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{option.label}</span>
                    {option.detail && <span className={`mt-0.5 block truncate text-xs ${index === active ? "text-black/60" : "text-white/45"}`}>{option.detail}</span>}
                  </span>
                  {option.value === value && <span aria-hidden="true">✓</span>}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
