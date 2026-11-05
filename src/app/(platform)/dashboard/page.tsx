"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "../../../components/dashboard/user-context";
import { createClient } from "../../../lib/supabase"; // Zorg dat dit pad klopt!

const QUICK_ACTIONS = [
  { href: "/oefenexamens", sticker: "oefenexamens", title: "Oefenexamen starten", text: "Doe een examen zoals bij het CBR.", accent: true },
  { href: "/videocursus", sticker: "videocursus", title: "Videocursus", text: "Leer de stof stap voor stap." },
  { href: "/flashcards", sticker: "flashcards", title: "Flashcards", text: "Snel herhalen, ook onderweg." },
  { href: "/adas", sticker: "adas", title: "ADAS", text: "Alles over rijhulpsystemen." },
  { href: "/cheat-sheet", sticker: "cheatsheet", title: "Cheat sheet", text: "Alle regels op één blad." },
  { href: "/voortgang", sticker: "voortgang", title: "Mijn voortgang", text: "Zie waar je nog punten laat liggen." },
];

const TIPS = [
  "Oefen liever 15 minuten per dag dan één keer vier uur. Zo blijft de stof hangen.",
  "Bekijk na elk examen je fout beantwoorde vragen. Daar leer je het meest van.",
  "Lees elke vraag helemaal uit voordat je antwoord geeft.",
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default function DashboardPage() {
  const user = useUser();
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const [success, setSuccess] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("success") === "true") {
      setSuccess(true);
      window.history.replaceState(null, "", "/dashboard");
    }
  }, []);

  // Haal de datum op en bereken de resterende dagen
  useEffect(() => {
    const fetchExamDate = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const examDate = authUser?.user_metadata?.exam_date;

      if (examDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Zet tijd op 00:00 voor accurate dag-berekening
        
        const exam = new Date(examDate);
        exam.setHours(0, 0, 0, 0);

        const diffTime = exam.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Zorg dat hij niet in de min gaat als de datum al voorbij is
        setDaysLeft(diffDays > 0 ? diffDays : 0);
      }
    };
    fetchExamDate();
  }, []);

  // STATS staat nu binnen de component zodat daysLeft dynamisch ingeladen kan worden
  const STATS = [
    { id: "score", label: "Gemiddelde score", value: 0, max: 100, type: "ring", color: "lime" },
    { id: "exams", label: "Oefenexamens", value: 0, max: 15, type: "bar", color: "jade" },
    { id: "questions", label: "Vragen geoefend", value: 0, max: 500, type: "bar", color: "lime" },
    { id: "days", label: "Dagen tot examen", value: daysLeft, max: null, type: "countdown", color: "jade" },
  ];

  return (
    <div className="space-y-8">
      {success && (
        <div role="status" className="flex items-start justify-between gap-4 rounded-2xl border border-lime/40 bg-lime/10 px-5 py-4">
          <p className="font-semibold text-lime">
            Betaling gelukt! Je pakket is actief. Veel succes met oefenen!
          </p>
          <button type="button" onClick={() => setSuccess(false)} aria-label="Sluiten" className="text-paper/60 transition-colors hover:text-paper">
            ✕
          </button>
        </div>
      )}
      <section>
        <p className="text-paper/60">{greeting()},</p>
        <h1 className="font-display text-3xl font-extrabold sm:text-5xl">
          Welkom <span className="text-lime">{user.name}</span>
        </h1>
        <p className="mt-2 text-paper/60">Klaar om je kennis te pluggen?</p>
      </section>

      <section className="rounded-3xl bg-lime p-6 text-ink sm:p-8">
        <div className="max-w-xl">
          <p className="text-sm font-bold uppercase tracking-widest text-ink/60">Aan de slag</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Start hier je videocursus</h2>
          <p className="mt-2 font-medium text-ink/80">
            Zo weet je direct waar je staat en welke onderdelen extra aandacht nodig hebben.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/videocursus" className="rounded-full bg-ink px-6 py-3 font-bold text-lime transition-transform hover:scale-105">
              Start videocursus
            </Link>
            <Link href="/oefenexamens" className="rounded-full border-2 border-ink px-6 py-3 font-bold transition-colors hover:bg-ink hover:text-lime">
              Bekijk de oefenexamens
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="Jouw cijfers" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => {
          const percent = stat.max && stat.value !== null ? Math.round((stat.value / stat.max) * 100) : 0;
          const hasValue = stat.value !== null && stat.value !== undefined;

          return (
            <div key={stat.id} className="relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-3xl border border-paper/5 bg-[#0a121e] p-5 shadow-lg transition-transform hover:-translate-y-1">
              
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-paper/50">{stat.label}</p>
              </div>

              {/* VISUAL 1: Circulaire Ring */}
              {stat.type === "ring" && (
                <div className="mt-auto flex items-center justify-between">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                      <path className="text-paper/10" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path 
                        className={`${stat.color === 'lime' ? 'text-lime' : 'text-jade'} transition-all duration-1000 ease-out`} 
                        strokeWidth="3" 
                        strokeDasharray={`${percent}, 100`} 
                        strokeLinecap="round" 
                        stroke="currentColor" 
                        fill="none" 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        style={{ filter: `drop-shadow(0 0 6px ${stat.color === 'lime' ? 'rgba(204,255,0,0.6)' : 'rgba(16,185,129,0.6)'})` }}
                      />
                    </svg>
                    <span className="absolute font-display text-sm font-bold text-white">{hasValue ? `${percent}%` : '0%'}</span>
                  </div>
                  <div className="text-right">
                    <p className={`font-display text-3xl font-black ${stat.color === 'lime' ? 'text-lime' : 'text-jade'}`}>
                      {hasValue ? stat.value : '-'}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-paper/40">Gemiddelde</p>
                  </div>
                </div>
              )}

              {/* VISUAL 2: Neon Laadbalk */}
              {stat.type === "bar" && (
                <div className="mt-auto">
                  <div className="mb-2 flex items-end justify-between">
                    <p className={`font-display text-3xl font-black drop-shadow-md ${stat.color === 'lime' ? 'text-lime' : 'text-jade'}`}>
                      {hasValue ? stat.value : '0'}
                    </p>
                    <p className="mb-1 text-xs font-bold text-paper/40">/ {stat.max}</p>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-paper/10">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        stat.color === 'lime' ? 'bg-lime shadow-[0_0_12px_rgba(204,255,0,0.8)]' : 'bg-jade shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                      }`} 
                      style={{ width: `${percent}%` }} 
                    />
                  </div>
                </div>
              )}

              {/* VISUAL 3: Countdown Kalender */}
              {stat.type === "countdown" && (
                <div className="mt-auto flex items-center gap-4">
                  {hasValue ? (
                    <>
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-jade text-ink shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                        <span className="font-display text-3xl font-black">{stat.value}</span>
                      </div>
                      <div>
                        <p className="font-display text-xl font-extrabold text-white">Dagen</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-paper/60">Tot je examen</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-paper/20 bg-white/5 text-paper/40">
                        <svg className="mb-0.5 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold text-paper/60">Geen datum</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-paper/40">Nog niet gepland</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
      
      {/* LAATSTE ACTIVITEIT / HERVATTEN */}
      <section>
        <div className="group relative flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border border-lime/30 bg-gradient-to-r from-[#0a121e] via-[#0a121e] to-lime/10 p-5 shadow-[0_0_20px_rgba(204,255,0,0.05)] transition-all hover:border-lime/50 hover:shadow-[0_0_30px_rgba(204,255,0,0.15)] sm:flex-row sm:items-center sm:p-6 lg:p-8">
          
          {/* Achtergrond glow (zichtbaar bij hover) */}
          <div className="absolute -right-20 -top-20 z-0 h-40 w-40 rounded-full bg-lime/20 blur-3xl transition-all duration-700 group-hover:bg-lime/40" />

          <div className="relative z-10 flex items-center gap-4 sm:gap-6">
            
            {/* Progress Ring met GROTE Play Sticker */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#18181B] shadow-inner sm:h-20 sm:w-20">
              
              {/* De geanimeerde Lime ring */}
              <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                <path className="text-paper/10" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path 
                  className="text-lime transition-all duration-1000 ease-out" 
                  strokeWidth="2.5" 
                  strokeDasharray="65, 100" 
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="none" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  style={{ filter: "drop-shadow(0 0 4px rgba(204,255,0,0.5))" }}
                />
              </svg>

              {/* De grote sticker (zonder de oude SVG!) */}
              <div className="relative z-10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Image
                  src="/brand/png/svg/sticker-afspelen.svg"
                  alt="Afspelen"
                  width={64}
                  height={64}
                  className="h-10 w-10 drop-shadow-xl sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                />
              </div>
            </div>

            {/* Tekst Content */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-lime sm:text-xs">Ga verder waar je bleef</p>
              <h3 className="mt-1 font-display text-xl font-black text-white drop-shadow-sm sm:text-2xl">Videocursus: Gevarenherkenning</h3>
              <p className="mt-1 text-xs font-semibold text-paper/60 sm:text-sm">Les 4: Snelheid en remafstand &bull; 65% voltooid</p>
            </div>
          </div>

          {/* Actieknop */}
          <div className="relative z-10 shrink-0">
            <Link href="/videocursus" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-6 py-3.5 font-display text-sm font-extrabold uppercase tracking-widest text-ink transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto">
              Hervatten
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl font-extrabold sm:text-2xl">Waar wil je mee verder?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`group rounded-2xl border p-5 transition-all hover:-translate-y-1 ${
                action.accent
                  ? "border-lime/50 bg-lime/10 hover:border-lime hover:shadow-[0_0_30px_rgba(204,255,0,0.2)]"
                  : "border-jade/20 bg-gradient-to-br from-jade/10 to-transparent hover:border-jade/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-extrabold">{action.title}</h3>
                <span aria-hidden="true" className="text-jade transition-transform group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-1 text-sm text-paper/60">{action.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-jade/20 border-l-4 border-l-jade bg-jade/5 p-5">
          <h2 className="font-display text-lg font-extrabold text-jade">Tip van de dag</h2>
          <p className="mt-2 text-paper/70">{tip}</p>
        </div>
        <div className="rounded-2xl border border-jade/20 bg-gradient-to-br from-jade/10 to-transparent p-5">
          <h2 className="font-display text-lg font-extrabold">Jouw pakket</h2>
          <p className="mt-2 text-paper/70">Bekijk of wijzig je pakket of koop extra oefentijd.</p>
          <Link href="/instellingen" className="mt-4 inline-block rounded-full border border-paper/30 px-5 py-2 text-sm font-bold transition-colors hover:border-jade hover:bg-jade hover:text-ink">
            Pakket beheren
          </Link>
        </div>
      </section>
    </div>
  );
}