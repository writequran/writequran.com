import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Use — WriteQuran',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 font-sans">
      <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-[#D6C19E]/8 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* Back navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-10 transition-colors group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 group-hover:border-[#D6C19E]/50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
          <span>WriteQuran</span>
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">Terms of Use</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Last updated: March 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/60 dark:border-neutral-700/50 shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">Use of the service</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">WriteQuran is a free tool for practicing the memorization of the Qur'an. You may use it for personal, educational, and non-commercial purposes. Please use it with respect for the Qur'an and other users.</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">Accounts</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">You are responsible for keeping your login credentials secure. Do not share your account with others.</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">Qur'anic text</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">The Qur'anic text used in this application is sourced from publicly available Uthmani script datasets. It is displayed for worship and learning purposes only.</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">Availability</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">We make no guarantees about uptime or availability. The service is provided as-is. We reserve the right to modify or discontinue the service at any time.</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">Prohibited use</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">You may not attempt to abuse, scrape, reverse-engineer, or disrupt the service. Accounts found in violation may be suspended.</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">Contact</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Questions about these terms:{' '}
                <a href="mailto:support@writequran.com" className="text-[#B18E4E] dark:text-[#D6C19E] hover:underline font-medium">support@writequran.com</a>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-10">© WriteQuran.com</p>
      </div>
    </div>
  );
}
