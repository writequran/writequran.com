import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — WriteQuran',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 font-sans text-neutral-800 dark:text-neutral-100">
      <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mb-8 inline-block">← Back to WriteQuran</Link>
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-xs text-neutral-400 mb-8">Last updated: March 2025</p>

      <section className="space-y-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">What we collect</h2>
          <p>When you create an account, we store your email address and a hashed password through Supabase Auth. We also store your typing progress, mistake statistics, and preferences so you can resume across devices.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">What we do not collect</h2>
          <p>We do not collect your name, location, payment information, or any other personal information. We do not use advertising trackers or third-party analytics.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Anonymous use</h2>
          <p>You can use WriteQuran without creating an account. In that case, all data is stored locally in your browser only and never sent to our servers.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Data storage</h2>
          <p>Account data is stored in Supabase (PostgreSQL). Each user's data is isolated and protected by Row Level Security policies — no user can access another user's data.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Data deletion</h2>
          <p>You may request deletion of your account and all associated data at any time by contacting us at <a href="mailto:support@writequran.com" className="text-[#D6C19E] hover:text-[#c2ad8a]">support@writequran.com</a>.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Cookies</h2>
          <p>We use a single HTTP-only authentication cookie to maintain your session. No advertising or tracking cookies are used.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Changes</h2>
          <p>If this policy changes materially, we will update the date above. Continued use of WriteQuran constitutes acceptance of any updates.</p>
        </div>
      </section>
    </main>
  );
}
