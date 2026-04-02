"use client";

import React from 'react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onClearHistory: () => void;
  typingMode: "letter" | "word";
  onTypingModeChange: (mode: "letter" | "word") => void;
  memorizationRange: { startSurah: number; endSurah: number };
  onMemorizationRangeChange: (range: { startSurah: number; endSurah: number }) => void;
  onStartMemorizationTest: () => void;
  isMemorizationMode: boolean;
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
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-[2px] z-[150] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-[280px] sm:w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl z-[160] shadow-2xl border-r border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-500 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pt-8 border-b border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D6C19E]/20 flex items-center justify-center border border-[#D6C19E]/30 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /><path d="M12 7v5l3 3" /></svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">WriteQuran</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">Account</p>
            <button className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#D6C19E]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span className="font-semibold text-sm">User Profile</span>
            </button>

            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">Preferences</p>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300"
            >
              <div className="flex items-center gap-4">
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                )}
                <span className="font-semibold text-sm">{isDarkMode ? 'Light Mode' : 'Night Mode'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-yellow-500/20' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${isDarkMode ? 'right-0.5 bg-yellow-500 shadow-sm' : 'left-0.5 bg-white shadow-sm'}`} />
              </div>
            </button>

            <div className="px-4 py-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/70 border border-neutral-100 dark:border-neutral-700/70 mt-1">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-4 text-neutral-600 dark:text-neutral-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D6C19E]"><path d="M4 7h16" /><path d="M4 12h10" /><path d="M4 17h7" /></svg>
                  <div>
                    <span className="font-semibold text-sm block">Typing Mode</span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Choose how progress is checked</span>
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
                  Letter by Letter
                </button>
                <button
                  onClick={() => onTypingModeChange("word")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${typingMode === "word"
                    ? "bg-[#D6C19E] text-white border-[#D6C19E] shadow-sm"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-[#D6C19E]/50"}`}
                >
                  Word by Word
                </button>
              </div>
            </div>

            <div className="px-4 py-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/70 border border-neutral-100 dark:border-neutral-700/70 mt-1">
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
            </div>



            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">Support</p>
            <button className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#D6C19E]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span className="font-semibold text-sm">Contact Us</span>
            </button>
          </div>


        </div>
      </div>
    </>
  );
}
