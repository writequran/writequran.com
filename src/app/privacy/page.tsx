import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — WriteQuran',
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">Privacy Policy</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Last updated: March 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/60 dark:border-neutral-700/50 shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            {[
              {
                title: "What we collect",
                body: "When you create an account, we store your email address and a hashed password through Supabase Auth. We also store your typing progress, mistake statistics, and preferences so you can resume across devices.",
              },
              {
                title: "What we do not collect",
                body: "We do not collect your name, location, payment information, or any other personal information. We do not use advertising trackers or third-party analytics.",
              },
              {
                title: "Anonymous use",
                body: "You can use WriteQuran without creating an account. In that case, all data is stored locally in your browser only and never sent to our servers.",
              },
              {
                title: "Data storage",
                body: "Account data is stored in Supabase (PostgreSQL). Each user's data is isolated and protected by Row Level Security policies — no user can access another user's data.",
              },
              {
                title: "Data deletion",
                body: null,
                custom: (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    You may request deletion of your account and all associated data at any time by contacting us at{' '}
                    <a href="mailto:support@writequran.com" className="text-[#B18E4E] dark:text-[#D6C19E] hover:underline font-medium">support@writequran.com</a>.
                  </p>
                ),
              },
              {
                title: "Cookies",
                body: "We use a single HTTP-only authentication cookie to maintain your session. No advertising or tracking cookies are used.",
              },
              {
                title: "Changes",
                body: "If this policy changes materially, we will update the date above. Continued use of WriteQuran constitutes acceptance of any updates.",
              },
            ].map((item) => (
              <div key={item.title} className="px-6 py-5">
                <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{item.title}</h2>
                {item.custom ?? <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.body}</p>}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-10">© WriteQuran.com</p>
      </div>
    </div>
  );
}
