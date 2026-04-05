"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { getStorage } from '@/lib/storage';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onClearHistory?: () => void;
  typingMode?: "letter" | "word";
  onTypingModeChange?: (mode: "letter" | "word") => void;
  memorizationRange?: { startSurah: number; endSurah: number };
  onMemorizationRangeChange?: (range: { startSurah: number; endSurah: number }) => void;
  onStartMemorizationTest?: () => void;
  isMemorizationMode?: boolean;
}

export function MenuDrawer({
  isOpen,
  onClose,
  isDarkMode,
  toggleTheme,
  onClearHistory,
  typingMode,
  onTypingModeChange,
  memorizationRange,
  onMemorizationRangeChange,
  onStartMemorizationTest,
  isMemorizationMode,
}: MenuDrawerProps) {
  const { t, language, setLanguage } = useLanguage();
  const [username, setUsername] = React.useState<string | null>(null);
  const pathname = usePathname();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const stored = getStorage('active_username');
      setUsername(stored || null);
      // Auto-focus close button when drawer opens
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape key closes drawer
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-[2px] z-[150] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("open_menu") || "Menu"}
        className={`fixed top-0 bottom-0 w-[280px] sm:w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl z-[160] shadow-2xl border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-500 ease-out transform ${language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} ${isOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full' : '-translate-x-full')}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pt-8 border-b border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* <div className="w-8 h-8 rounded-full bg-[#D6C19E]/20 flex items-center justify-center border border-[#D6C19E]/30 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /><path d="M12 7v5l3 3" /></svg>
              </div> */}
              <Link href="/" onClick={onClose} className="text-xl font-bold tracking-tight text-neutral-800 dark:text-neutral-100 font-gabriela hover:text-[#B18E4E] dark:hover:text-[#D6C19E] transition-colors">
                Write Quran
              </Link>
            </div>
            <button ref={closeButtonRef} onClick={onClose} aria-label={t("close") || "Close"} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1">

            {/* Navigation section */}
            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2 mt-2">{t("navigation") || "Navigation"}</p>
            {[
              { href: "/write", label: t("start_writing"), icon: <><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></> },
              { href: "/review", label: t("review_mistakes"), icon: <><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></> },
              { href: "/memorize", label: t("memorization_test"), icon: <><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></> },
              { href: "/progress", label: t("my_progress"), icon: <><path d="M3 3v18h18" /><path d="m7 14 3-3 3 2 4-5" /></> },
              { href: "/leaderboard", label: t("leaderboard"), icon: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></> },
              { href: "/settings", label: t("settings"), icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.02a1.65 1.65 0 0 0 .98-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 .99 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.02a1.65 1.65 0 0 0 1.51.98H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51.99Z"/></> },
            ].map(({ href, label, icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${active
                    ? "bg-[#D6C19E]/12 dark:bg-[#D6C19E]/10 text-[#B18E4E] dark:text-[#D6C19E]"
                    : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-colors ${active ? "text-[#B18E4E] dark:text-[#D6C19E]" : "text-neutral-400 group-hover:text-[#D6C19E]"}`}>
                    {icon}
                  </svg>
                  <span className="font-semibold text-sm">{label}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#B18E4E] dark:bg-[#D6C19E]" />}
                </Link>
              );
            })}

            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">{t("account")}</p>
            {username ? (
              <Link href={`/leaderboard/${username}`} onClick={onClose} className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#D6C19E] transition-colors shrink-0"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <div className="min-w-0">
                  <span className="font-semibold text-sm block">{t("user_profile")}</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate block">@{username}</span>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-4 px-4 py-3 rounded-2xl text-neutral-400 dark:text-neutral-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <div className="min-w-0">
                  <span className="font-semibold text-sm block">{t("user_profile")}</span>
                  <span className="text-[11px] truncate block">{t("sign_in_to_access") || "Sign in to view profile"}</span>
                </div>
              </div>
            )}

            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">{t("preferences")}</p>
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              aria-label={t("language_toggle")}
              aria-pressed={language === 'ar'}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300 mb-1"
            >
              <div className="flex items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-blue-500 transition-colors"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>
                <span className="font-semibold text-sm">{t("language_toggle")}</span>
              </div>
              {/* <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{language}</span> */}
            </button>
            <button
              onClick={toggleTheme}
              aria-label={isDarkMode ? (t("light_mode") || "Light Mode") : (t("night_mode") || "Night Mode")}
              aria-pressed={isDarkMode}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300"
            >
              <div className="flex items-center gap-4">
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                )}
                <span className="font-semibold text-sm">{isDarkMode ? t("light_mode") : t("night_mode")}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-yellow-500/20' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${isDarkMode ? 'right-0.5 bg-yellow-500 shadow-sm' : 'left-0.5 bg-white shadow-sm'}`} />
              </div>
            </button>

            {typingMode && onTypingModeChange && (
              <div className="px-4 py-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/70 border border-neutral-100 dark:border-neutral-700/70 mt-1">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-4 text-neutral-600 dark:text-neutral-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D6C19E]"><path d="M4 7h16" /><path d="M4 12h10" /><path d="M4 17h7" /></svg>
                    <div>
                      <span className="font-semibold text-sm block">{t("typing_mode")}</span>
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">{t("typing_mode_desc")}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onTypingModeChange("letter")}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${typingMode === "letter"
                      ? "bg-[#D6C19E] text-white border-[#D6C19E] shadow-sm"
                      : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-[#D6C19E]/50"}`}
                  >
                    {t("letter_by_letter")}
                  </button>
                  <button
                    onClick={() => onTypingModeChange("word")}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${typingMode === "word"
                      ? "bg-[#D6C19E] text-white border-[#D6C19E] shadow-sm"
                      : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-[#D6C19E]/50"}`}
                  >
                    {t("word_by_word")}
                  </button>
                </div>
              </div>
            )}

            {/* <div className="px-4 py-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/70 border border-neutral-100 dark:border-neutral-700/70 mt-1">
              <div className="flex items-start gap-4 text-neutral-600 dark:text-neutral-300 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D6C19E] mt-0.5"><path d="M9 3H5a2 2 0 0 0-2 2v4" /><path d="M15 3h4a2 2 0 0 1 2 2v4" /><path d="M21 15v4a2 2 0 0 1-2 2h-4" /><path d="M3 15v4a2 2 0 0 0 2 2h4" /><path d="M9 9h6v6H9z" /></svg>
                <div>
                  <span className="font-semibold text-sm block">Memorization Test</span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Pick a surah range and get one random ayah to type from memory</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">From</span>
                  <input
                    type="number"
                    min="1"
                    max="114"
                    value={memorizationRange.startSurah}
                    onChange={(e) => onMemorizationRangeChange({
                      startSurah: Number.parseInt(e.target.value || "1", 10),
                      endSurah: memorizationRange.endSurah,
                    })}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-700 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D6C19E]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">To</span>
                  <input
                    type="number"
                    min="1"
                    max="114"
                    value={memorizationRange.endSurah}
                    onChange={(e) => onMemorizationRangeChange({
                      startSurah: memorizationRange.startSurah,
                      endSurah: Number.parseInt(e.target.value || "114", 10),
                    })}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-900 text-sm font-semibold text-neutral-700 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D6C19E]"
                  />
                </label>
              </div>
              <button
                onClick={() => {
                  onStartMemorizationTest();
                  onClose();
                }}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase bg-[#D6C19E] text-white shadow-sm hover:brightness-105 transition-all"
              >
                {isMemorizationMode ? "New Random Ayah" : "Start Test"}
              </button>
            </div> */}



            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">{t("support")}</p>
            <Link href="/contact" onClick={onClose} className="flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 group-hover:text-[#D6C19E] transition-colors shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span className="font-semibold text-sm">{t("contact_us")}</span>
            </Link>
          </div>

          {/* Drawer footer */}
          <div className="px-6 py-5 border-t border-neutral-100 dark:border-neutral-800/50">
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-600 text-center tracking-widest uppercase">
              WriteQuran.com
            </p>
          </div>


        </div>
      </div>
    </>
  );
}
