import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { z } from "zod";
import { invitationAccess, invitationAuthError, invitationExpiry, invitationSchema, inviteStudent } from "../../../../lib/admin-users";
import { deleteStudent } from "../../../../lib/delete-student";

async function authorize(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return { response: Response.json({ error: "Ongeldige herkomst." }, { status: 403 }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url || !anonKey || !serviceKey) {
    return { response: Response.json({ error: "Server niet ingesteld: controleer de Supabase-instellingen." }, { status: 503 }) };
  }
  const cookieStore = await cookies();
  const session = createServerClient(url, anonKey, { cookies: {
    getAll: () => cookieStore.getAll(),
    setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
  } });
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return { response: Response.json({ error: "Log in als beheerder." }, { status: 401 }) };
  const { data: admin, error: adminError } = await session.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError) {
    console.error("Beheerderscontrole mislukt:", adminError.message);
    return { response: Response.json({ error: "Beheerderscontrole mislukt." }, { status: 500 }) };
  }
  if (!admin) return { response: Response.json({ error: "Geen toegang." }, { status: 403 }) };
  return { session, user, url, serviceKey, siteUrl };
}

export async function POST(request: Request) {
  const authorization = await authorize(request);
  if ("response" in authorization) return authorization.response;
  const { session, url, serviceKey, siteUrl } = authorization;
  if (!siteUrl) return Response.json({ error: "Server niet ingesteld: controleer NEXT_PUBLIC_SITE_URL." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 }); }
  const parsed = invitationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Vul een geldig e-mailadres en pakket (START, BOOST of MAX) in." }, { status: 400 });
  const expiresAt = invitationExpiry(parsed.data);
  if (new Date(expiresAt).getTime() <= Date.now()) return Response.json({ error: "Kies een toekomstige einddatum." }, { status: 400 });
  const { error: directoryError } = await session.rpc("admin_user_directory").limit(1);
  if (directoryError) {
    console.error("Gebruikersbeheer is niet beschikbaar:", directoryError.message);
    return Response.json({ error: "Gebruikersbeheer is niet beschikbaar. Controleer of de migratie is toegepast." }, { status: 503 });
  }
  const { data: selectedPackage, error: packageError } = await session.from("packages")
    .select("id,name,is_active").ilike("name", parsed.data.pakket).maybeSingle();
  if (packageError) {
    console.error("Pakket ophalen mislukt:", packageError.message);
    const message = packageError.code === "PGRST116" ? "Dit pakket komt meerdere keren voor. Controleer de pakketten in Supabase." : "Pakket controleren mislukt.";
    return Response.json({ error: message }, { status: 500 });
  }
  if (!selectedPackage || selectedPackage.is_active === false || !selectedPackage.name.trim()) {
    return Response.json({ error: "Kies een geldig actief pakket." }, { status: 400 });
  }
  let redirectTo: string;
  try { redirectTo = new URL("/uitnodiging", siteUrl).toString(); } catch { return Response.json({ error: "NEXT_PUBLIC_SITE_URL is ongeldig." }, { status: 503 }); }
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let invitation;
  try {
    invitation = await inviteStudent(service, parsed.data, redirectTo);
  } catch (error) {
    console.error("Uitnodigingsverzoek mislukt:", error);
    return Response.json({ error: "Het uitnodigingsverzoek is mislukt. De mail kan al verstuurd zijn; controleer het account in Supabase voordat je opnieuw uitnodigt." }, { status: 502 });
  }
  const { data, error } = invitation;
  if (error) {
    console.error("Uitnodigen mislukt:", error.message);
    const result = invitationAuthError(error.code);
    return Response.json({ error: result.error }, { status: result.status });
  }
  if (!data.user) {
    console.error("Uitnodigen mislukt: geen gebruiker ontvangen");
    return Response.json({ error: "Geen bevestiging van de uitnodiging ontvangen. Controleer het account in Supabase voordat je opnieuw uitnodigt." }, { status: 502 });
  }
  try {
    const { error: saveError } = await session.rpc("admin_save_user", invitationAccess(parsed.data, data.user.id, selectedPackage.id, expiresAt));
    if (saveError) throw saveError;
  } catch (error) {
    console.error("Profiel aanmaken mislukt:", error, "Account:", data.user.id);
    return Response.json({ error: "De uitnodiging is verstuurd, maar opslaan van het profiel, de pakkettoegang en de mutatielog is mislukt of kon niet worden bevestigd. Controleer dit account handmatig in Supabase voordat je opnieuw uitnodigt." }, { status: 500 });
  }
  return Response.json({ message: `Uitnodiging verstuurd en toegang tot ${selectedPackage.name} toegekend.` });
}

export async function DELETE(request: Request) {
  const authorization = await authorize(request);
  if ("response" in authorization) return authorization.response;
  const { user, url, serviceKey } = authorization;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 }); }
  const parsed = z.object({ userId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "Ongeldige gebruiker." }, { status: 400 });
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await deleteStudent(service, user.id, parsed.data.userId);
  return Response.json(result.error ? { error: result.error } : { message: result.message }, { status: result.status });
}
