"use client";

import Link from "next/link";
import Image from "next/image";
import { AuthWidget } from "@/components/AuthWidget";
import { useEffect, useState } from "react";
import { getStorage, setStorage } from "@/lib/storage";

export default function LandingPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [showMemoModal, setShowMemoModal] = useState(false);
  const [startSurah, setStartSurah] = useState(1);
  const [endSurah, setEndSurah] = useState(114);

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
  };

  const handleStartMemorization = () => {
    setStorage("memorization_range", JSON.stringify({ startSurah, endSurah }));
    window.location.href = "/memorize";
  };

  if (!isMounted) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 transition-colors duration-500" />;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors duration-500 font-sans relative overflow-hidden flex flex-col">
      {/* Background aesthetics */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#D6C19E]/15 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#D6C19E]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#D6C19E]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm border border-[#D6C19E]/30 bg-white dark:bg-neutral-800">
            <Image src="/icon.svg" alt="WriteQuran Logo" fill className="object-contain p-1" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100">WriteQuran</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
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
            Practice · Memorize · Review
          </div>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-neutral-800 dark:text-neutral-50 leading-[1.1]">
            Master the Quran,<br />One Letter at a Time
          </h2>
          {/* <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            A premium, distraction-free environment to practice writing, reviewing mistakes, 
            and reinforcing your memorization.
          </p> */}
        </div>

        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150">

          <Link href="/write" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm">
            <div className="absolute -top-4 -right-4 p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 rotate-[-15deg] group-hover:rotate-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            </div>
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-neutral-800 dark:text-neutral-100">Start Writing</h3>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              Practice spelling and building visual memory of the Mushaf by typing verse by verse.
            </p>
            <div className="mt-8 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              Begin Practice <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          <Link href="/review" className="group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm">
            <div className="absolute -top-4 -right-4 p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 rotate-[15deg] group-hover:rotate-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
            </div>
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-neutral-800 dark:text-neutral-100">Review Mistakes</h3>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              Clear your tracked weak spots using spaced repetition. Re-practice exactly where you stumbled.
            </p>
            <div className="mt-8 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              Check Status <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </Link>

          <button onClick={() => setShowMemoModal(true)} className="group relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-800/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(214,193,158,0.15)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.4)] hover:border-[#D6C19E]/40 backdrop-blur-sm text-left">
            <div className="absolute -top-4 -right-4 p-6 opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-all duration-500 scale-50 group-hover:scale-150 rotate-180 group-hover:rotate-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-neutral-800 dark:text-neutral-100">Memorization Test</h3>
            <p className="text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
              Pick a range of Surahs and jump into random Ayat to test your retention and recall.
            </p>
            <div className="mt-8 flex items-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E] group-hover:gap-2 transition-all">
              Test Memory <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </div>
          </button>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-10 mt-auto text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        <div className="flex justify-center gap-8 mb-4">
          <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Terms</Link>
          <Link href="/contact" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} WriteQuran.com All rights reserved.</p>
      </footer>

      {showMemoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-[#D6C19E]/30 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Memorization Range</h3>
              <button onClick={() => setShowMemoModal(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">From Surah:</label>
                <input
                  type="number" min="1" max="114" value={startSurah}
                  onChange={(e) => setStartSurah(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#D6C19E] focus:border-transparent transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">To Surah:</label>
                <input
                  type="number" min="1" max="114" value={endSurah}
                  onChange={(e) => setEndSurah(parseInt(e.target.value) || 114)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#D6C19E] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleStartMemorization}
              className="w-full py-4 rounded-xl bg-[#D6C19E] hover:bg-[#c2ad8a] text-white font-bold text-lg transition-colors shadow-lg shadow-[#D6C19E]/20"
            >
              Start Testing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
