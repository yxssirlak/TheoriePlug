"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase";
import GlassDatePicker from "../../../components/dashboard/GlassDatePicker";
import Notification from "../../../components/ui/Notification";
import AuthenticatedPage from "../../../components/dashboard/AuthenticatedPage";
import PageSkeleton from "../../../components/ui/PageSkeleton";

export default function SettingsPage() {
  return <AuthenticatedPage><SettingsContent /></AuthenticatedPage>;
}

function SettingsContent() {
  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  // Haal de huidige gegevens op bij het laden van de pagina
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata;
        setName(meta?.first_name || meta?.full_name || meta?.name || "");
        setExamDate(meta?.exam_date || "");
      }
      setInitialLoad(false);
    };
    fetchUserData();
  }, [supabase]);

  // Formulier opslaan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Geen actieve gebruiker gevonden.");

      // 1. Update Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          first_name: name.trim(),
          exam_date: examDate || null,
        },
      });
      if (authError) throw new Error(authError.message);

      // 2. Update profiles tabel
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: name.trim(),
          exam_date: examDate || null,
        })
        .eq("id", user.id);
      if (profileError) throw new Error(`Accountgegevens zijn bijgewerkt, maar het profiel niet: ${profileError.message}`);

      setMessage({ type: "success", text: "Je gegevens zijn succesvol bijgewerkt!" });
    } catch (error) {
      console.error("Fout bij updaten:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Er ging iets mis bij het opslaan. Probeer het opnieuw." });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return <PageSkeleton kind="settings" />;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Instellingen</h1>
        <p className="mt-2 text-paper/60">Beheer je account, pakket en persoonlijke gegevens.</p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-surface shadow-lg transition-all">
        <div className="border-b border-paper/5 bg-white/[0.02] px-6 py-5">
          <h2 className="font-display text-xl font-extrabold">Persoonlijke gegevens</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {message && <Notification type={message.type} onDismiss={() => setMessage(null)}>{message.text}</Notification>}

          <div>
            <label htmlFor="name" className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-paper/50">
              Hoe mogen we je noemen?
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-3 font-semibold text-paper transition-colors focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime"
            />
          </div>

          <div>
            <label className="mb-1.5 ml-1 block text-xs font-bold uppercase tracking-wider text-paper/50">
              Examendatum <span className="font-medium normal-case text-paper/40">(optioneel)</span>
            </label>
            <GlassDatePicker 
              value={examDate} 
              onChange={(date) => setExamDate(date)} 
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full sm:w-auto rounded-xl bg-lime px-8 py-3.5 font-display text-sm font-extrabold uppercase tracking-widest text-ink transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Opslaan..." : "Wijzigingen opslaan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}