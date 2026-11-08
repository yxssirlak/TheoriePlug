import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const STUDENT_PACKAGES = { START: 7, BOOST: 14, MAX: 31 } as const;
export type StudentPackage = keyof typeof STUDENT_PACKAGES;

export const invitationSchema = z.object({
  email: z.string().trim().email().max(254),
  pakket: z.enum(["START", "BOOST", "MAX"]),
  firstName: z.string().trim().max(100).default(""),
  lastName: z.string().trim().max(100).default(""),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export type Invitation = z.infer<typeof invitationSchema>;

export function invitationMetadata(input: Invitation) {
  return { first_name: input.firstName, last_name: input.lastName, pakket: input.pakket };
}

export function inviteStudent(client: SupabaseClient, input: Invitation, redirectTo: string) {
  return client.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: invitationMetadata(input),
  });
}

export function invitationExpiry(input: Invitation, now = Date.now()): string {
  return input.expiresAt ?? new Date(now + STUDENT_PACKAGES[input.pakket] * 86400000).toISOString();
}

export function invitationAuthError(code?: string): { error: string; status: number } {
  if (code === "email_exists" || code === "user_already_exists") {
    return { error: "Er bestaat al een account met dit e-mailadres.", status: 409 };
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return { error: "Te veel uitnodigingen verstuurd. Probeer het later opnieuw.", status: 429 };
  }
  return { error: "Uitnodiging versturen mislukt. Controleer de e-mailinstellingen of probeer later opnieuw.", status: 502 };
}

export function invitationAccess(input: Invitation, userId: string, packageId: string, expiresAt: string) {
  return {
    p_user_id: userId, p_first_name: input.firstName, p_last_name: input.lastName,
    p_invited: true, p_package_id: packageId, p_payment_status: "paid", p_expires_at: expiresAt,
  };
}

export function localDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function expiryForSave(value: string, previous?: string): string {
  if (previous && value === localDateTime(previous)) return previous;
  return new Date(value).toISOString();
}

export function validInvitationPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
