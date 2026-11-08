import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Maak een initiële response aan
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Configureer de Supabase server client voor de middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Haal de huidige ingelogde gebruiker op
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- HIER BEPAAL JE WIE WAAR NAARTOE MAG ---
  const isPlatformRoute = request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/cursus')
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/registreer')

  const pathname = request.nextUrl.pathname

  // Coming soon-modus (Vercel env COMING_SOON=true): alleen admins zien de echte site
  if (process.env.COMING_SOON === 'true') {
    const isOpenPath =
      pathname.startsWith('/coming-soon') ||
      pathname.startsWith('/beheer') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/uitnodiging') ||
      pathname.startsWith('/api/admin/gebruikers') ||
      pathname.startsWith('/api/webhooks')

    if (!isOpenPath) {
      let isAdmin = false
      if (user) {
        const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
        isAdmin = Boolean(data)
      }
      if (!isAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/coming-soon'
        url.search = ''
        const rewrite = NextResponse.rewrite(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie))
        return rewrite
      }
    }
  }

  // Beheerportaal: alleen toegankelijk voor gebruikers in de admins-tabel
  if (pathname.startsWith('/beheer') || pathname.startsWith('/admin')) {
    const isAdminLogin = pathname.startsWith('/beheer/login')
    let isAdmin = false
    if (user) {
      const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
      isAdmin = Boolean(data)
    }

    if (!isAdmin && !isAdminLogin) {
      const url = request.nextUrl.clone()
      url.pathname = '/beheer/login'
      return NextResponse.redirect(url)
    }
    if (isAdmin && isAdminLogin) {
      const next = request.nextUrl.searchParams.get('next')
      const url = request.nextUrl.clone()
      url.pathname = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin'
      url.search = ''
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // 1. Niet ingelogd, maar probeert naar de cursus/dashboard te gaan? -> Stuur naar login
  if (!user && isPlatformRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Wel ingelogd, maar probeert naar login/registreer te gaan? -> Stuur naar dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// Geef aan op welke routes de middleware moet draaien (sla statische bestanden over)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|otf|woff|woff2|ttf|mp4|webm|glb|ico)$).*)',
  ],
}