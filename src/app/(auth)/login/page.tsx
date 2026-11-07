"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import Notification from "../../../components/ui/Notification";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type FieldErrors = { email?: string; password?: string };

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) errors.email = "Vul je e-mailadres in.";
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = "Vul een geldig e-mailadres in.";

  if (!password) errors.password = "Vul je wachtwoord in.";
  else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens bevatten.`;
  }

  return errors;
}

function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "Je e-mailadres of wachtwoord klopt niet. Probeer het nog eens.";
  }
  if (message.includes("Email not confirmed")) {
    return "Je e-mailadres is nog niet bevestigd. Check je mailbox (ook je spam) voor de bevestigingslink.";
  }
  return `Er ging iets mis bij het inloggen: ${message}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setFormError(null);
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError(mapAuthError(error.message));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? mapAuthError(error.message) : "Er ging iets mis. Probeer het later opnieuw."
      );
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white/5 px-4 py-3 text-base text-paper placeholder:text-paper/30 outline-none transition-all focus:bg-white/10 focus:ring-2 ${
      hasError
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
        : "border-paper/15 hover:border-jade/50 focus:border-jade focus:ring-jade/30"
    }`;

  return (
    <main className="auth-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-paper">

      <div className="relative w-full max-w-md">
        <Link href="/" aria-label="Naar de homepage" className="mb-8 flex justify-center">
          <Image
            src="/brand/png/svg/logo.svg"
            alt="TheoriePlug"
            width={582}
            height={61}
            priority
            className="h-9 w-auto transition-transform hover:scale-105"
          />
        </Link>

        <div className="rounded-3xl border border-jade/20 bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur sm:p-8">
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
            Welkom <span className="text-lime">terug</span>
          </h1>
          <p className="mt-2 text-paper/60">Log in en ga verder met je theorie.</p>

          {formError && <Notification onDismiss={() => setFormError(null)}>{formError}</Notification>}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-paper/80">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="naam@voorbeeld.nl"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={inputClass(Boolean(fieldErrors.email))}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-sm text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-paper/80">
                  Wachtwoord
                </label>
                <Link
                  href="/wachtwoord-vergeten"
                  className="text-sm font-semibold text-lime/80 transition-colors hover:text-lime"
                >
                  Wachtwoord vergeten?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Je wachtwoord"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={`${inputClass(Boolean(fieldErrors.password))} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-semibold text-paper/60 transition-colors hover:bg-paper/10 hover:text-lime"
                >
                  {showPassword ? "Verberg" : "Toon"}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-sm text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-3.5 text-lg font-bold text-ink transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(204,255,0,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin rounded-full border-2 border-ink/30 border-t-ink"
                  />
                  Bezig met inloggen...
                </>
              ) : (
                "Inloggen"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-paper/60">
          Nog geen account?{" "}
          <Link href="/registreer" className="font-bold text-lime hover:underline">
            Registreer je hier
          </Link>
        </p>
      </div>
    </main>
  );
}
