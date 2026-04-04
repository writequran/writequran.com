"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { getMilestoneProgress, loadProgressStats } from "@/lib/stats";
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
    <div className={`rounded-3xl border px-6 py-6 transition-all duration-300 ${achieved
      ? "border-emerald-200 bg-emerald-50/90 dark:border-emerald-800/70 dark:bg-emerald-900/20 shadow-[0_10px_40px_rgba(16,185,129,0.06)]"
      : "border-neutral-200 bg-neutral-50/80 dark:border-neutral-700/50 dark:bg-neutral-800/40 opacity-80 hover:opacity-100"
      }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-neutral-400 dark:text-neutral-500">
            {t("milestone") || "Milestone"}
          </p>
          <h3 className="mt-2 text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{description}</p>
        </div>
        <div className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${achieved
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-neutral-200/80 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          }`}>
          {achieved ? t("unlocked") || "Unlocked" : t("locked") || "Locked"}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">{value}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{target}</span>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-neutral-200/80 dark:bg-neutral-800 overflow-hidden shadow-inner">
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
  const [surahStats, setSurahStats] = useState<{ number: number; name: string; englishName: string; progress: number; ayahCount: number }[]>([]);

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

  useEffect(() => {
    const saved = getStorage('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add('dark');

    const progressStats = loadProgressStats();
    const allSurahs = getAllSurahsMeta();

    // Process stats dynamically so we do not block UI render immediately
    const computedStats = allSurahs.map(surah => {
      let progressPercent = 0;
      let ayahCount = 0;
      try {
        ayahCount = getSurah(surah.number).blocks.length;
      } catch (e) { }
      if (progressStats[surah.number]) {
        try {
          const sData = getSurah(surah.number);
          if (sData.globalCheckString.length > 0) {
            progressPercent = (progressStats[surah.number].highestIndexReached / sData.globalCheckString.length) * 100;
          }
        } catch (e) { }
      }
      return {
        number: surah.number,
        name: surah.name,
        englishName: surah.englishName,
        progress: progressPercent,
        ayahCount
      };
    });

    setSurahStats(computedStats);
    setIsMounted(true);
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
      {/* Background aesthetics */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#D6C19E]/10 to-transparent pointer-events-none" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#D6C19E]/5 blur-[120px] rounded-full pointer-events-none" />

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
            className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            title={t("language_toggle")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            title={isDarkMode ? (t("light_mode") || "Light Mode") : (t("night_mode") || "Night Mode")}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-16 pb-24">

        {/* Page Title section */}
        <section className="text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div>
            <div className="inline-flex items-center justify-center px-4 py-1.5 mb-4 rounded-full border border-[#D6C19E]/30 bg-[#D6C19E]/10 text-xs font-bold uppercase tracking-widest text-[#B18E4E] dark:text-[#D6C19E]">
              {t("my_progress") || "My Progress"}
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 mb-4">
              {t("my_progress_desc") || "See your milestones and journey."}
            </h2>
          </div>
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

        {/* Surah List Tracker */}
        <section className="animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-150">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">
              {t("surah_progress") || "Surah Progress"}
            </h3>
            <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-4 py-1.5 rounded-full shadow-sm border border-neutral-100 dark:border-neutral-700">
              {n(surahStats.filter(s => s.progress === 100).length)} / {n(114)} {t("completed") || "Completed"}
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
                      ? "bg-white border-[#D6C19E]/40 dark:bg-neutral-800/95 dark:border-[#D6C19E]/45 hover:border-[#D6C19E] hover:shadow-[0_8px_30px_rgba(214,193,158,0.15)] dark:hover:bg-neutral-800"
                      : "bg-neutral-50/50 border-neutral-200 dark:bg-neutral-800/75 dark:border-neutral-700/80 hover:bg-white dark:hover:bg-neutral-800/90 hover:border-neutral-300 dark:hover:border-neutral-600 opacity-70 dark:opacity-80 hover:opacity-100"
                    }`}
                >
                  <div className="flex justify-between items-start mb-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex items-center justify-center min-w-10 h-10 px-3 rounded-full text-xs font-bold ${
                        isCompleted
                          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200"
                          : isStarted
                            ? "bg-[#D6C19E]/20 dark:bg-[#D6C19E]/25 text-[#B18E4E] dark:text-[#E3BE72]"
                            : "bg-neutral-100 dark:bg-neutral-700/90 text-neutral-500 dark:text-neutral-300"
                      }`}>
                        {n(surah.number)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 font-quran truncate">
                          {language === "ar" ? surah.name : surah.englishName}
                        </h4>
                        <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-neutral-400 dark:text-neutral-500">
                          {n(surah.ayahCount)} {language === "ar" ? "آيات" : "Ayahs"}
                        </p>
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
    </div>
  );
}
