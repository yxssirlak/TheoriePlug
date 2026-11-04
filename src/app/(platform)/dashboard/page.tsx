"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "../../../components/dashboard/user-context";

const STATS = [
  { label: "Oefenexamens gemaakt", value: "0" },
  { label: "Gemiddelde score", value: "–" },
  { label: "Vragen geoefend", value: "0" },
  { label: "Dagen tot je examen", value: "–" },
];

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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("success") === "true") {
      setSuccess(true);
      window.history.replaceState(null, "", "/dashboard");
    }
  }, []);

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

      <section aria-label="Jouw cijfers" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-jade/20 bg-gradient-to-br from-jade/10 to-white/[0.02] p-4 sm:p-5">
            <p className="font-display text-3xl font-extrabold text-jade">{stat.value}</p>
            <p className="mt-1 text-sm text-paper/60">{stat.label}</p>
          </div>
        ))}
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
