"use client";

import { useState, useEffect } from "react";
import { TypingArea } from "@/components/TypingArea";
import { getAllSurahsMeta, getSurah, getLocationByPage, getLocationByJuz } from "@/lib/quran-data";

export default function Page() {
  const [surahNumber, setSurahNumber] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  const surahs = getAllSurahsMeta();

  useEffect(() => {
    const savedSurah = localStorage.getItem('quran_typing_surah');
    if (savedSurah) {
      setSurahNumber(parseInt(savedSurah, 10));
    }
    setIsMounted(true);
  }, []);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [jumpTarget, setJumpTarget] = useState<{index: number, ts: number} | null>(null);
  const [jumpMode, setJumpMode] = useState<'ayah' | 'page' | 'juz'>('ayah');
  const [jumpValue, setJumpValue] = useState("");

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
        localStorage.setItem('quran_typing_surah', loc.surahNumber.toString());
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
        localStorage.setItem('quran_typing_surah', loc.surahNumber.toString());
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
                          localStorage.setItem('quran_typing_surah', s.number.toString());
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

        <div className="flex-1 flex justify-end items-center pr-4">
          {/* COMPACT JUMP CONTROL */}
          <div className="flex items-center">
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
          {isMounted && <TypingArea key={surahNumber} surahNumber={surahNumber} jumpTarget={jumpTarget} />}
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
