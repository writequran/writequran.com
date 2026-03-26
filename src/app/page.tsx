"use client";

import { useState, useEffect } from "react";
import { TypingArea } from "@/components/TypingArea";
import { AuthWidget } from "@/components/AuthWidget";
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
  
  const [jumpTarget, setJumpTarget] = useState<{index: number, ts: number} | null>(null);
  const [jumpMode, setJumpMode] = useState<'ayah' | 'page' | 'juz'>('ayah');
  const [jumpValue, setJumpValue] = useState("");

  const [reviewQueue, setReviewQueue] = useState<WeakSpot[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(-1);

  const startReview = () => {
    const spots = getWeakSpots();
    if (spots.length === 0) {
      alert("No mistakes logged yet! Keep practicing to build your stats.");
      return;
    }
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
      alert("Review complete! MashAllah.");
      setReviewQueue([]);
      setCurrentReviewIndex(-1);
    }
  };

  const exitReview = () => {
    setReviewQueue([]);
    setCurrentReviewIndex(-1);
  };

  const clearAllMistakes = () => {
    if (confirm("Are you sure you want to clear ALL mistake history for this account? This cannot be undone.")) {
      localStorage.removeItem(getScopedKey('mistake_stats'));
      for (let i = 1; i <= 114; i++) {
        localStorage.removeItem(getScopedKey(`session_mistakes_${i}`));
        localStorage.removeItem(getScopedKey(`session_attempts_${i}`));
        localStorage.removeItem(getScopedKey(`session_mistake_indices_${i}`));
      }
      setReviewQueue([]);
      setCurrentReviewIndex(-1);
      setResetKey(prev => prev + 1);
    }
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(jumpValue);
    if (!val || val < 1) return;

    if (jumpMode === 'ayah') {
      const sData = getSurah(surahNumber);
      const block = sData.blocks.find(b => b.ayahNumber === val);
      if (block) {
        setJumpTarget({ index: block.globalCheckOffset, ts: Date.now() });
        setJumpValue("");
        setIsMounted(true); // ensure it's rendered
      } else {
        alert("Ayah not found in this Surah");
      }
    } else if (jumpMode === 'page') {
      const loc = getLocationByPage(val);
      if (loc) {
        setSurahNumber(loc.surahNumber);
        setStorage('surah', loc.surahNumber.toString());
        const sData = getSurah(loc.surahNumber);
        const block = sData.blocks.find(b => b.ayahNumber === loc.ayahNumber);
        if (block) setJumpTarget({ index: block.globalCheckOffset, ts: Date.now() });
        setJumpValue("");
      } else {
        alert("Page not found");
      }
    } else if (jumpMode === 'juz') {
      const loc = getLocationByJuz(val);
      if (loc) {
        setSurahNumber(loc.surahNumber);
        setStorage('surah', loc.surahNumber.toString());
        const sData = getSurah(loc.surahNumber);
        const block = sData.blocks.find(b => b.ayahNumber === loc.ayahNumber);
        if (block) setJumpTarget({ index: block.globalCheckOffset, ts: Date.now() });
        setJumpValue("");
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
    <div className="flex flex-col min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors duration-300">
      {/* FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 flex items-center px-6 z-[60] shadow-sm">
        <div className="flex-1 flex items-center">
          <h1 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">Qur'an Typing</h1>
        </div>

        <div className="relative flex-1 flex justify-center">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-5 py-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-all border border-neutral-200 dark:border-neutral-700 shadow-sm group"
          >
            <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-widest">
              {currentSurah?.number}. {currentSurah?.englishName}
            </span>
            <svg 
              className={`w-4 h-4 text-neutral-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          {/* SEARCHABLE DROPDOWN MODAL */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full mt-3 w-72 max-h-[450px] bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col z-20 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top">
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Search Surah..."
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#D6C19E] transition-all dark:text-neutral-100"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
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
                        className={`w-full flex items-center px-5 py-3 transition-colors ${
                          isActive 
                            ? 'bg-[#D6C19E]/10 text-[#D6C19E] font-bold' 
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                        }`}
                      >
                        <span className="text-xs font-mono mr-4 w-5 text-right opacity-50">{s.number}</span>
                        <span className="text-sm">{s.englishName}</span>
                        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#D6C19E]"/>}
                      </button>
                    );
                  })}
                  {filteredSurahs.length === 0 && (
                    <div className="px-6 py-12 text-center text-sm text-neutral-400 italic">No matches found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex justify-end items-center gap-3 pr-4">
          <AuthWidget onAuthChange={() => setResetKey(prev => prev + 1)} />

          {reviewQueue.length > 0 ? (
            <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-full pl-4 pr-1 py-1 shadow-sm shrink-0">
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 hidden sm:inline">
                Reviewing {currentReviewIndex + 1}/{reviewQueue.length}
              </span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 sm:hidden">
                {currentReviewIndex + 1}/{reviewQueue.length}
              </span>
              <button 
                onClick={nextReviewSpot} 
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-bold transition-colors shadow-sm"
              >
                Next Spot
              </button>
              <button 
                onClick={exitReview} 
                className="w-7 h-7 flex items-center justify-center text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-full transition-colors ml-1" 
                title="Exit Review"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={startReview}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#D6C19E] dark:hover:border-orange-600 hover:text-orange-500 rounded-full text-xs font-bold text-neutral-600 dark:text-neutral-300 transition-all shadow-sm shrink-0"
                title="Review Weak Spots"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
                <span className="hidden sm:inline">Review Weak Spots</span>
              </button>
              
              <button 
                onClick={clearAllMistakes}
                className="flex items-center justify-center w-8 h-8 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-600 hover:text-red-500 rounded-full text-neutral-400 transition-all shadow-sm shrink-0"
                title="Clear All Mistake History"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          )}

          {/* COMPACT JUMP CONTROL */}
          <div className="hidden md:flex items-center">
            <div className="flex bg-neutral-50 dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm h-10 w-fit">
              <select 
                className="bg-transparent pl-4 pr-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 focus:outline-none border-r border-neutral-200 dark:border-neutral-700 cursor-pointer appearance-none"
                value={jumpMode}
                onChange={(e) => {
                  setJumpMode(e.target.value as any);
                  setJumpValue("");
                }}
              >
                <option value="ayah">Ayah</option>
                <option value="page">Page</option>
                <option value="juz">Juz</option>
              </select>
              
              <form onSubmit={handleJump} className="flex items-center">
                <input 
                  type="number"
                  min="1"
                  placeholder={jumpMode === 'ayah' ? 'No.' : jumpMode === 'page' ? '1-604' : '1-30'}
                  className="w-14 sm:w-20 bg-transparent px-3 text-xs font-mono text-neutral-700 dark:text-neutral-200 focus:outline-none placeholder-neutral-400"
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                />
                <button 
                  type="submit"
                  title="Jump"
                  className="px-3 text-[#D6C19E] hover:text-[#C1A063] transition-colors focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col items-center justify-start min-h-screen relative pt-16">
        <div className="w-full flex-1 flex flex-col items-center pb-12 pt-12 md:pt-16">
          {isMounted && <TypingArea key={`${surahNumber}-${resetKey}`} surahNumber={surahNumber} jumpTarget={jumpTarget} />}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #D6C19E44; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D6C19E88; }
      `}</style>
    </div>
  );
}
