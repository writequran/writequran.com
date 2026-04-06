"use client";

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function TermsPageClient() {
  const { t, language, n } = useLanguage();

  return (
    <div dir={language === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 font-sans">
      <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-[#D6C19E]/8 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className={`inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-10 transition-colors group ${language === "ar" ? "flex-row-reverse" : ""}`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 group-hover:border-[#D6C19E]/50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
          <span>{t("write_quran")}</span>
        </Link>

        <div className={`mb-10 ${language === "ar" ? "text-right" : ""}`}>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">{t("terms_title")}</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">{t("last_updated")} {t("updated_april")} {n(2026)}</p>
        </div>

        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/60 dark:border-neutral-700/50 shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("terms_use_title")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("terms_use_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("terms_accounts_title")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("terms_accounts_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("terms_text_title")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("terms_text_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("terms_availability_title")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("terms_availability_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("terms_prohibited_title")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("terms_prohibited_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("terms_contact_title")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t("terms_contact_body")}{' '}
                <a href="mailto:support@writequran.com" className="text-[#B18E4E] dark:text-[#D6C19E] hover:underline font-medium">support@writequran.com</a>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-10">© {t("write_quran")}</p>
      </div>
    </div>
  );
}
