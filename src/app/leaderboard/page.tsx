"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

type LeaderboardPeriod = "all_time" | "monthly" | "weekly";

export default function LeaderboardPage() {
  const { t, language, n, setLanguage } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>("all_time");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const maskUsername = (value: string) => {
    if (!value) return "User";
    if (value.length <= 2) return `${value[0] || "U"}***`;
    if (value.length <= 5) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 3)}***${value.slice(-1)}`;
  };

  const fetchLeaderboard = useCallback(async (period: LeaderboardPeriod) => {
    setLoading(true);
    setLoadError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_leaderboard_by_period", {
      period_key: period,
    });
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

    const handleThemeEvent = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    window.addEventListener("quran-typing-theme-change", handleThemeEvent);
    return () => window.removeEventListener("quran-typing-theme-change", handleThemeEvent);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    fetchLeaderboard(selectedPeriod);
  }, [fetchLeaderboard, isMounted, selectedPeriod]);

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
    "border-[#D6C19E]/60 bg-[#D6C19E]/15 text-[#8E6B2F] dark:bg-[#D6C19E]/10 dark:text-[#D6C19E] dark:border-[#D6C19E]/30",
    "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-400",
    "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-400",
  ];

  const periodOptions: { key: LeaderboardPeriod; label: string }[] = [
    { key: "weekly", label: t("leaderboard_weekly") },
    { key: "monthly", label: t("leaderboard_monthly") },
    { key: "all_time", label: t("leaderboard_all_time") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-500 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-[#D6C19E]/8 to-transparent pointer-events-none" />

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

      <main className="relative z-10 w-full flex-1 max-w-4xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-8 pb-24">
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {t("leaderboard")}
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {t("leaderboard_desc")}
            </p>
          </div>
        </section>

        <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="bg-white dark:bg-neutral-800/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-200/60 dark:border-neutral-800 overflow-hidden backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/50 dark:bg-neutral-900/30">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Global Rankings</h3>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-[#D6C19E]/30 dark:border-[#D6C19E]/20 bg-[#F8F1E6]/80 hover:bg-[#F8F1E6] dark:bg-[#1a150e]/60 dark:hover:bg-[#1a150e]/80 px-3 py-1.5 text-[11px] sm:text-xs font-bold tracking-wider text-[#B18E4E] dark:text-[#D6C19E] shadow-sm outline-none transition-all focus:ring-2 focus:ring-[#D6C19E]/50"
                >
                  {periodOptions.find(o => o.key === selectedPeriod)?.label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${isPeriodDropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isPeriodDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-32 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 bg-white dark:bg-neutral-800 p-1.5 shadow-lg shadow-black/5 dark:shadow-black/20 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {periodOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSelectedPeriod(option.key);
                          setIsPeriodDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                          selectedPeriod === option.key
                            ? "bg-[#D6C19E]/15 text-[#B18E4E] dark:bg-[#D6C19E]/10 dark:text-[#D6C19E]"
                            : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white dark:bg-neutral-800 border-b border-neutral-200/60 dark:border-neutral-700/60 text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
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
                  onClick={() => fetchLeaderboard(selectedPeriod)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full border border-[#D6C19E]/50 text-[#B18E4E] dark:text-[#D6C19E] hover:bg-[#D6C19E]/10 transition-colors"
                >
                  {t("retry") || "Retry"}
                </button>
              </div>
            ) : leaders.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {selectedPeriod === "all_time" ? t("no_leaders_yet") : t("leaderboard_period_empty")}
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {leaders.map((leader, idx) => (
                  <Link
                    key={leader.user_id}
                    href={`/leaderboard/${encodeURIComponent(leader.username)}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 border-b border-neutral-200/80 dark:border-neutral-700/60 last:border-0"
                  >
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-center">
                      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                        idx < 3
                          ? topThreeStyles[idx]
                          : "border-neutral-200 bg-white text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500"
                      }`}>
                        {n(idx + 1)}
                      </span>
                    </div>
                    <div className="col-span-6 sm:col-span-6 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="font-semibold text-neutral-700 dark:text-neutral-200 truncate text-sm">
                          {leader.public_display_name || maskUsername(leader.username)}
                        </div>
                        {activeUsername && activeUsername.toLowerCase() === leader.username.toLowerCase() ? (
                          <span className="shrink-0 rounded-md bg-[#D6C19E]/18 dark:bg-[#D6C19E]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#B18E4E] dark:text-[#D6C19E]">
                            {t("you")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-4 text-right">
                      <div className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50 tabular-nums">
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
