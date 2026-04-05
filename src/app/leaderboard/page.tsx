"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { getStorage, setStorage } from "@/lib/storage";
import { createClient } from "@/utils/supabase/client";
import { MenuDrawer } from "@/components/MenuDrawer";

interface LeaderboardEntry {
  global_rank: number;
  user_id: string;
  username: string;
  public_display_name: string;
  total_letters_typed: number;
  total_surahs_practiced: number;
  total_completed_surahs: number;
  total_ayat_completed: number;
  accuracy_percentage: number;
  streak_active: number;
  hifz_score: number;
}

export default function LeaderboardPage() {
  const { t, language, n, setLanguage } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);

  const maskUsername = (value: string) => {
    if (!value) return "User";
    if (value.length <= 2) return `${value[0] || "U"}***`;
    if (value.length <= 5) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 3)}***${value.slice(-1)}`;
  };

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_leaderboard");
    if (error) {
      setLoadError(error.message || "Failed to load leaderboard.");
    } else if (data) {
      setLeaders(
        data.map((entry: any) => ({
          global_rank: entry.global_rank,
          user_id: entry.user_id,
          username: entry.username,
          public_display_name: entry.public_display_name,
          total_letters_typed: entry.total_letters_typed,
          total_surahs_practiced: entry.total_surahs_practiced,
          total_completed_surahs: entry.total_completed_surahs,
          total_ayat_completed: entry.total_ayat_completed,
          accuracy_percentage: entry.accuracy_percentage,
          streak_active: entry.streak_active,
          hifz_score: entry.hifz_score,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = getStorage("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = saved ? saved === "dark" : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add("dark");
    setIsMounted(true);
    setActiveUsername(getStorage("active_username"));

    fetchLeaderboard();

    const handleThemeEvent = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    window.addEventListener("quran-typing-theme-change", handleThemeEvent);
    return () => window.removeEventListener("quran-typing-theme-change", handleThemeEvent);
  }, []);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    setStorage("theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("quran-typing-theme-change"));
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 transition-colors duration-500" />;
  }

  const topThreeStyles = [
    "border-[#D6C19E]/40 bg-[#D6C19E]/20 text-[#B18E4E] dark:bg-[#D6C19E]/15 dark:text-[#E6CAA0]",
    "border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
    "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-500 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#D6C19E]/10 to-transparent pointer-events-none" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#D6C19E]/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 sm:px-10 lg:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors flex items-center justify-center"
            title={t("open_menu")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
          </button>
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group hover:opacity-80 transition-opacity bg-neutral-100 dark:bg-neutral-800/80 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border border-neutral-200/50 dark:border-neutral-700/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180"><path d="m15 18-6-6 6-6" /></svg>
            <span className="font-bold tracking-tight text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm hidden sm:block">{t("home")}</span>
          </Link>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 font-gabriela absolute left-1/2 -translate-x-1/2">Write Quran</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            aria-label={t("language_toggle")}
            aria-pressed={language === "ar"}
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

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-10 pb-24">
        <section className="text-center flex flex-col items-center justify-center gap-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] mb-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            {t("leaderboard")}
          </h2>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl">
            {t("leaderboard_desc")}
          </p>
        </section>

        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="bg-white dark:bg-neutral-800/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 overflow-hidden backdrop-blur-xl">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200/60 dark:border-neutral-800 text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
              <div className="col-span-2 sm:col-span-2 text-center">{t("rank")}</div>
              <div className="col-span-6 sm:col-span-6">{t("leader")}</div>
              <div className="col-span-4 sm:col-span-4 text-right">{t("rating")}</div>
            </div>

            {loading ? (
              <div role="status" aria-label={t("loading") || "Loading"} className="p-12 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-[#D6C19E]/30 border-t-[#D6C19E] rounded-full animate-spin" />
              </div>
            ) : loadError ? (
              <div className="p-12 text-center flex flex-col items-center gap-4">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("failed_to_load") || "Failed to load leaderboard."}</p>
                <button
                  onClick={fetchLeaderboard}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full border border-[#D6C19E]/50 text-[#B18E4E] dark:text-[#D6C19E] hover:bg-[#D6C19E]/10 transition-colors"
                >
                  {t("retry") || "Retry"}
                </button>
              </div>
            ) : leaders.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t("no_leaders_yet")}</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                {leaders.map((leader, idx) => (
                  <Link
                    key={leader.user_id}
                    href={`/leaderboard/${encodeURIComponent(leader.username)}`}
                    className={`grid grid-cols-12 gap-4 px-6 py-5 items-center transition-colors ${
                      idx === 0
                        ? "bg-gradient-to-r from-[#D6C19E]/12 via-transparent to-transparent dark:from-[#D6C19E]/10"
                        : "hover:bg-neutral-50/60 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-center">
                      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-black shadow-sm ${
                        idx < 3
                          ? topThreeStyles[idx]
                          : "border-neutral-200 bg-white text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
                      }`}>
                        {n(idx + 1)}
                      </span>
                    </div>
                    <div className="col-span-6 sm:col-span-6 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="font-extrabold text-neutral-800 dark:text-neutral-100 truncate text-lg">
                          {leader.public_display_name || maskUsername(leader.username)}
                        </div>
                        {activeUsername && activeUsername.toLowerCase() === leader.username.toLowerCase() ? (
                          <span className="shrink-0 rounded-full bg-[#D6C19E]/18 dark:bg-[#D6C19E]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B18E4E] dark:text-[#D6C19E]">
                            {t("you")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-4 text-right">
                      <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D6C19E] to-[#B18E4E] drop-shadow-[0_1px_1px_rgba(214,193,158,0.2)]">
                        {n(leader.hifz_score)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
    </div>
  );
}
