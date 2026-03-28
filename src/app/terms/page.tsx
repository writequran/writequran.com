import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use — WriteQuran',
};

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 font-sans text-neutral-800 dark:text-neutral-100">
      <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mb-8 inline-block">← Back to WriteQuran</Link>
      <h1 className="text-2xl font-bold mb-2">Terms of Use</h1>
      <p className="text-xs text-neutral-400 mb-8">Last updated: March 2025</p>

      <section className="space-y-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Use of the service</h2>
          <p>WriteQuran is a free tool for practicing the memorization of the Qur'an. You may use it for personal, educational, and non-commercial purposes. Please use it with respect for the Qur'an and other users.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Accounts</h2>
          <p>You are responsible for keeping your login credentials secure. Do not share your account with others.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Qur'anic text</h2>
          <p>The Qur'anic text used in this application is sourced from publicly available Uthmani script datasets. It is displayed for worship and learning purposes only.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Availability</h2>
          <p>We make no guarantees about uptime or availability. The service is provided as-is. We reserve the right to modify or discontinue the service at any time.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Prohibited use</h2>
          <p>You may not attempt to abuse, scrape, reverse-engineer, or disrupt the service. Accounts found in violation may be suspended.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Contact</h2>
          <p>Questions about these terms: <a href="mailto:support@writequran.com" className="text-[#D6C19E] hover:text-[#c2ad8a]">support@writequran.com</a></p>
        </div>
      </section>
    </main>
  );
}
