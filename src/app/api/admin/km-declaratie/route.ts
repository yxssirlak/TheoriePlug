import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { calculateDrivingDistance } from "../../../../lib/kilometer-routing";

const requestSchema = z.object({
  start: z.string().trim().min(3).max(250),
  destination: z.string().trim().min(3).max(250),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Ongeldige herkomst." }, { status: 403 });
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Log in als beheerder." }, { status: 401 });
  const { data: admin, error: adminError } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError) {
    console.error("Beheerderscontrole mislukt:", adminError.message);
    return Response.json({ error: "Beheerderscontrole mislukt." }, { status: 500 });
  }
  if (!admin) return Response.json({ error: "Geen toegang." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Vul twee geldige adressen in (3 tot 250 tekens)." }, { status: 400 });

  try {
    return Response.json(await calculateDrivingDistance(parsed.data.start, parsed.data.destination));
  } catch (error) {
    console.error("Routeberekening mislukt:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Routeberekening mislukt." }, { status: 502 });
  }
}
