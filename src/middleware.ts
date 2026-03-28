import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // ── Auth code interception ───────────────────────────────────────────────────
  // Supabase sometimes redirects to the Site URL root (?code=...) instead of
  // /auth/callback — this happens when the redirect_to URL fails validation and
  // Supabase falls back to the configured Site URL.
  //
  // If a request arrives with ?code= anywhere EXCEPT /auth/callback, forward it
  // there so the recovery/confirmation flow can complete correctly.
  const code = searchParams.get('code')
  if (code && pathname !== '/auth/callback') {
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code)
    // Forward any other params that Supabase may have included
    searchParams.forEach((value, key) => {
      if (key !== 'code') callbackUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(callbackUrl)
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
