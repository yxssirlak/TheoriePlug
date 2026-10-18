import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// We initialiseren Supabase met de Service Role Key voor Admin-rechten
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    // 1. Lees de data uit van de betaalprovider (bijv. Mollie of Stripe)
    const body = await request.json()
    const { email, firstName, packageId, durationDays, paymentStatus } = body

    // 2. Stop het proces als de betaling nog niet is afgerond
    if (paymentStatus !== 'paid') {
      return NextResponse.json({ message: 'Betaling (nog) niet succesvol' }, { status: 400 })
    }

    // 3. Maak geruisloos een nieuw account aan voor de klant
    // (We genereren een dummy wachtwoord; je kunt ze later een 'reset wachtwoord' link mailen)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: crypto.randomUUID(), // Genereer een veilig, tijdelijk wachtwoord
      email_confirm: true,
      user_metadata: { first_name: firstName }
    })

    if (authError) throw authError
    const userId = authData.user.id

    // 4. Bereken exact tot wanneer ze toegang hebben (huidige tijd + dagen van pakket)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)

    // 5. Koppel de aankoop en toegangstijd aan de gebruiker in je database
    const { error: accessError } = await supabaseAdmin
      .from('user_access')
      .insert({
        user_id: userId,
        package_id: packageId,
        payment_status: 'paid',
        expires_at: expiresAt.toISOString(),
      })

    if (accessError) throw accessError

    // 6. Succes! De webhook is klaar.
    return NextResponse.json({ message: 'Account aangemaakt en toegang verleend!' }, { status: 200 })

  } catch (error: any) {
    console.error('Webhook Error:', error.message)
    return NextResponse.json({ error: 'Interne serverfout' }, { status: 500 })
  }
}