"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (!email.trim() || !password) {
      setError("Vul je e-mailadres en wachtwoord in.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        setError("Je e-mailadres of wachtwoord klopt niet.");
        setLoading(false);
        return;
      }

      const { data: admin } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!admin) {
        await supabase.auth.signOut();
        setError("Dit account heeft geen toegang tot het beheerportaal.");
        setLoading(false);
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Er ging iets mis. Probeer het later opnieuw.");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-paper/15 bg-white/5 px-4 py-3 text-base text-paper placeholder:text-paper/30 outline-none transition-all hover:border-lime/50 focus:border-lime focus:bg-white/10 focus:ring-2 focus:ring-lime/30";

  return (
    <main className="auth-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-paper">
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image src="/brand/png/svg/logo.svg" alt="TheoriePlug" width={582} height={61} priority className="h-9 w-auto" />
        </div>

        <div className="rounded-3xl border border-lime/20 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8">
          <span className="inline-block rounded-full bg-lime px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink">
            Beheer
          </span>
          <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">
            Beheer<span className="text-lime">portaal</span>
          </h1>
          <p className="mt-2 text-paper/60">Alleen voor medewerkers van TheoriePlug.</p>

          {error && (
            <div role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-paper/80">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-paper/80">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-lg font-bold text-ink transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? "Bezig met inloggen..." : "Inloggen"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
