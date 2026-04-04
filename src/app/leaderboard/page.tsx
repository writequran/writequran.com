"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { getStorage, setStorage } from "@/lib/storage";
import { createClient } from "@/utils/supabase/client";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_letters_typed: number;
  total_surahs_practiced: number;
}

export default function LeaderboardPage() {
  const { t, language, n, setLanguage } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = getStorage('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add('dark');
    setIsMounted(true);

    const fetchLeaderboard = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_leaderboard');
      if (!error && data) {
        setLeaders(data);
      }
      setLoading(false);
    };

    fetchLeaderboard();

    const handleThemeEvent = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    window.addEventListener('quran-typing-theme-change', handleThemeEvent);
    return () => window.removeEventListener('quran-typing-theme-change', handleThemeEvent);
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

  if (!isMounted) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 transition-colors duration-500" />;

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return <span className="text-neutral-400 dark:text-neutral-500 font-bold">{n(index + 1)}</span>;
  };

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

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-12 pb-24">

        <section className="text-center flex flex-col items-center justify-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] mb-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            {t("leaderboard") || "Global Leaderboard"}
          </h2>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl">
            {t("leaderboard_desc") || "See top players worldwide sorted by typed letters and surahs."}
          </p>
        </section>

        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="bg-white dark:bg-neutral-800/80 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 overflow-hidden backdrop-blur-xl">
            
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200/60 dark:border-neutral-800 text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              <div className="col-span-2 sm:col-span-2 text-center">Rank</div>
              <div className="col-span-6 sm:col-span-4">User</div>
              <div className="col-span-4 sm:col-span-3 text-right">Typed</div>
              <div className="col-span-0 sm:col-span-3 text-right hidden sm:block">Surahs</div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-[#D6C19E]/30 border-t-[#D6C19E] rounded-full animate-spin"></div>
              </div>
            ) : leaders.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 dark:text-neutral-400 font-medium">
                No players on the leaderboard yet. Sign in, set a username, and start typing!
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {leaders.map((leader, idx) => (
                  <div key={leader.user_id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="col-span-2 sm:col-span-2 text-center text-2xl">
                      {getRankBadge(idx)}
                    </div>
                    <div className="col-span-6 sm:col-span-4 font-bold text-neutral-800 dark:text-neutral-100 truncate text-lg">
                      {leader.username}
                    </div>
                    <div className="col-span-4 sm:col-span-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                      {n(leader.total_letters_typed)}
                    </div>
                    <div className="col-span-0 sm:col-span-3 text-right font-medium text-neutral-500 dark:text-neutral-400 hidden sm:block">
                      {n(leader.total_surahs_practiced)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
