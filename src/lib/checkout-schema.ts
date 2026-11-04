import { z } from "zod";

export const PAYMENT_METHODS = ["ideal", "card"] as const;

export const checkoutSchema = z.object({
  packageSlug: z.string().min(1),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Kies een betaalmethode." }),
  email: z
    .string()
    .trim()
    .min(1, "Vul je e-mailadres in.")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Vul een geldig e-mailadres in."),
  password: z
    .string()
    .min(1, "Kies een wachtwoord.")
    .min(8, "Wachtwoord moet minimaal 8 tekens bevatten.")
    .regex(/[A-Za-z]/, "Gebruik minstens één letter.")
    .regex(/\d/, "Gebruik minstens één cijfer."),
  marketingOptIn: z.boolean(),
  acceptTerms: z.boolean().refine((value) => value, "Ga akkoord met de voorwaarden om verder te gaan."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
