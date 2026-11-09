"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "../../lib/supabase"; 
import GlassDatePicker from "./GlassDatePicker"; // Zorg dat het pad klopt met waar je hem hebt opgeslagen
import Notification from "../ui/Notification";

export default function WelcomeModal({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: (newName: string, examDate: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const checkMetadata = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata;
        const hasName = meta?.first_name || meta?.full_name || meta?.name;
        
        // Geen naam gevonden? Open de modal.
        if (!hasName) {
          setIsOpen(true);
        }
      }
    };
    checkMetadata();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setSaveError("");

    try {
      // 1. Sla op in Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          first_name: name.trim(),
          exam_date: examDate || null
        },
      });
      if (authError) throw new Error(authError.message);

      // 2. Werk profiles tabel bij
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          first_name: name.trim()
        })
        .eq("id", userId);
      if (profileError) throw new Error(`Je examendatum is opgeslagen, maar je profielnaam niet: ${profileError.message}`);

      // 3. Sluit modal en stuur de naam terug
      setIsOpen(false);
      onComplete(name.trim(), examDate || null);
    } catch (error) {
      console.error("Fout bij opslaan gegevens:", error);
      setSaveError(error instanceof Error ? error.message : "Opslaan is mislukt. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-surface shadow-[0_0_40px_rgba(0,0,0,0.8)]">
        <div className="p-8">
          
          <div className="mb-6 flex justify-center">
            <Image
              src="/brand/png/svg/sticker-welkom.svg"
              alt="Welkom"
              width={96}
              height={96}
              priority
              className="h-24 w-24 object-contain drop-shadow-lg"
            />
          </div>
          
          <h2 className="mb-2 text-center font-display text-2xl font-black uppercase tracking-wide text-paper">
            Welkom bij TheoriePlug!
          </h2>
          <p className="mb-8 text-center text-sm font-semibold text-paper/60">
            Voordat we starten met pluggen, hebben we nog wat korte info nodig.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Voornaam Input */}
            <div>
              <label htmlFor="firstName" className="mb-1 ml-1 block text-xs font-bold uppercase tracking-wider text-paper/50">
                Hoe mogen we je noemen?
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                placeholder="Jouw voornaam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-3 font-semibold text-paper placeholder:text-paper/30 focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
              />
            </div>

            {/* Examendatum Input met de nieuwe Glazen kalender */}
            <div>
              <label className="mb-1 ml-1 block text-xs font-bold uppercase tracking-wider text-paper/50">
                Examen al gepland? <span className="font-medium normal-case text-paper/40">(optioneel)</span>
              </label>
              <GlassDatePicker 
                value={examDate} 
                onChange={(date) => setExamDate(date)} 
              />
            </div>
            
            {saveError && <Notification onDismiss={() => setSaveError("")}>{saveError}</Notification>}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="mt-4 w-full rounded-xl bg-lime px-4 py-3 font-display text-sm font-extrabold uppercase tracking-widest text-ink transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Opslaan..." : "Start met leren"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}