"use client";

import { useState } from "react";

const MONTHS = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export default function GlassDatePicker({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (date: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

  const selected = value ? new Date(value) : null;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Maandag als eerste dag

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
  const handleNext = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelect = (day: number) => {
    const d = new Date(year, month, day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const formatDisplay = () => {
    if (!selected) return "dd-mm-jjjj";
    return `${String(selected.getDate()).padStart(2, '0')}-${String(selected.getMonth() + 1).padStart(2, '0')}-${selected.getFullYear()}`;
  };

  return (
    <div className="relative w-full">
      {/* Het neppe input veld */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-surface-raised px-4 py-3 font-semibold transition-colors focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
      >
        <span className={value ? "text-paper" : "text-paper/30"}>{formatDisplay()}</span>
        <svg className="h-5 w-5 text-paper/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* De Glazen Kalender Pop-up */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-white/15 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
            
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={handlePrev} className="p-1 text-paper/60 transition-colors hover:text-lime">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="font-display font-bold text-paper">
                {MONTHS[month]} {year}
              </div>
              <button type="button" onClick={handleNext} className="p-1 text-paper/60 transition-colors hover:text-lime">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-paper/40">
              {DAYS.map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 text-sm font-semibold">
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = selected?.getDate() === day && selected?.getMonth() === month && selected?.getFullYear() === year;
                
                // Check of deze dag exact de datum van vandaag is
                const today = new Date();
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                      isSelected 
                        ? "bg-lime font-extrabold text-ink shadow-[0_0_12px_rgba(204,255,0,0.5)]" 
                        : isToday
                        ? "border border-lime text-lime font-bold shadow-[0_0_8px_rgba(204,255,0,0.2)] hover:bg-lime/10"
                        : "text-paper/80 hover:bg-white/10 hover:text-lime"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}