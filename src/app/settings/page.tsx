"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getURL } from "@/lib/get-url";
import { getStorage, setActiveUserId, setStorage } from "@/lib/storage";
import { useLanguage } from "@/lib/i18n";

type SettingsUser = {
  id: string;
  email: string;
  username: string | null;
  public_display_name: string | null;
};

type SettingsPreferences = {
  show_on_leaderboard: boolean;
  show_public_profile: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { t, language, setLanguage } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [displayNameLoading, setDisplayNameLoading] = useState(false);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<SettingsPreferences>({
    show_on_leaderboard: true,
    show_public_profile: true,
  });
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState<"reset" | "logout" | null>(null);
  const [accountMessage, setAccountMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isDisplayNameAvailable = async (candidate: string, currentUserId: string) => {
    const { data, error } = await supabase.rpc("is_public_display_name_available", {
      candidate_display_name: candidate,
      current_user_id: currentUserId,
    });

    if (error) {
      return { available: false, error: error.message || t("public_display_name_failed") };
    }

    return { available: Boolean(data), error: null };
  };

  useEffect(() => {
    const saved = getStorage("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = saved ? saved === "dark" : systemDark;
    setIsDarkMode(initialDark);
    if (initialDark) document.documentElement.classList.add("dark");
    setIsMounted(true);

    const loadSettings = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const [{ data: profileRes }, { data: prefRes }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("username, public_display_name")
          .eq("id", authUser.id)
          .single(),
        supabase
          .from("user_preferences")
          .select("show_on_leaderboard, show_public_profile")
          .eq("user_id", authUser.id)
          .single(),
      ]);

      setUser({
        id: authUser.id,
        email: authUser.email || "",
        username: profileRes?.username ?? authUser.user_metadata?.username ?? null,
        public_display_name: profileRes?.public_display_name ?? authUser.user_metadata?.username ?? null,
      });

      setDisplayNameInput(profileRes?.public_display_name ?? authUser.user_metadata?.username ?? "");

      const nextPrivacy = {
        show_on_leaderboard: prefRes?.show_on_leaderboard ?? getStorage("privacy_show_on_leaderboard") !== "false",
        show_public_profile: prefRes?.show_public_profile ?? getStorage("privacy_show_public_profile") !== "false",
      };

      setPrivacy(nextPrivacy);
      setStorage("privacy_show_on_leaderboard", String(nextPrivacy.show_on_leaderboard));
      setStorage("privacy_show_public_profile", String(nextPrivacy.show_public_profile));
      setLoading(false);
    };

    loadSettings();

    const handleThemeEvent = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    window.addEventListener("quran-typing-theme-change", handleThemeEvent);
    return () => window.removeEventListener("quran-typing-theme-change", handleThemeEvent);
  }, [supabase]);

  const toggleTheme = async (nextMode: "light" | "dark") => {
    const nextDark = nextMode === "dark";
    setIsDarkMode(nextDark);
    setStorage("theme", nextDark ? "dark" : "light");
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event("quran-typing-theme-change"));

    if (user) {
      await supabase.from("user_preferences").upsert({
        user_id: user.id,
        theme: nextDark ? "dark" : "light",
        visibility_mode: getStorage("visibility_mode") || "hidden",
        show_keyboard: getStorage("keyboard") === "true",
        show_on_leaderboard: privacy.show_on_leaderboard,
        show_public_profile: privacy.show_public_profile,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handlePrivacyToggle = (key: keyof SettingsPreferences, value: boolean) => {
    setPrivacyMessage(null);
    setPrivacy((prev) => {
      if (key === "show_public_profile" && !value) {
        return {
          show_public_profile: false,
          show_on_leaderboard: false,
        };
      }

      if (key === "show_on_leaderboard" && value) {
        return {
          ...prev,
          show_on_leaderboard: true,
          show_public_profile: true,
        };
      }

      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const handleSaveDisplayName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const cleaned = displayNameInput.trim();
    if (cleaned.length < 3) {
      setDisplayNameMessage(t("public_display_name_error"));
      return;
    }

    const availability = await isDisplayNameAvailable(cleaned, user.id);
    if (availability.error) {
      setDisplayNameMessage(availability.error);
      return;
    }
    if (!availability.available) {
      setDisplayNameMessage(t("public_display_name_taken"));
      return;
    }

    setDisplayNameLoading(true);
    setDisplayNameMessage(null);
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ public_display_name: cleaned })
      .eq("id", user.id);
      
    const { data: refreshedProfile, error: refreshedProfileError } = await supabase
      .from("user_profiles")
      .select("public_display_name")
      .eq("id", user.id)
      .single();

    setDisplayNameLoading(false);

    if (error) {
      const duplicateError = error.message?.toLowerCase().includes("duplicate")
        || error.message?.toLowerCase().includes("unique");
      setDisplayNameMessage(duplicateError ? t("public_display_name_taken") : (error.message || t("public_display_name_failed")));
      return;
    }

    if (refreshedProfileError || refreshedProfile?.public_display_name !== cleaned) {
      setDisplayNameMessage(t("public_display_name_failed"));
      return;
    }

    setUser((prev) => (prev ? { ...prev, public_display_name: cleaned } : prev));
    setDisplayNameMessage(t("public_display_name_saved"));
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    setPrivacyLoading(true);
    setPrivacyMessage(null);

    const nextPrivacy = {
      show_on_leaderboard: privacy.show_on_leaderboard,
      show_public_profile: privacy.show_public_profile,
    };

    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      theme: getStorage("theme") || (isDarkMode ? "dark" : "light"),
      visibility_mode: getStorage("visibility_mode") || "hidden",
      show_keyboard: getStorage("keyboard") === "true",
      show_on_leaderboard: nextPrivacy.show_on_leaderboard,
      show_public_profile: nextPrivacy.show_public_profile,
      updated_at: new Date().toISOString(),
    });

    setPrivacyLoading(false);

    if (error) {
      setPrivacyMessage(error.message || t("privacy_save_failed"));
      return;
    }

    setStorage("privacy_show_on_leaderboard", String(nextPrivacy.show_on_leaderboard));
    setStorage("privacy_show_public_profile", String(nextPrivacy.show_public_profile));
    setPrivacyMessage(t("privacy_saved"));
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setAccountLoading("reset");
    setAccountMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${getURL()}/?update_password=true`,
    });
    setAccountLoading(null);
    if (error) {
      setAccountMessage({ type: "error", text: error.message || t("reset_email_failed") });
      return;
    }
    setAccountMessage({ type: "success", text: t("reset_email_sent") });
  };

  const handleLogout = async () => {
    setAccountLoading("logout");
    await supabase.auth.signOut();
    setActiveUserId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("active_username");
    }
    setUser(null);
    setAccountLoading(null);
    router.push("/");
    router.refresh();
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 transition-colors duration-500" />;
  }

  const profileHref = user?.username ? `/leaderboard/${encodeURIComponent(user.username)}` : null;

  const settingSections = user ? (
    <div className="grid gap-6">
      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{t("settings_profile")}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("settings_profile_desc")}</p>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={handleSaveDisplayName} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="w-full sm:max-w-[240px]">
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">{t("public_display_name_placeholder")}</label>
              <input
                type="text"
                value={displayNameInput}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder={t("public_display_name_placeholder")}
                className="w-full rounded-md bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-[#D6C19E]/50 focus:border-[#D6C19E] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={displayNameLoading}
              className="w-full sm:w-auto rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white disabled:opacity-50 px-3 py-2 text-xs font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              {displayNameLoading ? t("loading") : t("save_display_name")}
            </button>
          </form>
          {displayNameMessage ? (
            <p className={`mt-3 text-sm font-medium ${displayNameMessage === t("public_display_name_taken")
              ? "text-red-500 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"}`}>
              {displayNameMessage}
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{t("privacy_settings")}</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("privacy_settings_desc")}</p>
          </div>
        </div>
        <div className="px-6 py-6 grid gap-6">
          <div className="grid gap-4">
            {[
              {
                key: "show_on_leaderboard" as const,
                label: t("show_on_leaderboard"),
                description: t("show_on_leaderboard_desc"),
                enabled: privacy.show_on_leaderboard,
              },
              {
                key: "show_public_profile" as const,
                label: t("show_public_profile"),
                description: t("show_public_profile_desc"),
                enabled: privacy.show_public_profile,
              },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 py-1">
                <div className="flex-1 pr-8">
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.label}</div>
                  <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.enabled}
                  onClick={() => handlePrivacyToggle(item.key, !item.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D6C19E] focus:ring-offset-2 dark:focus:ring-offset-neutral-900 ${item.enabled ? 'bg-[#D6C19E]' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                >
                  <span aria-hidden="true" className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.enabled ? (language === "ar" ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-950 px-4 py-4 border border-neutral-100 dark:border-neutral-800">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              {t("privacy_explainer_title")}
            </h4>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">{t("privacy_explainer_body")}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-100 dark:border-neutral-800 pt-5 mt-2">
            <p className="text-[13px] text-neutral-500 mb-4 sm:mb-0">
              {privacyMessage ? (
                <span className={privacyMessage === t("privacy_saved") ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                  {privacyMessage}
                </span>
              ) : (
                privacy.show_on_leaderboard ? t("show_on_leaderboard_desc") : t("show_public_profile_desc")
              )}
            </p>
            <button
              type="button"
              onClick={handleSavePrivacy}
              disabled={privacyLoading}
              className="rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white disabled:opacity-50 px-3 py-2 text-xs font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              {privacyLoading ? t("loading") : t("save_privacy")}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{t("account_actions")}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("account_actions_desc")}</p>
        </div>
        <div className="px-6 py-6">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 px-4 py-4 mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 mb-1">{t("signed_in_as")}</div>
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 break-all">{user.email}</div>
          </div>
          
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5">
            {profileHref ? (
              <Link
                href={profileHref}
                className="w-full sm:w-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 text-center transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                {t("open_public_profile")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={accountLoading !== null}
              className="w-full sm:w-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
            >
              {accountLoading === "reset" ? t("loading") : t("send_reset_email")}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={accountLoading !== null}
              className="w-full sm:w-auto rounded-md border border-red-200 dark:border-red-900/50 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 sm:ml-auto whitespace-nowrap"
            >
              {accountLoading === "logout" ? t("loading") : t("sign_out")}
            </button>
          </div>
          {accountMessage ? (
            <p className={`mt-4 text-sm font-medium ${accountMessage.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-500 dark:text-red-400"}`}>
              {accountMessage.text}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  ) : (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm px-6 py-8 text-center flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4 text-neutral-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{t("account_actions")}</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("sign_in_required_settings")}</p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-6 py-2.5 text-sm font-medium transition-colors"
      >
        {t("go_home")}
      </Link>
    </section>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-500 overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-[#D6C19E]/8 to-transparent pointer-events-none" />

      <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 sm:px-10 lg:px-12 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-neutral-200 dark:border-neutral-700 rtl:rotate-180">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
          <span className="font-bold tracking-tight text-neutral-800 dark:text-neutral-100 hidden sm:block">{t("home")}</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            className="flex items-center justify-center w-10 h-10 rounded-full text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            title={t("language_toggle")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
          </button>
          <button
            onClick={() => toggleTheme(isDarkMode ? "light" : "dark")}
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

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 sm:py-12 flex flex-col gap-8 pb-24">
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {t("settings")}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {t("settings_desc")}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-[1fr_280px] animate-in slide-in-from-bottom-6 fade-in duration-700">
          <div className="grid gap-6">
            {settingSections}
          </div>

          <div className="grid gap-6 content-start">
            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
              <div className="border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{t("appearance_settings")}</h2>
              </div>
              <div className="p-5 grid gap-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{t("language_setting")}</div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/50">
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${language === "en"
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("ar")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${language === "ar"
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"}`}
                    >
                      العربية
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">{t("theme_setting")}</div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/50">
                    <button
                      type="button"
                      onClick={() => toggleTheme("light")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!isDarkMode
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"}`}
                    >
                      {t("theme_light")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTheme("dark")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isDarkMode
                        ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"}`}
                    >
                      {t("theme_dark")}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3">{t("trust_center_title")}</h2>
              <div className="flex flex-col gap-2">
                <Link
                  href="/privacy"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-1"
                >
                  {t("trust_center_privacy_link")}
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-1"
                >
                  {t("trust_center_terms_link")}
                </Link>
                <Link
                  href="/contact"
                  className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-1"
                >
                  {t("trust_center_contact")}
                </Link>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
