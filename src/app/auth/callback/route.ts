import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Auth Callback Route
 *
 * PRIMARY path — official {{ .ConfirmationURL }} flow:
 *   Supabase verifies the user on their end, then redirects here with ?code=xxx
 *   We call exchangeCodeForSession(code) to create the browser session.
 *   emailRedirectTo in signUp() must point to this route.
 *
 * FALLBACK path — token_hash flow:
 *   /auth/callback?token_hash=xxx&type=email
 *   Used if email templates are configured with token_hash format.
 *   verifyOtp confirms the user; user then signs in manually.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    || new URL(request.url).origin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[auth/callback] Incoming:', {
    has_code: !!code,
    has_token_hash: !!token_hash,
    token_hash_length: token_hash?.length ?? 0,
    type,
    has_supabase_url: !!supabaseUrl,
    has_supabase_key: !!supabaseKey,
    site_url: siteUrl,
  })

  if (!supabaseUrl || !supabaseKey) {
    console.error('[auth/callback] MISSING Supabase env vars')
    return NextResponse.redirect(`${siteUrl}/?auth_error=confirmation_failed`)
  }

  const cookiesToSet: Array<{ name: string; value: string; options: object }> = []
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) =>
        cookiesToSet.push({ name, value, options })
      ),
    },
  })

  const buildRedirect = (path: string) => {
    const res = NextResponse.redirect(`${siteUrl}${path}`)
    cookiesToSet.forEach(({ name, value, options }) => {
      res.cookies.set({ name, value, ...options } as any)
    })
    return res
  }

  // ── PRIMARY: code flow (official {{ .ConfirmationURL }} → redirect_to) ────────
  // Supabase verifies the email on their side, then bounces the user here with ?code=
  // We exchange it for a real session and set the auth cookie on the response.
  if (code) {
    console.log('[auth/callback] PRIMARY path: exchangeCodeForSession')

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession FAILED:', {
        error_message: error.message,
        error_status: error.status,
        error_code: (error as any).code ?? 'unknown',
      })
      return NextResponse.redirect(`${siteUrl}/?auth_error=confirmation_failed`)
    }

    console.log('[auth/callback] exchangeCodeForSession SUCCEEDED | user:', data.user?.id)
    console.log('[auth/callback] Session cookies written:', cookiesToSet.map(c => c.name))
    return buildRedirect(next)
  }

  // ── FALLBACK: token_hash flow ─────────────────────────────────────────────────
  // Used only if the email template is configured with token_hash format.
  // Uses plain JS client — no cookie management needed.
  // User will be confirmed in Supabase and then signs in manually.
  if (token_hash && type) {
    console.log('[auth/callback] FALLBACK path: verifyOtp | type:', type)

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (error) {
      console.error('[auth/callback] verifyOtp FAILED:', {
        error_message: error.message,
        error_status: error.status,
        error_code: (error as any).code ?? 'unknown',
      })
      return NextResponse.redirect(`${siteUrl}/?auth_error=confirmation_failed`)
    }

    console.log('[auth/callback] verifyOtp SUCCEEDED | user confirmed:', data.user?.id)
    console.log('[auth/callback] Session cookies written:', cookiesToSet.map(c => c.name))
    return buildRedirect(next)
  }

  // ── Neither param present ─────────────────────────────────────────────────────
  console.error('[auth/callback] No code or token_hash. Params:', Object.fromEntries(searchParams))
  return NextResponse.redirect(`${siteUrl}/?auth_error=confirmation_failed`)
}
