import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkoutSchema } from "../../../lib/checkout-schema";
import { getPackage } from "../../../lib/packages";

// De mock-betaling geeft direct toegang. In productie staat hij daarom standaard uit
// totdat CHECKOUT_MOCK=true expliciet is gezet; met Mollie vervang je deze route.
const mockEnabled = () => process.env.NODE_ENV !== "production" || process.env.CHECKOUT_MOCK === "true";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  if (!mockEnabled()) {
    return NextResponse.json({ error: "Betalen is nog niet beschikbaar." }, { status: 503 });
  }

  const supabase = adminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server is niet volledig ingesteld (SUPABASE_SERVICE_ROLE_KEY ontbreekt)." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ongeldige gegevens." }, { status: 400 });
  }

  const input = parsed.data;
  const pkg = getPackage(input.packageSlug);
  if (!pkg) {
    return NextResponse.json({ error: "Dit pakket bestaat niet." }, { status: 400 });
  }

  // 1. Gebruiker aanmaken via Supabase Auth
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const exists = createError?.code === "email_exists" || /already|registered/i.test(createError?.message ?? "");
    return NextResponse.json(
      { error: exists ? "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan." : "Account aanmaken is mislukt." },
      { status: exists ? 409 : 500 },
    );
  }

  const userId = created.user.id;

  // Bij een fout na het aanmaken ruimen we het account op, zodat de klant het opnieuw kan proberen.
  const rollback = async (message: string) => {
    await supabase.from("user_access").delete().eq("user_id", userId);
    await supabase.from("orders").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: message }, { status: 500 });
  };

  // 2. Order opslaan als 'pending'
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      package_slug: pkg.slug,
      amount_cents: pkg.priceCents,
      payment_method: input.paymentMethod,
      status: "pending",
      marketing_opt_in: input.marketingOptIn,
      provider: "mock",
    })
    .select("id")
    .single();

  if (orderError || !order) return rollback("Bestelling opslaan is mislukt.");

  // 3. Mock-betaling: meteen 'paid'. Met Mollie gebeurt dit pas in de webhook.
  const { error: paidError } = await supabase
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), provider_payment_id: `mock_${order.id}` })
    .eq("id", order.id);
  if (paidError) return rollback("Betaling verwerken is mislukt.");

  // 4. Toegang verlenen (profile + package + user_access)
  await supabase.from("profiles").upsert({ id: userId });

  let packageRowId: string | undefined;
  const { data: existing } = await supabase.from("packages").select("id").eq("name", pkg.name).maybeSingle();
  packageRowId = existing?.id;
  if (!packageRowId) {
    const { data: inserted } = await supabase
      .from("packages")
      .insert({ name: pkg.name, duration_days: pkg.durationDays, price_cents: pkg.priceCents })
      .select("id")
      .single();
    packageRowId = inserted?.id;
  }
  if (!packageRowId) return rollback("Pakket koppelen is mislukt.");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + pkg.durationDays);

  const { error: accessError } = await supabase.from("user_access").insert({
    user_id: userId,
    package_id: packageRowId,
    payment_status: "paid",
    expires_at: expiresAt.toISOString(),
  });
  if (accessError) return rollback("Toegang verlenen is mislukt.");

  return NextResponse.json({ orderId: order.id, redirectUrl: "/dashboard?success=true" });
}
