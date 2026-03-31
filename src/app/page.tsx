"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TypingArea } from "@/components/TypingArea";
import { AuthWidget } from "@/components/AuthWidget";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import Image from "next/image";
import { getAllSurahsMeta, getSurah, getLocationByPage, getLocationByJuz } from "@/lib/quran-data";
import { WeakSpot, getWeakSpots } from "@/lib/stats";
import { getStorage, setStorage, getScopedKey, migrateLegacyLocalStorage } from "@/lib/storage";

export default function Page() {
  const [surahNumber, setSurahNumber] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const surahs = getAllSurahsMeta();

  useEffect(() => {
    migrateLegacyLocalStorage(); // Safely scrapes unprotected older JSON if applicable

    const savedSurah = getStorage('surah');
    if (savedSurah) {
      setSurahNumber(parseInt(savedSurah, 10));
      setJumpTarget(null); // Clear any active jump targeting when switching contexts
    } else {
      setSurahNumber(1);
    }
    setIsMounted(true);
  }, [resetKey]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [jumpTarget, setJumpTarget] = useState<{ index: number, ts: number } | null>(null);

  const [reviewQueue, setReviewQueue] = useState<WeakSpot[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);
  const [modalType, setModalType] = useState<"review" | "clear" | "no-mistakes" | "review-complete" | null>(null);

  const [navInfo, setNavInfo] = useState({ page: 1, juz: 1, ayah: 1 });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [activeNavTab, setActiveNavTab] = useState<'page' | 'juz' | 'ayah'>('page');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleClickOutsideNav = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsNavOpen(false);
      }
    };
    if (isNavOpen) {
      document.addEventListener("mousedown", handleClickOutsideNav);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideNav);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideNav);
  }, [isNavOpen]);

  const startReview = () => {
    const spots = getWeakSpots();
    if (spots.length === 0) {
      setModalType("no-mistakes");
      return;
    }
    setModalType("review");
  };

  const confirmStartReview = () => {
    const spots = getWeakSpots();
    setReviewQueue(spots);
    setCurrentReviewIndex(0);

    const first = spots[0];
    const sData = getSurah(first.surahNumber);
    const block = sData.blocks.find(b => b.ayahNumber === first.ayahNumber);

    setSurahNumber(first.surahNumber);
    setStorage('surah', first.surahNumber.toString());
    setJumpTarget({ index: block ? block.globalCheckOffset : 0, ts: Date.now() });
    setIsMounted(true);
    setIsDropdownOpen(false);
  };

  const nextReviewSpot = () => {
    if (currentReviewIndex + 1 < reviewQueue.length) {
      const nextIdx = currentReviewIndex + 1;
      setCurrentReviewIndex(nextIdx);
      const spot = reviewQueue[nextIdx];
      const sData = getSurah(spot.surahNumber);
      const block = sData.blocks.find(b => b.ayahNumber === spot.ayahNumber);

      setSurahNumber(spot.surahNumber);
      setStorage('surah', spot.surahNumber.toString());
      setJumpTarget({ index: block ? block.globalCheckOffset : 0, ts: Date.now() });
    } else {
      setModalType("review-complete");
      setReviewQueue([]);
      setCurrentReviewIndex(-1);
    }
  };

  const exitReview = () => {
    setReviewQueue([]);
    setCurrentReviewIndex(-1);
  };

  const clearAllMistakes = () => {
    setModalType("clear");
  };

  const confirmClearAll = () => {
    localStorage.removeItem(getScopedKey('mistake_stats'));
    for (let i = 1; i <= 114; i++) {
      localStorage.removeItem(getScopedKey(`session_mistakes_${i}`));
      localStorage.removeItem(getScopedKey(`session_attempts_${i}`));
      localStorage.removeItem(getScopedKey(`session_mistake_indices_${i}`));
    }
    setReviewQueue([]);
    setCurrentReviewIndex(-1);
    setResetKey(prev => prev + 1);
  };

  const handleBlockChange = useCallback((page: number, juz: number, ayah: number) => {
    setNavInfo(prev => {
      if (prev.page === page && prev.juz === juz && prev.ayah === ayah) return prev;
      return { page, juz, ayah };
    });
  }, []);

  const handleJumpTo = (type: 'ayah' | 'page' | 'juz' | 'surah', val: number) => {
    if (!val || val < 1) return;

    if (type === 'surah') {
      if (val >= 1 && val <= 114) {
        setSurahNumber(val);
        setStorage('surah', val.toString());
        setJumpTarget({ index: 0, ts: Date.now() });
      }
    } else if (type === 'ayah') {
      const sData = getSurah(surahNumber);
      const block = sData.blocks.find(b => b.ayahNumber === val);
      if (block) {
        setJumpTarget({ index: block.globalCheckOffset, ts: Date.now() });
        setIsMounted(true);
      } else {
        alert("Ayah not found in this Surah");
      }
    } else if (type === 'page') {
      const loc = getLocationByPage(val);
      if (loc) {
        setSurahNumber(loc.surahNumber);
        setStorage('surah', loc.surahNumber.toString());
        const sData = getSurah(loc.surahNumber);
        const block = sData.blocks.find(b => b.ayahNumber === loc.ayahNumber);
        if (block) setJumpTarget({ index: block.globalCheckOffset, ts: Date.now() });
      } else {
        alert("Page not found");
      }
    } else if (type === 'juz') {
      const loc = getLocationByJuz(val);
      if (loc) {
        setSurahNumber(loc.surahNumber);
        setStorage('surah', loc.surahNumber.toString());
        const sData = getSurah(loc.surahNumber);
        const block = sData.blocks.find(b => b.ayahNumber === loc.ayahNumber);
        if (block) setJumpTarget({ index: block.globalCheckOffset, ts: Date.now() });
      } else {
        alert("Juz not found");
      }
    }
  };


  const filteredSurahs = surahs.filter(s =>
    s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.number.toString().includes(searchQuery)
  );

  const currentSurah = surahs.find(s => s.number === surahNumber);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-100 dark:bg-neutral-900 transition-colors duration-300">
      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center px-3 sm:px-6 z-[100] shadow-sm">
        <div className="flex-none sm:flex-1 flex items-center gap-2.5 group cursor-pointer" onClick={() => window.location.reload()}>
          <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm border border-[#D6C19E]/30">
            <Image
              src="/icon.svg"
              alt="WriteQuran Logo"
              fill
              className="object-contain"
            />
          </div>
          <h1 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tracking-tight hidden sm:block">WriteQuran</h1>
        </div>

        {/* ABSOLUTE CENTERED SURAH SELECTOR */}
        <div
          ref={dropdownRef}
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 sm:gap-2"
        >
          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setIsNavOpen(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-all border border-neutral-200 dark:border-neutral-700 shadow-sm group"
          >
            <span className="text-[10px] sm:text-sm font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
              {currentSurah?.number}. {currentSurah?.englishName}
            </span>
            <svg
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* MOBILE-ONLY NAV BOX */}
          <div className="sm:hidden -mt-0.5" ref={navRef}>
            <button
              onClick={() => {
                setIsNavOpen(!isNavOpen);
                setIsDropdownOpen(false);
                setJumpInput("");
              }}
              className="flex items-center gap-x-2 px-2.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-full shadow-sm text-[9px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-tighter"
            >
              <span className="flex items-center gap-1">
                <span className="text-neutral-400 dark:text-neutral-500">Page</span>
                <span className="text-neutral-700 dark:text-neutral-200">{navInfo.page}</span>
              </span>
              <span className="w-px h-2.5 bg-neutral-100 dark:bg-neutral-700 mx-0.5" />
              <span className="flex items-center gap-1">
                <span className="text-neutral-400 dark:text-neutral-500">Juz</span>
                <span className="text-neutral-700 dark:text-neutral-200">{navInfo.juz}</span>
              </span>
              <span className="w-px h-2.5 bg-neutral-100 dark:bg-neutral-700 mx-0.5" />
              <span className="flex items-center gap-1">
                <span className="text-neutral-400 dark:text-neutral-500">Ayah</span>
                <span className="text-neutral-700 dark:text-neutral-200">{navInfo.ayah}</span>
              </span>
            </button>

            {isNavOpen && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-3 z-[110] flex flex-col gap-3 animate-in fade-in zoom-in duration-200 origin-top">
                <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                  {(['page', 'juz', 'ayah'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveNavTab(tab);
                        setJumpInput("");
                      }}
                      className={`flex-1 py-1 text-[9px] font-bold uppercase rounded-md transition-all ${activeNavTab === tab ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    placeholder={`Enter ${activeNavTab}...`}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#D6C19E] dark:text-neutral-100"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleJumpTo(activeNavTab, parseInt(jumpInput));
                        setIsNavOpen(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      handleJumpTo(activeNavTab, parseInt(jumpInput));
                      setIsNavOpen(false);
                    }}
                    className="absolute right-1 top-1 bottom-1 px-3 bg-[#D6C19E] text-white rounded-lg text-[9px] font-bold"
                  >
                    GO
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SEARCHABLE DROPDOWN MODAL */}
          {isDropdownOpen && (
            <div
              className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-64 sm:w-72 max-h-[350px] sm:max-h-[450px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col z-20 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top"
            >
              <div className="p-3 sm:p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search Surah..."
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D6C19E] transition-all dark:text-neutral-100"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-2 h-[350px] custom-scrollbar">
                {filteredSurahs.map((s) => {
                  const isActive = s.number === surahNumber;
                  return (
                    <button
                      key={s.number}
                      onClick={() => {
                        setSurahNumber(s.number);
                        setJumpTarget(null);
                        setStorage('surah', s.number.toString());
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center px-5 py-3 transition-colors ${isActive
                          ? 'bg-[#D6C19E]/10 text-[#D6C19E] font-bold'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                    >
                      <span className="text-xs font-mono mr-4 w-5 text-right opacity-50">{s.number}</span>
                      <span className="text-sm">{s.englishName}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D6C19E]" />}
                    </button>
                  );
                })}
                {filteredSurahs.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-neutral-400 italic">No matches found</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-auto sm:flex-1 flex justify-end items-center gap-0.5 sm:gap-3 pr-1 sm:pr-4">
          <AuthWidget onAuthChange={() => setResetKey(prev => prev + 1)} />
        </div>

      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col items-center justify-start min-h-screen relative pt-16">
        <div className="w-full flex-1 flex flex-col items-center pb-12 pt-12 md:pt-16">
          {isMounted && (
            <TypingArea
              key={`${surahNumber}-${resetKey}`}
              surahNumber={surahNumber}
              jumpTarget={jumpTarget}
              onJump={handleJumpTo}
              onBlockChange={handleBlockChange}
              onStartReview={confirmStartReview}
              onClearHistory={confirmClearAll}
              onExitReview={exitReview}
              onNextReviewSpot={nextReviewSpot}
              isReviewMode={reviewQueue.length > 0}
              reviewProgress={reviewQueue.length > 0 ? `${currentReviewIndex + 1}/${reviewQueue.length}` : ""}
              hasWeakSpots={getWeakSpots().length > 0}
            />
          )}

        </div>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="w-full flex justify-center gap-6 py-4 text-[11px] text-neutral-400 dark:text-neutral-600">
        <a href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">Privacy</a>
        <a href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">Terms</a>
        <a href="/contact" className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors">Contact</a>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D6C19E44; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D6C19E88; }
      `}</style>

      <ConfirmationModal
        isOpen={modalType === "review"}
        onClose={() => setModalType(null)}
        onConfirm={confirmStartReview}
        title="Review Weak Spots?"
        message="This will start a review session of your logged mistakes across all Surahs."
      />

      <ConfirmationModal
        isOpen={modalType === "clear"}
        onClose={() => setModalType(null)}
        onConfirm={confirmClearAll}
        title="Clear All Mistake History?"
        message="Are you sure you want to clear ALL mistake history for this account? This cannot be undone."
      />

      <ConfirmationModal
        isOpen={modalType === "no-mistakes"}
        onClose={() => setModalType(null)}
        onConfirm={() => setModalType(null)}
        title="No Mistakes Yet"
        message="Keep practicing to build your stats. Once you make a mistake, it will appear here for review."
        confirmLabel="OK"
        showCancel={false}
      />

      <ConfirmationModal
        isOpen={modalType === "review-complete"}
        onClose={() => setModalType(null)}
        onConfirm={() => setModalType(null)}
        title="Review Complete!"
        message="MashAllah, you've completed your review session."
        confirmLabel="Finish"
        showCancel={false}
      />
    </div>
  );
}
