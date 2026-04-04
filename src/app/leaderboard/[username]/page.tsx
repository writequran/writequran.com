"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { getStorage, setStorage } from "@/lib/storage";

interface LeaderboardProfile {
  user_id: string;
  username: string;
  total_letters_typed: number;
  total_surahs_practiced: number;
  total_completed_surahs: number;
  total_ayat_completed: number;
  accuracy_percentage: number;
  streak_active: number;
  hifz_score: number;
}

export default function LeaderboardProfilePage() {
  const { t, n, language, setLanguage } = useLanguage();
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profile, setProfile] = useState<LeaderboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getStorage("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = saved ? saved === "dark" : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add("dark");
    setIsMounted(true);

    const fetchProfile = async () => {
      if (!username) {
        setLoadError("Missing username.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_leaderboard_profile", {
        profile_username: decodeURIComponent(username),
      });

      if (error) {
        setLoadError(error.message || "Failed to load player profile.");
      } else {
        const nextProfile = Array.isArray(data) ? data[0] : null;
        setProfile(nextProfile || null);
      }

      setLoading(false);
    };

    fetchProfile();

    const handleThemeEvent = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("quran-typing-theme-change", handleThemeEvent);
    return () => window.removeEventListener("quran-typing-theme-change", handleThemeEvent);
  }, [username]);

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

  const statCards = profile ? [
    { label: t("rating"), value: n(profile.hifz_score) },
    { label: t("typed_letters"), value: n(profile.total_letters_typed) },
    { label: t("completed_surahs"), value: n(profile.total_completed_surahs) },
    { label: t("completed_ayat"), value: n(profile.total_ayat_completed) },
    { label: t("practiced_surahs"), value: n(profile.total_surahs_practiced) },
    { label: t("accuracy"), value: `${n(profile.accuracy_percentage)}%` },
    { label: t("streak"), value: n(profile.streak_active) },
  ] : [];

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-500 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#D6C19E]/10 to-transparent pointer-events-none" />
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#D6C19E]/5 blur-[120px] rounded-full pointer-events-none" />

      <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 sm:px-10 lg:px-12 flex justify-between items-center">
        <Link href="/leaderboard" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 rtl:rotate-180">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
          <span className="font-bold tracking-tight text-neutral-800 dark:text-neutral-100 hidden sm:block">{t("back_to_leaderboard")}</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 font-gabriela absolute left-1/2 -translate-x-1/2">Write Quran</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            title={t("language_toggle")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            title={isDarkMode ? t("light_mode") : t("night_mode")}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-10 pb-24">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[#D6C19E]/30 border-t-[#D6C19E] rounded-full animate-spin"></div>
          </div>
        ) : loadError ? (
          <div className="p-12 text-center text-red-500 font-medium">{loadError}</div>
        ) : !profile ? (
          <div className="p-12 text-center text-neutral-500 dark:text-neutral-400 font-medium">{t("player_not_found")}</div>
        ) : (
          <>
            <section className="text-center flex flex-col items-center justify-center gap-4 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] mb-2 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21a8 8 0 1 0-12 0"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-neutral-400 dark:text-neutral-500">
                {t("player_profile")}
              </p>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 break-all">
                {profile.username}
              </h2>
            </section>

            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-6 fade-in duration-900">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[1.75rem] border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-xl"
                >
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-neutral-400 dark:text-neutral-500">
                    {card.label}
                  </div>
                  <div className="mt-3 text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-50">
                    {card.value}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
