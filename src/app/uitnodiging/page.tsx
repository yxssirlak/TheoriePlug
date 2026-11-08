"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import Notification from "../../components/ui/Notification";
import { validInvitationPassword } from "../../lib/admin-users";
import { activateInvitation, clearInvitation } from "../../lib/invitation-session";

function PasswordVisibilityButton({ visible, onToggle, field }: { visible: boolean; onToggle: () => void; field: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${visible ? "Verberg" : "Toon"} ${field}`}
      aria-pressed={visible}
      className="absolute inset-y-0 right-1 flex w-12 items-center justify-center rounded-lg text-paper/60 transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-lime"
    >
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {visible && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}

export default function InvitationPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  const inputClass = "w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-3 text-base text-paper placeholder:text-paper/30 outline-none transition-all hover:border-white/20 focus:border-lime focus:ring-2 focus:ring-lime/30";
  const buttonClass = "flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-lg font-bold text-ink transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

  return (
    <main className="auth-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-paper">
      {error && <Notification onDismiss={() => setError(null)}>{error}</Notification>}
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-9 w-auto max-w-full" />
        </div>
        <div className="rounded-3xl border border-white/10 bg-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-8">
          <span className="inline-block rounded-full bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink">
            Uitnodiging
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
            Account <span className="text-lime">activeren</span>
          </h1>
          {state === "checking" && <p className="mt-3 text-paper/60" role="status">Uitnodiging controleren...</p>}
          {state === "invalid" && <p className="mt-3 text-paper/60">De uitnodiging kon niet worden gecontroleerd. Neem contact op met de beheerder.</p>}
          {state === "done" && (
            <div className="mt-3">
              <p className="text-paper/60">Je wachtwoord is ingesteld en je bent ingelogd. Je kunt nu aan de slag!</p>
              <Link className={`${buttonClass} mt-6`} href="/dashboard">Naar het platform</Link>
            </div>
          )}
          {state === "ready" && (
            <>
              <p className="mt-2 text-paper/60">Kies een wachtwoord om toegang te krijgen tot jouw leeromgeving.</p>
              <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-paper/80">Nieuw wachtwoord</label>
                  <div className="relative">
                    <input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kies een wachtwoord" className={`${inputClass} pr-14`} aria-describedby="password-hint" />
                    <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((value) => !value)} field="nieuw wachtwoord" />
                  </div>
                  <p id="password-hint" className="mt-2 text-sm text-paper/50">Minimaal 8 tekens, één letter en één cijfer.</p>
                </div>
                <div>
                  <label htmlFor="confirmation" className="mb-2 block text-sm font-semibold text-paper/80">Herhaal wachtwoord</label>
                  <div className="relative">
                    <input id="confirmation" type={showConfirmation ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="Herhaal je wachtwoord" className={`${inputClass} pr-14`} />
                    <PasswordVisibilityButton visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} field="herhaald wachtwoord" />
                  </div>
                </div>
                <button disabled={busy} className={buttonClass}>{busy ? "Opslaan..." : "Wachtwoord instellen"}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
