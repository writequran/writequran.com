"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { getMilestoneProgress, getReviewAnalytics, getSurahFinalProgressState } from "@/lib/stats";
import { getAllSurahsMeta, getSurah } from "@/lib/quran-data";
import { getStorage, setStorage } from "@/lib/storage";

function MilestoneCard({
  title,
  description,
  value,
  target,
  achieved,
  progressPercent,
}: {
  title: string;
  description: string;
  value: string;
  target: string;
  achieved: boolean;
  progressPercent: number;
}) {
  const { t } = useLanguage();
  return (
    <div className={`rounded-[1.2rem] sm:rounded-3xl border px-3 py-3 sm:px-6 sm:py-6 transition-colors duration-200 ${achieved
      ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-900/15"
      : "border-neutral-200 bg-neutral-50/60 dark:border-neutral-700/50 dark:bg-neutral-800/40"
      }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.22em] font-bold text-neutral-400 dark:text-neutral-500">
            {t("milestone") || "Milestone"}
          </p>
          <h3 className="mt-1 text-[1rem] sm:text-base font-semibold text-neutral-800 dark:text-neutral-100 leading-tight">{title}</h3>
          <p className="mt-1 hidden sm:block text-[13px] sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
        </div>
        <div className={`shrink-0 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.08em] sm:tracking-[0.18em] ${achieved
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-neutral-200/80 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          }`}>
          {achieved ? t("unlocked") || "Unlocked" : t("locked") || "Locked"}
        </div>
      </div>

      <div className="mt-3 sm:mt-6">
        <div className="flex items-end justify-between gap-3">
          <span className="text-[1.7rem] sm:text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight leading-none">{value}</span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.06em] sm:tracking-wider text-neutral-400 dark:text-neutral-500">{target}</span>
        </div>
        <div className="mt-2.5 sm:mt-4 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${achieved ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-[#D6C19E] to-[#C1A063]"
              }`}
            style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { t, language, n, setLanguage } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [surahStats, setSurahStats] = useState<{ number: number; name: string; englishName: string; progress: number; ayahCount: number; typedCount: number; totalLetters: number }[]>([]);
  const [analyticsVersion, setAnalyticsVersion] = useState(0);

  const milestones = useMemo(() => {
    if (!isMounted) return null;
    const progress = getMilestoneProgress();
    const surahs = getAllSurahsMeta();
    const firstCompletedSurah = progress.firstCompletedSurahNumber
      ? surahs.find((surah) => surah.number === progress.firstCompletedSurahNumber)
      : null;

    return {
      firstCompletedSurahLabel: firstCompletedSurah
        ? `${n(firstCompletedSurah.number)}. ${language === "ar" ? firstCompletedSurah.name : firstCompletedSurah.englishName}`
        : t("none_yet") || "None yet",
      hasCompletedSurah: Boolean(firstCompletedSurah),
      totalCompletedAyat: progress.totalCompletedAyat,
      totalLettersTyped: progress.totalLettersTyped,
    };
  }, [isMounted, language, n, t]);

  const reviewAnalytics = useMemo(() => {
    if (!isMounted) return null;
    return getReviewAnalytics(language);
  }, [isMounted, analyticsVersion, language]);

  useEffect(() => {
    const saved = getStorage('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add('dark');

    const allSurahs = getAllSurahsMeta();

    // Process stats dynamically so we do not block UI render immediately
    const computedStats = allSurahs.map(surah => {
      let ayahCount = 0;
      let progressPercent = 0;
      let typedCount = 0;
      let totalLetters = 0;
      try {
        const sData = getSurah(surah.number);
        const finalState = getSurahFinalProgressState(surah.number);
        ayahCount = sData.blocks.length;
        progressPercent = finalState.progressPercent;
        typedCount = finalState.typedCount;
        totalLetters = finalState.totalLetters;
      } catch (e) {
        ayahCount = 0;
        progressPercent = 0;
        typedCount = 0;
        totalLetters = 0;
      }
      return {
        number: surah.number,
        name: surah.name,
        englishName: surah.englishName,
        progress: progressPercent,
        ayahCount,
        typedCount,
        totalLetters
      };
    });

    setSurahStats(computedStats);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleStatsEvent = () => setAnalyticsVersion((value) => value + 1);
    window.addEventListener("quran-typing-stats-change", handleStatsEvent);
    return () => window.removeEventListener("quran-typing-stats-change", handleStatsEvent);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    setStorage('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('quran-typing-theme-change'));
  };

  if (!isMounted || !milestones) {
    return <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 transition-colors duration-500" />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-500 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-[#D6C19E]/8 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 sm:px-10 lg:px-12 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 rtl:rotate-180">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
          <span className="font-bold tracking-tight text-neutral-800 dark:text-neutral-100 hidden sm:block">{t("home") || "Home"}</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 font-gabriela absolute left-1/2 -translate-x-1/2">Write Quran</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            aria-label={t("language_toggle")}
            aria-pressed={language === 'ar'}
            className="flex items-center justify-center w-11 h-11 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          </button>
          <button
            onClick={toggleTheme}
            aria-label={isDarkMode ? (t("light_mode") || "Light Mode") : (t("night_mode") || "Night Mode")}
            aria-pressed={isDarkMode}
            className="flex items-center justify-center w-11 h-11 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-10 pb-24">

        {/* Page Title section */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {t("my_progress")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t("my_progress_desc")}
          </p>
        </section>

        {/* Global Milestones */}
        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="grid gap-6 md:grid-cols-3">
            <MilestoneCard
              title={t("first_completed_surah") || "First Completed Surah"}
              description={t("first_completed_surah_desc") || "Finish an entire surah from beginning to end."}
              value={milestones.firstCompletedSurahLabel}
              target={t("target_1_surah") || "1 Surah"}
              achieved={milestones.hasCompletedSurah}
              progressPercent={milestones.hasCompletedSurah ? 100 : 0}
            />

            <MilestoneCard
              title={t("10_ayat_completed") || "10 Ayat Completed"}
              description={t("10_ayat_completed_desc") || "Fully complete ten ayat across your practice."}
              value={`${n(milestones.totalCompletedAyat)} ${t("ayat") || "ayat"}`}
              target={`${n(10)} ${t("ayat") || "ayat"}`}
              achieved={milestones.totalCompletedAyat >= 10}
              progressPercent={(milestones.totalCompletedAyat / 10) * 100}
            />

            <MilestoneCard
              title={t("1000_letters_typed") || "1000 Letters Typed"}
              description={t("1000_letters_typed_desc") || "Type one thousand Quran letters in total."}
              value={`${n(milestones.totalLettersTyped)}`}
              target={`${n(1000)} ${t("letters") || "letters"}`}
              achieved={milestones.totalLettersTyped >= 1000}
              progressPercent={(milestones.totalLettersTyped / 1000) * 100}
            />
          </div>
        </section>

        {reviewAnalytics && (
          <section className="animate-in slide-in-from-bottom-10 fade-in duration-1000">
            <div className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none">
              <div className="flex flex-col gap-2 mb-6">
                <h3 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
                  {t("review_analytics")}
                </h3>
                <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-2xl">
                  {t("review_analytics_desc")}
                </p>
              </div>

              {reviewAnalytics.hardestSurahs.length === 0
                && reviewAnalytics.hardestAyat.length === 0
                && reviewAnalytics.hardestLetters.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-5 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {t("no_review_data")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
                  <div className="rounded-2xl border border-[#D6C19E]/25 bg-[#F8F1E6]/85 dark:bg-neutral-900/65 dark:border-[#D6C19E]/20 px-4 py-4 min-h-[220px] h-[220px] xl:col-span-3 xl:min-h-[280px] xl:h-[280px] flex flex-col">
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B18E4E] dark:text-[#D6C19E]">
                      {t("review_success_rate")}
                    </div>
                    <div className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-50">
                      {n(reviewAnalytics.reviewSuccessRate.toFixed(1))}%
                    </div>
                    <div className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {n(reviewAnalytics.successfulReviewCount)} / {n(reviewAnalytics.reviewedCount)} {t("reviewed_weak_spots").toLowerCase()}
                    </div>
                    <div className="mt-auto pt-6">
                      <div className="h-2 rounded-full bg-neutral-200/80 dark:bg-neutral-700/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D6C19E] to-[#B18E4E] dark:from-[#E3BE72] dark:to-[#D6C19E] transition-all duration-700"
                          style={{ width: `${Math.max(0, Math.min(reviewAnalytics.reviewSuccessRate, 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {[
                    { key: "hardest_surahs", items: reviewAnalytics.hardestSurahs },
                    { key: "hardest_ayat", items: reviewAnalytics.hardestAyat },
                    { key: "hardest_letters", items: reviewAnalytics.hardestLetters },
                  ].map((group) => (
                    <div
                      key={group.key}
                      className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-4 min-h-[220px] h-[220px] xl:col-span-3 xl:min-h-[280px] xl:h-[280px] flex flex-col"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">
                        {t(group.key)}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 overflow-y-auto pr-1 min-h-0">
                        {group.items.length > 0 ? group.items.map((item, index) => (
                          <div key={`${group.key}-${item.label}-${index}`} className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">
                                {language === "ar"
                                  ? item.label.replace(/\d+/g, (match) => String(n(Number(match))))
                                  : item.label}
                              </div>
                              {item.meta ? (
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                  {language === "ar"
                                    ? item.meta.replace(/\d+/g, (match) => String(n(Number(match))))
                                    : item.meta}
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-sm font-black text-[#B18E4E] dark:text-[#D6C19E]">
                              {n(item.score)}
                            </div>
                          </div>
                        )) : (
                          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            {t("no_review_data")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Surah List Tracker */}
        <section className="animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-150">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
              {t("surah_progress") || "Surah Progress"}
            </h3>
            <span className="text-sm font-semibold bg-white dark:bg-neutral-800 px-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
              <span dir="ltr" className="inline-flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {n(surahStats.filter(s => s.progress === 100).length)}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400"> / {n(114)}</span>
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 xl:gap-2">
            {surahStats.map((surah) => {
              const isStarted = surah.progress > 0;
              const isCompleted = surah.progress >= 100;
              return (
                <Link
                  key={surah.number}
                  href={`/write`}
                  onClick={() => setStorage('surah', surah.number.toString())}
                  className={`relative group flex flex-col justify-between p-3 rounded-2xl border transition-all duration-300 ${isCompleted
                    ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/40 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20"
                    : isStarted
                      ? "bg-white border-[#D6C19E]/40 dark:bg-neutral-800/95 dark:border-[#D6C19E]/35 hover:border-[#D6C19E]/70 dark:hover:bg-neutral-800"
                      : "bg-neutral-50/50 border-neutral-200 dark:bg-neutral-800/75 dark:border-neutral-700/80 hover:bg-white dark:hover:bg-neutral-800/90 hover:border-neutral-300 dark:hover:border-neutral-600"
                    }`}
                >
                  <div className="flex justify-between items-start mb-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex items-center justify-center min-w-10 h-10 px-3 rounded-full text-xs font-bold ${isCompleted
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200"
                        : isStarted
                          ? "bg-[#D6C19E]/20 dark:bg-[#D6C19E]/25 text-[#B18E4E] dark:text-[#E3BE72]"
                          : "bg-neutral-100 dark:bg-neutral-700/90 text-neutral-500 dark:text-neutral-300"
                        }`}>
                        {n(surah.number)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 font-quran truncate">
                              {language === "ar" ? surah.name : surah.englishName}
                            </h4>
                            <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-neutral-400 dark:text-neutral-500">
                              {n(surah.ayahCount)} {language === "ar" ? "آيات" : "Ayahs"}
                            </p>
                          </div>
                          <span className="shrink-0 self-center pt-1 text-sm font-bold tracking-wide">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {n(surah.typedCount)}
                            </span>
                            <span className="text-neutral-700 dark:text-neutral-200">/{n(surah.totalLetters)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mt-0">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? "bg-emerald-500" : "bg-[#D6C19E]"
                            }`}
                          style={{ width: `${Math.max(0, Math.min(surah.progress, 100))}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold tracking-wider ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : isStarted ? "text-[#B18E4E] dark:text-[#D6C19E]" : "text-neutral-400"
                        }`}>
                        {n(Math.floor(surah.progress))}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

      </main>

      <footer className="relative z-10 w-full text-center py-8 mt-auto text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">{t("privacy")}</Link>
          <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">{t("terms")}</Link>
          <Link href="/contact" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">{t("contact")}</Link>
        </div>
        <p>© <span className="text-[#B18E4E] dark:text-[#D6C19E]">WriteQuran.com</span> {n(new Date().getFullYear())}</p>
      </footer>
    </div>
  );
}
