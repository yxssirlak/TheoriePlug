"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Notification from "../../components/ui/Notification";
import { validInvitationPassword } from "../../lib/admin-users";
import { activateInvitation, clearInvitation } from "../../lib/invitation-session";

export default function InvitationPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [error, setError] = useState<string | null>(null);
  const client = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const initialization = useRef<Promise<string> | null>(null);
  const invitedUser = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!initialization.current) {
      client.current = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { isSingleton: false, auth: { detectSessionInUrl: false } },
      );
      const url = new URL(window.location.href);
      initialization.current = activateInvitation(client.current, url, window.sessionStorage);
      if (url.hash || url.searchParams.has("error") || url.searchParams.has("error_code")) window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    initialization.current.then((userId) => {
      if (active) { invitedUser.current = userId; setState("ready"); }
    }).catch((failure: unknown) => {
      if (active) { setState("invalid"); setError(failure instanceof Error ? failure.message : "Uitnodiging controleren mislukt. Probeer het later opnieuw."); }
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || state !== "ready" || !client.current || !invitedUser.current) return;
    if (!validInvitationPassword(password) || password !== confirmation) {
      setError("Gebruik minimaal 8 tekens, één letter en één cijfer en vul beide wachtwoorden gelijk in.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data, error: authError } = await client.current.auth.getUser();
      if (authError || !data.user || data.user.id !== invitedUser.current) {
        clearInvitation(window.sessionStorage);
        setState("invalid");
        setError("De uitnodigingssessie is verlopen of veranderd. Neem contact op met de beheerder.");
        return;
      }
      const { error: updateError } = await client.current.auth.updateUser({ password });
      if (updateError) {
        setError(`Wachtwoord instellen mislukt: ${updateError.message}`);
        return;
      }
      clearInvitation(window.sessionStorage);
      setPassword(""); setConfirmation(""); setState("done");
    } catch (failure) {
      setError(failure instanceof Error ? `Wachtwoord instellen mislukt: ${failure.message}` : "Wachtwoord instellen mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-md px-4 py-16 text-paper">
    {error && <Notification onDismiss={() => setError(null)}>{error}</Notification>}
    <h1 className="font-display text-2xl font-bold text-lime">Account activeren</h1>
    {state === "checking" && <p className="mt-4">Uitnodiging controleren...</p>}
    {state === "invalid" && <p className="mt-4 text-paper/70">De uitnodiging kon niet worden gecontroleerd. Neem contact op met de beheerder.</p>}
    {state === "done" && <p className="mt-4">Je wachtwoord is ingesteld en je bent ingelogd. <Link className="text-lime underline" href="/dashboard">Naar het platform</Link></p>}
    {state === "ready" && <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-surface p-6">
      <p className="text-sm text-paper/70">Kies een wachtwoord met minimaal 8 tekens, één letter en één cijfer.</p>
      <label className="block text-sm">Nieuw wachtwoord<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-surface-raised p-3" /></label>
      <label className="block text-sm">Herhaal wachtwoord<input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-surface-raised p-3" /></label>
      <button disabled={busy} className="rounded-full bg-lime px-5 py-2 font-bold text-ink disabled:opacity-50">{busy ? "Opslaan..." : "Wachtwoord instellen"}</button>
    </form>}
  </main>;
}
