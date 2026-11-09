"use client";

export function ExamToggle({ checked, onChange, label, disabled = false }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] disabled:opacity-50 ${checked ? "border-[#CCFF00]/35 bg-[#CCFF00]/10 text-[#eaff9b]" : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20"}`}
    >
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[#CCFF00]" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#18181b] shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function ExamChoiceChips<T extends string>({ values, selected, onChange, disabled = false }: {
  values: { value: T; label: string }[];
  selected: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Pakketten met toegang">
      {values.map((item) => {
        const active = selected.includes(item.value);
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={`rounded-full border px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CCFF00] disabled:opacity-50 ${active ? "border-[#CCFF00]/50 bg-[#CCFF00] text-[#11170a]" : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
