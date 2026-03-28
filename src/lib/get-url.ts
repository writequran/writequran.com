/**
 * getURL()
 *
 * Returns the correct site base URL for auth email redirects.
 *
 * - In production: uses NEXT_PUBLIC_SITE_URL (set in Netlify env vars)
 * - In local development: falls back to http://localhost:3000
 *
 * This prevents production auth emails from pointing to localhost,
 * and local dev emails from pointing to writequran.com.
 */
export function getURL(): string {
  // Runtime env var wins (set in Netlify / Vercel / any host)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (siteUrl) {
    // Strip trailing slash for clean concatenation
    return siteUrl.replace(/\/$/, '')
  }

  // In the browser, use window.location.origin as a local dev fallback
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // SSR fallback (should not be reached for client components)
  return 'http://localhost:3000'
}
