'use client';

import { Analytics } from '@vercel/analytics/react';

/**
 * A wrapper component for Vercel Analytics.
 * In Next.js 16 App Router, this should be imported and placed in the root layout.
 * 
 * Note: To enable, add <AnalyticsWrapper /> to src/app/layout.tsx
 */
export default function AnalyticsWrapper() {
  return <Analytics />;
}