"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OPEN_CONSENT_EVENT, readConsent, saveConsent } from "../lib/consent";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState(true);

  useEffect(() => {
    const consent = readConsent();
    if (!consent) {
      setOpen(true);
    } else {
      setPreferences(consent.preferences);
    }

    const reopen = () => {
      setPreferences(readConsent()?.preferences ?? true);
      setShowSettings(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const choose = (allowPreferences: boolean) => {
    saveConsent(allowPreferences);
    setOpen(false);
    setShowSettings(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label="Cookie-instellingen"
          initial={{ y: 40, opacity: 0, rotate: -1 }}
          animate={{ y: 0, opacity: 1, rotate: -1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed bottom-3 right-3 z-[200] w-[calc(100%-1.5rem)] max-w-sm rounded-[1.25rem] bg-lime p-4 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:bottom-6 sm:right-6 sm:w-[26rem] sm:p-4"
        >
          <h2 className="font-display text-lg font-extrabold leading-tight">
            Even over cookies
          </h2>
          <p className="mt-1.5 text-sm font-medium">
            We gebruiken cookies om onze site sneller en beter voor jou te maken.
          </p>

          {showSettings && (
            <div className="mt-4 space-y-3 rounded-2xl bg-ink/10 p-4 text-sm font-medium">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">Noodzakelijk</p>
                  <p className="opacity-75">Onthoudt je cookiekeuze. Altijd aan.</p>
                </div>
                <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-lime">Aan</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">Voorkeuren</p>
                  <p className="opacity-75">Onthoudt bijvoorbeeld dat je de kaarten gezien hebt.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences}
                  aria-label="Voorkeuren"
                  onClick={() => setPreferences((value) => !value)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    preferences ? "bg-ink" : "bg-ink/30"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full transition-all ${
                      preferences ? "left-6 bg-lime" : "left-1 bg-paper"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {showSettings ? (
              <button
                type="button"
                onClick={() => choose(preferences)}
                className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-bold text-lime transition-transform hover:scale-105"
              >
                Keuze opslaan
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => choose(true)}
                  className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-bold text-lime transition-transform hover:scale-105"
                >
                  Alles accepteren
                </button>
                <button
                  type="button"
                  onClick={() => choose(false)}
                  className="rounded-full border-2 border-ink px-3.5 py-2 text-[13px] font-bold transition-colors hover:bg-ink hover:text-lime"
                >
                  Alleen noodzakelijk
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="px-2 py-2 text-sm font-bold underline underline-offset-4"
                >
                  Instellen
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
