"use client";

import Link from "next/link";
import { AuthWidget } from "@/components/AuthWidget";
import { ProgressModal } from "@/components/ProgressModal";
import { MenuDrawer } from "@/components/MenuDrawer";
import { useEffect, useState } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";

const splitArabicGraphemes = (text: string) => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter("ar", { granularity: "grapheme" }).segment(text)].map((part) => part.segment);
  }

  return Array.from(text);
};

export default function LandingPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const heroAyat = [
    {
      surah: "96:1",
      text: "ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ",
    },
    {
      surah: "68:1",
      text: "نٓۚ وَٱلْقَلَمِ وَمَا يَسْطُرُونَ",
    },
    {
      surah: "73:4",
      text: "وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا",
    },
  ] as const;
  const [activeAyah, setActiveAyah] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [isHoldingAyah, setIsHoldingAyah] = useState(false);

  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [startSurah, setStartSurah] = useState(1);
  const [endSurah, setEndSurah] = useState(114);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { t, language, setLanguage, n } = useLanguage();

  useEffect(() => {
    const saved = getStorage('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add('dark');

    // Load existing memorization range preference
    const savedMemorizationRange = getStorage("memorization_range");
    if (savedMemorizationRange) {
      try {
        const parsed = JSON.parse(savedMemorizationRange);
        setStartSurah(parsed.startSurah || 1);
        setEndSurah(parsed.endSurah || 114);
      } catch { }
    }

    setIsMounted(true);

    const handleThemeEvent = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('quran-typing-theme-change', handleThemeEvent);
    return () => window.removeEventListener('quran-typing-theme-change', handleThemeEvent);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const currentAyah = heroAyat[activeAyah];
    const currentAyahUnits = splitArabicGraphemes(currentAyah.text);

    if (typedChars < currentAyahUnits.length) {
      setIsHoldingAyah(false);
      const typeTimer = window.setTimeout(() => {
        setTypedChars((current) => current + 1);
      }, typedChars === 0 ? 500 : 100);

      return () => window.clearTimeout(typeTimer);
    }

    setIsHoldingAyah(true);
    const holdTimer = window.setTimeout(() => {
      setActiveAyah((current) => (current + 1) % heroAyat.length);
      setTypedChars(0);
      setIsHoldingAyah(false);
    }, 2400);

    return () => window.clearTimeout(holdTimer);
  }, [activeAyah, typedChars, isMounted]);

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

  const handleStartMemorization = () => {
    setStorage("memorization_range", JSON.stringify({ startSurah, endSurah }));
    window.location.href = "/memorize";
  };

  if (!isMounted) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 transition-colors duration-500" />;

  const currentHeroAyah = heroAyat[activeAyah];
  const currentHeroAyahUnits = splitArabicGraphemes(currentHeroAyah.text);
  const revealProgress = currentHeroAyahUnits.length === 0 ? 0 : typedChars / currentHeroAyahUnits.length;
  const footerRightsText = t("all_rights_reserved").replace(/writequran\.com\s*/i, "").trim();

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors duration-500 font-sans relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#D6C19E]/12 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 w-full px-8 py-6 sm:px-10 lg:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="mr-1 sm:mr-2 p-2 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors flex items-center justify-center"
            title={t("open_menu")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 font-gabriela">Write Quran</h1>
        </div>
        <div className="flex items-center gap-0 sm:gap-0">
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
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            )}
          </button>
          <AuthWidget onAuthChange={() => { }} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 py-8 sm:py-16">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full border border-[#D6C19E]/30 bg-[#D6C19E]/10 text-sm font-semibold text-[#B18E4E] dark:text-[#D6C19E]">
            {t("practice_memorize_review")}
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-neutral-800 dark:text-neutral-50 leading-[1.1]">
            {t("master_the_quran_1")}<br />{t("master_the_quran_2")}
          </h2>
          <div className="mx-auto mt-8 w-full max-w-2xl rounded-[2rem] border border-[#D6C19E]/35 bg-white/80 dark:bg-neutral-900/70 px-5 py-5 sm:px-8 sm:py-6 shadow-[0_18px_60px_rgba(214,193,158,0.14)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#B18E4E] dark:text-[#D6C19E]">
              <span>{t("typing_revelation")}</span>
              <span>{language === 'ar' ? `${n(currentHeroAyah.surah.split(':')[0])}:${n(currentHeroAyah.surah.split(':')[1])}` : currentHeroAyah.surah}</span>
            </div>
            <div
              className="quran-text rtl min-h-[3.6rem] text-[1.65rem] leading-[2.2] sm:min-h-[4.6rem] sm:text-[2.35rem] sm:leading-[2.5] text-neutral-800 dark:text-neutral-100"
              dir="rtl"
            >
              <span className="relative inline-block max-w-full whitespace-nowrap">
                <span className="opacity-0">{currentHeroAyah.text}</span>
                <span
                  className="absolute inset-y-0 right-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-150 ease-out"
                  style={{ maxWidth: `${Math.max(0, Math.min(100, revealProgress * 100))}%` }}
                  aria-hidden="true"
                >
                  {currentHeroAyah.text}
                </span>
                <span
                  className={`absolute top-[0.4em] w-[2px] rounded-full bg-[#C5963D] dark:bg-[#E3BE72] ${isHoldingAyah ? 'opacity-0' : 'animate-landing-caret'}`}
                  style={{
                    right: `${Math.max(0, Math.min(100, revealProgress * 100))}%`,
                    height: "1.5em",
                    transform: "translateX(50%)",
                  }}
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
          {/* <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            A premium, distraction-free environment to practice writing, reviewing mistakes, 
            and reinforcing your memorization.
          </p> */}
        </div>

        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-5 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150">

          <Link href="/write" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-5 sm:p-6 lg:p-8 xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm">
            <div className={`absolute -top-4 ${language === "ar" ? "-left-4" : "-right-4"} p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 ${language === "ar" ? "rotate-[15deg]" : "rotate-[-15deg]"} group-hover:rotate-0`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            </div>
            <div className="mb-4 sm:mb-6 xl:mb-4 inline-flex h-12 w-12 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            </div>
            <h3 className="mb-2 text-xl xl:text-lg font-bold text-neutral-800 dark:text-neutral-100">{t("start_writing")}</h3>
            <p className="text-sm xl:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              {t("start_writing_desc")}
            </p>
            <div className="mt-4 sm:mt-6 xl:mt-4 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              {t("begin_practice")} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 rtl:rotate-180"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          <Link href="/review" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-5 sm:p-6 lg:p-8 xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm">
            <div className={`absolute -top-4 ${language === "ar" ? "-left-4" : "-right-4"} p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 ${language === "ar" ? "rotate-[-15deg]" : "rotate-[15deg]"} group-hover:rotate-0`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
            </div>
            <div className="mb-4 sm:mb-6 xl:mb-4 inline-flex h-12 w-12 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>
            </div>
            <h3 className="mb-2 text-xl xl:text-lg font-bold text-neutral-800 dark:text-neutral-100">{t("review_mistakes")}</h3>
            <p className="text-sm xl:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              {t("review_mistakes_desc")}
            </p>
            <div className="mt-4 sm:mt-6 xl:mt-4 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              {t("check_status")} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 rtl:rotate-180"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          <button onClick={() => setShowMemoModal(true)} className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-5 sm:p-6 lg:p-8 xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm ${language === "ar" ? "text-right" : "text-left"}`}>
            <div className={`absolute -top-4 ${language === "ar" ? "-left-4" : "-right-4"} p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 rotate-180 group-hover:rotate-0`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div className="mb-4 sm:mb-6 xl:mb-4 inline-flex h-12 w-12 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
            </div>
            <h3 className="mb-2 text-xl xl:text-lg font-bold text-neutral-800 dark:text-neutral-100">{t("memorization_test")}</h3>
            <p className="text-sm xl:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              {t("memorization_test_desc")}
            </p>
            <div className="mt-4 sm:mt-6 xl:mt-4 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              {t("test_memory")} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 rtl:rotate-180"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </button>

          <Link href="/progress" className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-5 sm:p-6 lg:p-8 xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm ${language === "ar" ? "text-right" : "text-left"}`}>
            <div className={`absolute -top-4 ${language === "ar" ? "-left-4" : "-right-4"} p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 ${language === "ar" ? "rotate-[15deg]" : "rotate-[-15deg]"} group-hover:rotate-0`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 14 3-3 3 2 4-5" /><circle cx="7" cy="14" r="1" /><circle cx="10" cy="11" r="1" /><circle cx="13" cy="13" r="1" /><circle cx="17" cy="8" r="1" /></svg>
            </div>
            <div className="mb-4 sm:mb-6 xl:mb-4 inline-flex h-12 w-12 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 14 3-3 3 2 4-5" /><circle cx="7" cy="14" r="1" /><circle cx="10" cy="11" r="1" /><circle cx="13" cy="13" r="1" /><circle cx="17" cy="8" r="1" /></svg>
            </div>
            <h3 className="mb-2 text-xl xl:text-lg font-bold text-neutral-800 dark:text-neutral-100">{t("my_progress")}</h3>
            <p className="text-sm xl:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              {t("my_progress_desc")}
            </p>
            <div className="mt-4 sm:mt-6 xl:mt-4 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              {t("view_progress")} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 rtl:rotate-180"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          <Link href="/leaderboard" className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-5 sm:p-6 lg:p-8 xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm ${language === "ar" ? "text-right" : "text-left"}`}>
            <div className={`absolute -top-4 ${language === "ar" ? "-left-4" : "-right-4"} p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 ${language === "ar" ? "rotate-[15deg]" : "rotate-[-15deg]"} group-hover:rotate-0`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
            <div className="mb-4 sm:mb-6 xl:mb-4 inline-flex h-12 w-12 xl:h-11 xl:w-11 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
            <h3 className="mb-2 text-xl xl:text-lg font-bold text-neutral-800 dark:text-neutral-100">{t("leaderboard")}</h3>
            <p className="text-sm xl:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              {t("leaderboard_desc")}
            </p>
            <div className="mt-4 sm:mt-6 xl:mt-4 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              {t("view_rankings")} <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 rtl:rotate-180"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-10 mt-auto text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        <div className="flex justify-center gap-8 mb-4">
          <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">{t("privacy")}</Link>
          <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">{t("terms")}</Link>
          <Link href="/contact" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">{t("contact")}</Link>
        </div>
        <p>
          © <Link href="/" className="inline-flex items-center text-[#B18E4E] dark:text-[#D6C19E] hover:text-[#9d7a3e] dark:hover:text-[#e3be72] transition-colors">WriteQuran.com</Link> {n(new Date().getFullYear())} {footerRightsText}
        </p>
      </footer>

      {showMemoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-[#D6C19E]/30 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t("memorization_range")}</h3>
              <button onClick={() => setShowMemoModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("from_surah")}</label>
                <input
                  type="text" inputMode="numeric"
                  value={n(startSurah)}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()));
                    setStartSurah(parsed || 1);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#D6C19E] focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{t("to_surah")}</label>
                <input
                  type="text" inputMode="numeric"
                  value={n(endSurah)}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()));
                    setEndSurah(parsed || 114);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#D6C19E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleStartMemorization}
              className="w-full py-4 rounded-xl bg-[#D6C19E] hover:bg-[#c2ad8a] text-white font-bold text-lg transition-colors shadow-lg shadow-[#D6C19E]/20"
            >
              {t("start_testing")}
            </button>
          </div>
        </div>
      )}

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
    </div>
  );
}
