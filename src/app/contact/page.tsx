import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact — WriteQuran',
};

export default function ContactPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 font-sans text-neutral-800 dark:text-neutral-100">
      <Link href="/" className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mb-8 inline-block">← Back to WriteQuran</Link>
      <h1 className="text-2xl font-bold mb-2">Contact & Support</h1>
      <p className="text-xs text-neutral-400 mb-8">We're happy to help.</p>

      <section className="space-y-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">General support</h2>
          <p>For help with your account, progress sync issues, or bugs, email us at:</p>
          <a href="mailto:support@writequran.com" className="text-[#D6C19E] hover:text-[#c2ad8a] font-medium">support@writequran.com</a>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Account deletion</h2>
          <p>To delete your account and all associated data, send an email to the address above with the subject "Delete my account". We will process it within 7 days.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Feedback & corrections</h2>
          <p>If you notice an error in the Qur'anic text or have a suggestion for improving the app, please email us. We take text accuracy very seriously.</p>
        </div>
        <div>
          <h2 className="font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Response time</h2>
          <p>We aim to respond within 2–3 business days. جزاكم الله خيراً</p>
        </div>
      </section>
    </main>
  );
}
