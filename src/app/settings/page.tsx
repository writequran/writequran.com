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

    setDisplayNameLoading(true);
    setDisplayNameMessage(null);
    const { error } = await supabase
      .from("user_profiles")
      .update({ public_display_name: cleaned })
      .eq("id", user.id);

    setDisplayNameLoading(false);

    if (error) {
      const duplicateError = error.message?.toLowerCase().includes("duplicate")
        || error.message?.toLowerCase().includes("unique");
      setDisplayNameMessage(duplicateError ? t("public_display_name_taken") : (error.message || t("public_display_name_failed")));
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
      <section className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("settings_profile")}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("settings_profile_desc")}</p>
        </div>
        <form onSubmit={handleSaveDisplayName} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={displayNameInput}
            onChange={(event) => setDisplayNameInput(event.target.value)}
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
            : "text-[#B18E4E] dark:text-[#D6C19E]"}`}>
            {displayNameMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none">
        <div className="mb-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("privacy_settings")}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("privacy_settings_desc")}</p>
        </div>
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
            <button
              key={item.key}
              type="button"
              onClick={() => handlePrivacyToggle(item.key, !item.enabled)}
              className="w-full rounded-2xl border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-4 text-left transition-colors hover:border-[#D6C19E]/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-neutral-900 dark:text-neutral-50">{item.label}</div>
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{item.description}</p>
                </div>
                <div className={`mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-[2px] transition-colors ${item.enabled
                  ? "bg-[#D6C19E] border-[#D6C19E]/80"
                  : "bg-neutral-200 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600"
                  }`}>
                  <div className={`h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform duration-200 ${item.enabled ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {privacy.show_on_leaderboard ? t("show_on_leaderboard_desc") : t("show_public_profile_desc")}
          </p>
          <button
            type="button"
            onClick={handleSavePrivacy}
            disabled={privacyLoading}
            className="rounded-2xl bg-[#D6C19E] hover:bg-[#c2ad8a] disabled:opacity-70 text-white px-5 py-3 text-sm font-bold transition-colors"
          >
            {privacyLoading ? t("loading") : t("save_privacy")}
          </button>
        </div>
        {privacyMessage ? (
          <p className={`mt-3 text-sm font-medium ${privacyMessage === t("privacy_saved")
            ? "text-[#B18E4E] dark:text-[#D6C19E]"
            : "text-red-500 dark:text-red-400"}`}>
            {privacyMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none">
        <div className="mb-5">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("account_actions")}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("account_actions_desc")}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">{t("signed_in_as")}</div>
          <div className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-50 break-all">{user.email}</div>
          {user.username ? (
            <div className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">@{user.username}</div>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {profileHref ? (
            <Link
              href={profileHref}
              className="rounded-2xl border border-[#D6C19E]/40 bg-[#F8F1E6] dark:bg-neutral-900/80 dark:border-[#D6C19E]/25 px-4 py-3 text-sm font-bold text-[#8E6B2F] dark:text-[#E6CAA0] text-center transition-colors hover:border-[#D6C19E]"
            >
              {t("open_public_profile")}
            </Link>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={accountLoading !== null}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-bold text-neutral-700 dark:text-neutral-200 transition-colors hover:border-[#D6C19E]"
          >
            {accountLoading === "reset" ? t("loading") : t("send_reset_email")}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={accountLoading !== null}
            className="rounded-2xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/25 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-950/40"
          >
            {accountLoading === "logout" ? t("loading") : t("sign_out")}
          </button>
        </div>
        {accountMessage ? (
          <p className={`mt-3 text-sm font-medium ${accountMessage.type === "success"
            ? "text-[#B18E4E] dark:text-[#D6C19E]"
            : "text-red-500 dark:text-red-400"}`}>
            {accountMessage.text}
          </p>
        ) : null}
      </section>
    </div>
  ) : (
    <section className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("account_actions")}</h2>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t("sign_in_required_settings")}</p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-2xl bg-[#D6C19E] hover:bg-[#c2ad8a] text-white px-5 py-3 text-sm font-bold transition-colors"
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

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 sm:py-12 sm:px-10 lg:px-12 flex flex-col gap-8 pb-24">
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {t("settings")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t("settings_desc")}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] animate-in slide-in-from-bottom-6 fade-in duration-900">
          <div className="grid gap-6">
            {settingSections}
          </div>

          <div className="grid gap-6 content-start">
            <section className="rounded-3xl border border-neutral-200/70 dark:border-neutral-800 bg-white/90 dark:bg-neutral-800/70 px-5 py-6 sm:px-6 shadow-[0_2px_12px_rgb(0,0,0,0.04)] dark:shadow-none">
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{t("appearance_settings")}</h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("appearance_settings_desc")}</p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">{t("language_setting")}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${language === "en"
                        ? "bg-[#D6C19E] text-white"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"}`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("ar")}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${language === "ar"
                        ? "bg-[#D6C19E] text-white"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"}`}
                    >
                      العربية
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-700/70 bg-neutral-50/90 dark:bg-neutral-900/55 px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-400 dark:text-neutral-500">{t("theme_setting")}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTheme("light")}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${!isDarkMode
                        ? "bg-[#D6C19E] text-white"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"}`}
                    >
                      {t("theme_light")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTheme("dark")}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${isDarkMode
                        ? "bg-[#D6C19E] text-white"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"}`}
                    >
                      {t("theme_dark")}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
