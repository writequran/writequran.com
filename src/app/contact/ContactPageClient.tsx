"use client";

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

export default function ContactPageClient() {
  const { t, language } = useLanguage();

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
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-2">{t("contact_title")}</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{t("contact_subtitle")}</p>
        </div>

        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-neutral-200/60 dark:border-neutral-700/50 shadow-sm overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("contact_general_support")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("contact_general_support_body")}</p>
              <a href="mailto:support@writequran.com" className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-[#B18E4E] dark:text-[#D6C19E] hover:text-[#9d7a3e] dark:hover:text-[#e3be72] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                support@writequran.com
              </a>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("contact_account_deletion")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("contact_account_deletion_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("contact_feedback")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("contact_feedback_body")}</p>
            </div>
            <div className="px-6 py-5">
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1.5 text-sm">{t("contact_response_time")}</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{t("contact_response_time_body")} <span className="font-arabic">جزاكم الله خيراً</span></p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-10">© {t("write_quran")}</p>
      </div>
    </div>
  );
}
