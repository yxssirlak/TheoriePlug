"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "../../lib/supabase";
import { checkoutSchema, type CheckoutInput } from "../../lib/checkout-schema";
import Notification from "../../components/ui/Notification";

const METHODS = [
  { id: "ideal", label: "iDEAL | Wero", hint: "Betaal direct via je eigen bank", badge: "iDEAL" },
  { id: "card", label: "Creditcard", hint: "Visa, Mastercard en meer", badge: "Card" },
] as const;

const inputBase =
  "w-full rounded-xl border bg-white/5 px-4 py-3 text-base text-paper placeholder:text-paper/30 outline-none transition-all hover:border-jade/60 focus:border-lime focus:bg-white/10 focus:ring-2 focus:ring-lime/30";

type Props = { packageSlug: string; packageName: string; priceLabel: string };

export default function CheckoutForm({ packageSlug, packageName, priceLabel }: Props) {
  const router = useRouter();
  const [methodOpen, setMethodOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    defaultValues: {
      packageSlug,
      paymentMethod: "ideal",
      email: "",
      password: "",
      marketingOptIn: false,
      acceptTerms: false,
    },
  });

  const method = METHODS.find((m) => m.id === watch("paymentMethod")) ?? METHODS[0];
  const password = watch("password") ?? "";
  const strength = [password.length >= 8, /[A-Za-z]/.test(password), /\d/.test(password), password.length >= 12].filter(Boolean).length;

  const onSubmit = async (values: CheckoutInput) => {
    setServerError(null);
    setEmailTaken(false);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEmailTaken(response.status === 409);
        setServerError(data.error ?? "Er ging iets mis. Probeer het later opnieuw.");
        return;
      }

      // De API maakt het account aan; hier loggen we de klant direct in zodat het portaal opent.
      const { error } = await createClient().auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        router.push("/login");
        return;
      }
      router.push(data.redirectUrl ?? "/dashboard?success=true");
    } catch {
      setServerError("Geen verbinding. Controleer je internet en probeer het opnieuw.");
    }
  };

  const fieldClass = (hasError: boolean) => `${inputBase} ${hasError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-paper/15"}`;

  return (
    <section aria-label="Bestelling bevestigen" className="rounded-3xl border border-jade/25 bg-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-8">
     <h2 className="font-display text-center text-2xl font-extrabold sm:text-3xl">
        Laatste check<span className="text-lime"> <br /> plug je pakket</span>
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
        <input type="hidden" {...register("packageSlug")} />

        {/* BETAALMETHODE */}
        <div>
          <span id="method-label" className="mb-2 block text-sm font-semibold text-paper/70">
            Kies je betaalmethode
          </span>
          <div className={`overflow-hidden rounded-xl border transition-colors ${methodOpen ? "border-lime" : "border-paper/20 hover:border-jade/60"}`}>
            <button
              type="button"
              aria-expanded={methodOpen}
              aria-labelledby="method-label"
              onClick={() => setMethodOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 bg-white/5 px-4 py-3.5 text-left"
            >
              <span className="font-semibold">{method.label}</span>
              <span className="flex items-center gap-3">
                <span className="rounded-md bg-lime px-2 py-0.5 text-xs font-extrabold text-ink">{method.badge}</span>
                <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform duration-200 ${methodOpen ? "rotate-180" : ""}`} fill="none" aria-hidden="true">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            <div role="radiogroup" aria-labelledby="method-label" className={`grid transition-all duration-300 ease-in-out ${methodOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                {METHODS.map((m) => {
                  const selected = m.id === method.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={methodOpen ? 0 : -1}
                      onClick={() => {
                        setValue("paymentMethod", m.id, { shouldValidate: true });
                        setMethodOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 border-t border-paper/10 px-4 py-3 text-left transition-colors hover:bg-jade/10"
                    >
                      <span>
                        <span className="block font-semibold">{m.label}</span>
                        <span className="block text-sm text-paper/50">{m.hint}</span>
                      </span>
                      <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? "border-lime" : "border-paper/30"}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-lime" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ACCOUNT */}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-paper/80">
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="naam@voorbeeld.nl"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={fieldClass(Boolean(errors.email))}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-sm font-medium text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-paper/80">
            Wachtwoord
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minimaal 8 tekens, met letter en cijfer"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`${fieldClass(Boolean(errors.password))} pr-20`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
              className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 text-sm font-semibold text-paper/60 transition-colors hover:text-lime"
            >
              {showPassword ? "Verberg" : "Toon"}
            </button>
          </div>
          <div aria-hidden="true" className="mt-2 flex gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= strength ? (strength <= 2 ? "bg-red-400" : strength === 3 ? "bg-jade" : "bg-lime") : "bg-paper/10"
                }`}
              />
            ))}
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1.5 text-sm font-medium text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* AKKOORD */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-paper/70">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#ccff00]" {...register("marketingOptIn")} />
            Ja, ik wil e-mails met examentips en/of exclusieve aanbiedingen.
          </label>
          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-paper/70">
              <input
                type="checkbox"
                aria-invalid={Boolean(errors.acceptTerms)}
                aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#ccff00]"
                {...register("acceptTerms")}
              />
              <span>
                Ja, ik ga akkoord met de{" "}
                <Link href="/algemene-voorwaarden" target="_blank" className="underline hover:text-lime">
                  algemene voorwaarden
                </Link>{" "}
                en het{" "}
                <Link href="/privacybeleid" target="_blank" className="underline hover:text-lime">
                  privacybeleid
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms && (
              <p id="terms-error" role="alert" className="mt-1.5 text-sm font-medium text-red-400">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>
        </div>

        {serverError && (
          <Notification onDismiss={() => setServerError(null)}>
            {serverError}{" "}
            {emailTaken && (
              <Link href="/login" className="font-bold underline">
                Inloggen
              </Link>
            )}
          </Notification>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-8 py-3.5 text-lg font-bold text-ink shadow-[0_0_24px_rgba(204,255,0,0.25)] transition-all hover:scale-[1.02] hover:shadow-[0_0_34px_rgba(204,255,0,0.5)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:w-auto"
          >
            {isSubmitting && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />}
            {isSubmitting ? "Bezig met betalen..." : `Betalen & start direct · ${priceLabel}`}
          </button>
        </div>
        <p className="text-center text-xs text-paper/40">
          Je bestelt het {packageName}-pakket. Testmodus: er wordt nog niet echt afgeschreven.
        </p>
      </form>
    </section>
  );
}
