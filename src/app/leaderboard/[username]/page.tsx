"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { getStorage, setStorage } from "@/lib/storage";
import { loadActivityHistory } from "@/lib/stats";

interface LeaderboardProfile {
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

interface PublicProfileMeta {
  user_id: string;
  username: string;
  public_display_name: string;
  created_at: string;
  streak_last_active_date: string | null;
  last_practiced_at: string | null;
  global_rank: number | null;
}

type ActivityCell = {
  key: string;
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LABELS_AR = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function formatDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getActivityLevel(count: number): ActivityCell["level"] {
  if (count <= 0) return 0;
  if (count < 8) return 1;
  if (count < 20) return 2;
  if (count < 45) return 3;
  return 4;
}

export default function LeaderboardProfilePage() {
  const { t, n, language, setLanguage } = useLanguage();
  const params = useParams<{ username: string }>();
  const username = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profile, setProfile] = useState<LeaderboardProfile | null>(null);
  const [profileMeta, setProfileMeta] = useState<PublicProfileMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [activityHistory, setActivityHistory] = useState<Record<string, number>>({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [displayNameLoading, setDisplayNameLoading] = useState(false);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = getStorage("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = saved ? saved === "dark" : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add("dark");
    setIsMounted(true);
    setActiveUsername(getStorage("active_username"));
    const nextActivityHistory = loadActivityHistory();
    setActivityHistory(nextActivityHistory);

    const historyYears = Object.keys(nextActivityHistory)
      .map((key) => Number.parseInt(key.slice(0, 4), 10))
      .filter((year) => !Number.isNaN(year));
    const latestYear = historyYears.length > 0 ? Math.max(...historyYears) : new Date().getFullYear();
    setSelectedYear(latestYear);

    const fetchProfile = async () => {
      if (!username) {
        setLoadError("Missing username.");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const [profileRes, metaRes] = await Promise.all([
        supabase.rpc("get_leaderboard_profile", {
          profile_username: decodeURIComponent(username),
        }),
        supabase.rpc("get_public_profile_meta", {
          profile_username: decodeURIComponent(username),
        }),
      ]);

      if (profileRes.error) {
        setLoadError(profileRes.error.message || "Failed to load player profile.");
      } else {
        const nextProfile = Array.isArray(profileRes.data) ? profileRes.data[0] : null;
        setProfile(nextProfile || null);
        setDisplayNameInput(nextProfile?.public_display_name || "");
      }

      if (!metaRes.error) {
        const nextMeta = Array.isArray(metaRes.data) ? metaRes.data[0] : null;
        setProfileMeta(nextMeta || null);
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

  const primaryStatCards = profile ? [
    { label: t("rating"), value: n(profile.hifz_score) },
    { label: t("completed_ayat"), value: n(profile.total_ayat_completed) },
    { label: t("typed_letters"), value: n(profile.total_letters_typed) },
    { label: t("accuracy"), value: `${n(profile.accuracy_percentage)}%` },
  ] : [];

  const secondaryStatCards = profile ? [
    { label: t("completed_surahs"), value: n(profile.total_completed_surahs) },
    { label: t("practiced_surahs"), value: n(profile.total_surahs_practiced) },
    { label: t("streak"), value: n(profile.streak_active) },
  ] : [];

  const isOwnProfile = Boolean(
    profile &&
    activeUsername &&
    profile.username.toLowerCase() === activeUsername.toLowerCase()
  );

  const availableYears = Array.from(
    new Set([
      new Date().getFullYear(),
      ...Object.keys(activityHistory)
        .map((key) => Number.parseInt(key.slice(0, 4), 10))
        .filter((year) => !Number.isNaN(year)),
    ])
  ).sort((a, b) => b - a);

  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31);
  const firstGridDay = startOfWeek(yearStart);
  const lastGridDay = startOfWeek(new Date(yearEnd.getFullYear(), yearEnd.getMonth(), yearEnd.getDate() + 6));
  const weeksToShow = Math.round((lastGridDay.getTime() - firstGridDay.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const monthLabels: Array<{ label: string; column: number }> = [];
  const activityWeeks: ActivityCell[][] = [];
  const mobileMonthGrids = Array.from({ length: 12 }).map((_, monthIndex) => {
    const monthStart = new Date(selectedYear, monthIndex, 1);
    const monthEnd = new Date(selectedYear, monthIndex + 1, 0);
    const firstMonthGridDay = startOfWeek(monthStart);
    const monthGridEnd = new Date(monthEnd);
    monthGridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
    monthGridEnd.setHours(0, 0, 0, 0);
    const totalDays = Math.round((monthGridEnd.getTime() - firstMonthGridDay.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    return {
      label: language === "ar" ? MONTH_LABELS_AR[monthIndex] : MONTH_LABELS_EN[monthIndex],
      cells: Array.from({ length: totalDays }).map((__, dayOffset) => {
        const date = new Date(firstMonthGridDay);
        date.setDate(firstMonthGridDay.getDate() + dayOffset);
        const key = formatDayKey(date);
        const count = activityHistory[key] || 0;
        return {
          key,
          inMonth: date.getMonth() === monthIndex,
          level: getActivityLevel(count),
          count,
        };
      }),
    };
  });

  for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
    const weekCells: ActivityCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(firstGridDay);
      date.setDate(firstGridDay.getDate() + (weekIndex * 7) + dayIndex);
      const key = formatDayKey(date);
      const count = activityHistory[key] || 0;
      weekCells.push({
        key,
        date,
        count,
        level: getActivityLevel(count),
      });
    }

    const weekStart = weekCells[0]?.date;
    if (
      weekStart &&
      weekStart.getFullYear() === selectedYear &&
      (weekIndex === 0 || weekStart.getMonth() !== activityWeeks[weekIndex - 1][0].date.getMonth())
    ) {
      monthLabels.push({
        label: language === "ar"
          ? MONTH_LABELS_AR[weekStart.getMonth()]
          : MONTH_LABELS_EN[weekStart.getMonth()],
        column: weekIndex,
      });
    }

    activityWeeks.push(weekCells);
  }

  const getActivityCellClassName = (level: ActivityCell["level"]) => {
    if (level === 0) {
      return "bg-neutral-100 dark:bg-neutral-800/80";
    }
    if (level === 1) {
      return "bg-[#EDE2CC] dark:bg-[#5A4B31]/70";
    }
    if (level === 2) {
      return "bg-[#D6C19E]/70 dark:bg-[#8C7348]/75";
    }
    if (level === 3) {
      return "bg-[#C9A86D] dark:bg-[#B18E4E]";
    }
    return "bg-[#B18E4E] dark:bg-[#D6C19E] shadow-[0_0_16px_rgba(177,142,78,0.28)] dark:shadow-[0_0_18px_rgba(214,193,158,0.3)]";
  };

  const maskUsername = (value: string) => {
    if (!value) return "User";
    if (value.length <= 2) return `${value[0] || "U"}***`;
    if (value.length <= 5) return `${value.slice(0, 2)}***`;
    return `${value.slice(0, 3)}***${value.slice(-1)}`;
  };

  const visibleDisplayName = profile?.public_display_name || (profile ? maskUsername(profile.username) : "");
  const formatProfileDate = (value?: string | null, mode: "long" | "month" = "long") => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
      year: "numeric",
      month: mode === "month" ? "long" : "short",
      ...(mode === "long" ? { day: "numeric" } : {}),
    }).format(date);
  };
  const joinedDateLabel = formatProfileDate(profileMeta?.created_at, "month");
  const lastActiveLabel = formatProfileDate(profileMeta?.last_practiced_at || profileMeta?.streak_last_active_date, "long");
  const identitySummary = profile ? [
    profileMeta?.global_rank ? `${t("rank")} #${n(profileMeta.global_rank)}` : null,
    joinedDateLabel ? `${t("joined")} ${joinedDateLabel}` : null,
    lastActiveLabel ? `${t("last_active")} ${lastActiveLabel}` : null,
  ].filter(Boolean) : [];
  const recentActivitySummary = profile ? (
    profile.streak_active > 0 && lastActiveLabel
      ? `${t("recent_activity_summary_active")} ${lastActiveLabel}. ${t("current_streak_summary")} ${n(profile.streak_active)} ${t("days_label")}.`
      : `${t("recent_activity_summary_progress")} ${n(profile.total_surahs_practiced)} ${t("practiced_surahs").toLowerCase()} · ${n(profile.total_ayat_completed)} ${t("completed_ayat").toLowerCase()}.`
  ) : "";

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const cleaned = displayNameInput.trim();
    if (cleaned.length < 3) {
      setDisplayNameMessage(t("public_display_name_error"));
      return;
    }

    setDisplayNameLoading(true);
    setDisplayNameMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({ public_display_name: cleaned })
      .eq("id", profile.user_id);

    setDisplayNameLoading(false);

    if (error) {
      const duplicateError = error.message?.toLowerCase().includes("duplicate")
        || error.message?.toLowerCase().includes("unique");
      setDisplayNameMessage(duplicateError ? t("public_display_name_taken") : (error.message || t("public_display_name_failed")));
      return;
    }

    setProfile((prev) => (prev ? { ...prev, public_display_name: cleaned } : prev));
    setDisplayNameMessage(t("public_display_name_saved"));
  };

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
            <section className="animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="rounded-[1.75rem] border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-5 sm:px-6 sm:py-6 shadow-[0_8px_28px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_28px_rgb(0,0,0,0.2)] backdrop-blur-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E] shadow-sm shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 21a8 8 0 1 0-12 0" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">
                        {t("player_profile")}
                      </p>
                      <h2 className="mt-1.5 text-2xl sm:text-3xl lg:text-[2rem] font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 break-words leading-tight">
                        {visibleDisplayName}
                      </h2>
                      {isOwnProfile ? (
                        <p className="mt-1.5 text-xs sm:text-sm font-semibold text-neutral-400 dark:text-neutral-500">
                          @{profile.username}
                        </p>
                      ) : null}
                      {identitySummary.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {identitySummary.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[#D6C19E]/25 bg-[#F8F1E6]/85 dark:bg-neutral-900/65 dark:border-[#D6C19E]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#B18E4E] dark:text-[#D6C19E]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-start justify-start lg:justify-end">
                    <div className="rounded-[1.25rem] border border-[#D6C19E]/30 bg-[#F8F1E6]/85 dark:bg-neutral-900/70 dark:border-[#D6C19E]/20 px-4 py-3 min-w-[6.5rem] text-center shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B18E4E] dark:text-[#D6C19E]">
                        {t("rank")}
                      </div>
                      <div className="mt-1.5 text-2xl sm:text-[1.75rem] font-black text-neutral-900 dark:text-neutral-50">
                        {profileMeta?.global_rank ? `#${n(profileMeta.global_rank)}` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                    {t("recent_activity")}
                  </div>
                  <p className="mt-1.5 text-sm sm:text-[15px] font-medium leading-relaxed text-neutral-700 dark:text-neutral-200">
                    {recentActivitySummary}
                  </p>
                </div>
              </div>
            </section>

            {isOwnProfile && (
              <section className="animate-in slide-in-from-bottom-5 fade-in duration-800">
                <div className="rounded-[1.5rem] border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-5 shadow-[0_8px_28px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_28px_rgb(0,0,0,0.2)] backdrop-blur-xl">
                  <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                      {t("public_display_name")}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {t("public_display_name_desc")}
                    </p>
                  </div>
                  <form onSubmit={handleSaveDisplayName} className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder={t("public_display_name_placeholder")}
                      className="flex-1 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm font-semibold text-neutral-800 dark:text-neutral-100 outline-none focus:border-[#D6C19E]"
                    />
                    <button
                      type="submit"
                      disabled={displayNameLoading}
                      className="rounded-2xl bg-[#D6C19E] hover:bg-[#c2ad8a] disabled:opacity-70 text-white px-5 py-3 text-sm font-bold transition-colors"
                    >
                      {displayNameLoading ? t("loading") : t("save_display_name")}
                    </button>
                  </form>
                  {displayNameMessage ? (
                    <p className={`mt-3 text-sm font-medium ${displayNameMessage === t("public_display_name_taken")
                      ? "text-red-500 dark:text-red-400"
                      : "text-[#B18E4E] dark:text-[#D6C19E]"
                      }`}>
                      {displayNameMessage}
                    </p>
                  ) : null}
                </div>
              </section>
            )}

            <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 animate-in slide-in-from-bottom-6 fade-in duration-900">
              {primaryStatCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[1.35rem] border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-4 py-4 sm:px-5 sm:py-5 shadow-[0_8px_24px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_24px_rgb(0,0,0,0.18)] backdrop-blur-xl"
                >
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                    {card.label}
                  </div>
                  <div className="mt-2.5 text-2xl sm:text-3xl lg:text-[2rem] font-black text-neutral-900 dark:text-neutral-50 leading-none">
                    {card.value}
                  </div>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 animate-in slide-in-from-bottom-7 fade-in duration-950">
              {secondaryStatCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[1.25rem] border border-neutral-200/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-800/55 px-4 py-4 shadow-[0_8px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_20px_rgb(0,0,0,0.16)] backdrop-blur-xl"
                >
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                    {card.label}
                  </div>
                  <div className="mt-2 text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-50 leading-none">
                    {card.value}
                  </div>
                </div>
              ))}
            </section>

            {isOwnProfile && (
              <section className="animate-in slide-in-from-bottom-8 fade-in duration-1000">
                <div className="rounded-[2rem] border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                        {t("activity_tracker")}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-[#B18E4E] dark:text-[#D6C19E]">
                        {t("private_activity_note")}
                      </p>
                    </div>
                    <label className="relative shrink-0">
                      <span className="sr-only">Choose year</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number.parseInt(e.target.value, 10))}
                        className="appearance-none rounded-2xl border border-[#D6C19E]/40 bg-[#F8F1E6] dark:bg-neutral-900/80 dark:border-[#D6C19E]/30 px-4 py-2.5 pr-10 text-sm font-bold text-[#8E6B2F] dark:text-[#E6CAA0] shadow-sm outline-none transition-colors hover:border-[#D6C19E] focus:border-[#D6C19E]"
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {n(year)}
                          </option>
                        ))}
                      </select>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B18E4E] dark:text-[#D6C19E]"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </label>
                  </div>

                  <div className="w-full pb-2">
                    <div className="grid grid-cols-2 gap-3 sm:hidden">
                      {mobileMonthGrids.map((month) => (
                        <div
                          key={`mobile-month-${month.label}`}
                          className="rounded-2xl border border-[#D6C19E]/25 bg-[#FCF7EF] dark:bg-neutral-900/50 dark:border-[#D6C19E]/15 p-3"
                        >
                          <div className="mb-2 text-center text-sm font-bold text-[#B18E4E] dark:text-[#D6C19E]">
                            {month.label}
                          </div>
                          <div className="grid grid-cols-7 gap-[2px]">
                            {WEEKDAY_LABELS.map((weekday, dayIndex) => (
                              <div
                                key={`mobile-weekday-${month.label}-${dayIndex}`}
                                className="text-center text-[9px] font-bold text-[#B18E4E] dark:text-[#D6C19E]"
                              >
                                {weekday}
                              </div>
                            ))}
                            {month.cells.map((cell) => (
                              <div
                                key={`mobile-cell-${cell.key}`}
                                title={`${cell.key}: ${n(cell.count)}`}
                                className={`aspect-square w-full rounded-none ${cell.inMonth
                                  ? getActivityCellClassName(cell.level)
                                  : "bg-transparent"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden sm:block w-full">
                      <div className="grid gap-x-[2px] gap-y-[1px] h-6 mb-2" style={{ gridTemplateColumns: `1.15rem repeat(${weeksToShow}, minmax(0, 1fr))` }}>
                        <div />
                        {Array.from({ length: weeksToShow }).map((_, columnIndex) => {
                          const label = monthLabels.find((item) => item.column === columnIndex);
                          return (
                            <div key={`month-${columnIndex}`} className="relative">
                              {label ? (
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 text-[9px] sm:text-[10px] md:text-xs font-bold text-[#B18E4E] dark:text-[#D6C19E] whitespace-nowrap leading-none">
                                  {label.label}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid gap-x-[2px] gap-y-[1px]" style={{ gridTemplateColumns: `1.15rem repeat(${weeksToShow}, minmax(0, 1fr))` }}>
                        {WEEKDAY_LABELS.map((weekday, dayIndex) => (
                          <div key={`row-${weekday}-${dayIndex}`} className="contents">
                            <div className="flex items-center justify-center text-[10px] sm:text-xs font-bold text-[#B18E4E] dark:text-[#D6C19E]">
                              {weekday}
                            </div>
                            {activityWeeks.map((week, weekIndex) => {
                              const cell = week[dayIndex];
                              const isInSelectedYear = cell.date.getFullYear() === selectedYear;
                              return (
                                <div
                                  key={cell.key}
                                  title={`${cell.key}: ${n(cell.count)}`}
                                  className={`aspect-square w-full rounded-none transition-transform duration-200 hover:scale-105 ${isInSelectedYear
                                    ? getActivityCellClassName(cell.level)
                                    : "bg-transparent border-transparent"
                                    }`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="relative z-10 w-full text-center py-8 mt-auto text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
        <p>© <span className="text-[#B18E4E] dark:text-[#D6C19E]">WriteQuran.com</span></p>
      </footer>
    </div>
  );
}
