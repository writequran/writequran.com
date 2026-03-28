"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSurah } from "@/lib/quran-data";
import { MistakeRecord, ProgressStats, loadMistakeStats, loadProgressStats, saveMistakeStats, saveProgressStats } from "@/lib/stats";
import { getStorage, setStorage } from "@/lib/storage";

// Helper to prevent verse markers from breaking to the next line
const preserveMarkerSpacing = (str: string) => {
  return str.replace(/ \u06DD/g, '\u00A0\u06DD');
};

interface TypingAreaProps {
  surahNumber: number;
  jumpTarget?: { index: number; ts: number } | null;
  onJump: (type: 'ayah' | 'page' | 'juz', val: number) => void;
}

type VisibilityMode = "hidden" | "ayah" | "all";

export function TypingArea({ surahNumber, jumpTarget, onJump }: TypingAreaProps) {
  const pageData = getSurah(surahNumber);
  const { globalCheckString, blocks } = pageData;

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    if (jumpTarget) return jumpTarget.index;
    const saved = getStorage(`quran_typing_progress_${surahNumber}`);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [wrongChar, setWrongChar] = useState<string | null>(null);

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>(() => {
    if (typeof window === "undefined") return "hidden";
    return (getStorage('visibility_mode') as VisibilityMode) || "hidden";
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = getStorage('theme');
    if (saved) return saved === 'dark';
    return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isAtBottom, setIsAtBottom] = useState(false);

  const [showKeyboard, setShowKeyboard] = useState(() => {
    if (typeof window === "undefined") return false;
    return getStorage('keyboard') === 'true';
  });

  const [sessionAttempts, setSessionAttempts] = useState(() => {
    if (typeof window === "undefined") return 0;
    const saved = getStorage(`session_attempts_${surahNumber}`);
    return saved ? parseInt(saved, 10) || 0 : 0;
  });

  const [sessionMistakeIndices, setSessionMistakeIndices] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const saved = getStorage(`session_mistake_indices_${surahNumber}`);
      return saved ? new Set<number>(JSON.parse(saved)) : new Set<number>();
    } catch {
      return new Set<number>();
    }
  });

  const sessionMistakes = sessionMistakeIndices.size;

  useEffect(() => {
    setStorage(`session_attempts_${surahNumber}`, sessionAttempts.toString());
  }, [sessionAttempts, surahNumber]);

  useEffect(() => {
    setStorage(`session_mistake_indices_${surahNumber}`, JSON.stringify(Array.from(sessionMistakeIndices)));
  }, [sessionMistakeIndices, surahNumber]);

  const globalMistakesRef = useRef<Record<string, MistakeRecord>>({});
  const globalProgressRef = useRef<Record<number, ProgressStats>>({});

  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const targetRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    globalMistakesRef.current = loadMistakeStats();
    globalProgressRef.current = loadProgressStats();
  }, []);

  const currentBlock = blocks.find(b =>
    currentIndex >= b.globalCheckOffset &&
    currentIndex < b.globalCheckOffset + b.checkString.length
  ) || blocks[blocks.length - 1];

  useEffect(() => {
    if (jumpTarget) {
      setCurrentIndex(jumpTarget.index);
    }
  }, [jumpTarget]);

  useEffect(() => {
    setStorage(`quran_typing_progress_${surahNumber}`, currentIndex.toString());
  }, [currentIndex, surahNumber]);

  useEffect(() => {
    setStorage('visibility_mode', visibilityMode);
  }, [visibilityMode]);

  useEffect(() => {
    setStorage('keyboard', showKeyboard.toString());
  }, [showKeyboard]);

  useEffect(() => {
    setStorage('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setTimeout(updateCursorPos, 50);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
      setIsAtBottom(scrolledToBottom);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const updateCursorPos = useCallback(() => {
    if (targetRef.current && containerRef.current && currentIndex < globalCheckString.length) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // We anchor relative to the containerRef.current (which is the Mushaf page container)
      // This is more robust than offsetTop when nested in grids/relative containers.
      setCursorPos({
        top: targetRect.top - containerRect.top,
        left: targetRect.left - containerRect.left - 5,
        width: targetRect.width + 10,
        height: targetRect.height,
      });
    }
  }, [currentIndex, globalCheckString.length]);

  useEffect(() => {
    const timeoutId = setTimeout(updateCursorPos, 50);
    window.addEventListener("resize", updateCursorPos);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateCursorPos);
    };
  }, [updateCursorPos]);

  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const handleResetSessionStats = () => {
    if (confirm("Reset mistake counter for this Surah?")) {
      setSessionAttempts(0);
      setSessionMistakeIndices(new Set());
    }
  };

  const handleInput = useCallback((char: string) => {
    if (char === "Backspace") {
      if (wrongChar) {
        setWrongChar(null);
      } else {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        setWrongChar(null);
      }
      return;
    }

    if (wrongChar) return;

    const expectedChar = globalCheckString[currentIndex];
    if (!expectedChar) return;

    if (char === expectedChar) {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        const progressStats = globalProgressRef.current;
        const p = progressStats[surahNumber] || {
          surahNumber,
          highestIndexReached: 0,
          totalMistakeEvents: 0,
          totalWrongAttempts: 0,
          lastPracticed: Date.now()
        };

        if (next > p.highestIndexReached) {
          p.highestIndexReached = next;
        }
        p.lastPracticed = Date.now();

        progressStats[surahNumber] = p;
        saveProgressStats(progressStats);

        return next;
      });
      setWrongChar(null);
    } else {
      setWrongChar(char);

      const mistakes = globalMistakesRef.current;
      const progress = globalProgressRef.current;
      const mistakeKey = `${surahNumber}-${currentIndex}`;

      const p = progress[surahNumber] || {
        surahNumber, highestIndexReached: currentIndex, totalMistakeEvents: 0, totalWrongAttempts: 0, lastPracticed: Date.now()
      };

      if (mistakes[mistakeKey]) {
        mistakes[mistakeKey].wrongAttempts += 1;
        mistakes[mistakeKey].timestamp = Date.now();
        p.totalWrongAttempts += 1;
        setSessionAttempts(s => s + 1);
      } else {
        mistakes[mistakeKey] = {
          surahNumber,
          ayahNumber: currentBlock?.ayahNumber || 0,
          globalIndex: currentIndex,
          expectedChar,
          wrongAttempts: 1,
          timestamp: Date.now()
        };
        p.totalMistakeEvents += 1;
        p.totalWrongAttempts += 1;
        setSessionAttempts(s => s + 1);
      }

      setSessionMistakeIndices(prev => {
        if (!prev.has(currentIndex)) {
          const next = new Set(prev);
          next.add(currentIndex);
          return next;
        }
        return prev;
      });

      p.lastPracticed = Date.now();

      progress[surahNumber] = p;
      saveMistakeStats(mistakes);
      saveProgressStats(progress);
    }
  }, [currentIndex, globalCheckString, wrongChar, surahNumber, currentBlock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // SURGICAL GUARD: Only ignore keyboard events if the focus is inside a real text input field.
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (e.key === " ") e.preventDefault();

      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        if (e.key === "Backspace") {
          handleInput("Backspace");
        }
        return;
      }

      handleInput(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setWrongChar(null);
    setTimeout(updateCursorPos, 100);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  type TextMode = "typed" | "hint" | "hidden" | "mistake";

  const renderTextWithMarkers = (text: string, mode: TextMode) => {
    if (!text) return null;
    const cleanText = preserveMarkerSpacing(text);
    const parts = cleanText.split(/(\u06DD[\u0660-\u0669]+)/g);

    return parts.map((part, i) => {
      const isMarker = part.startsWith('\u06DD');

      if (isMarker) {
        // Markers are always visible and always gold
        const digits = part.slice(1);
        const markerColor = "text-[#C1A063]";

        return (
          <span key={i} className={`relative inline-flex items-center justify-center mx-1 ${markerColor} transition-all duration-300 select-none`}>
            <span className="leading-none quran-text">{'\u06DD'}</span>
            <span className="absolute inset-0 flex items-center justify-center text-[0.45em] quran-text leading-none z-10 translate-y-[0em]">
              {digits}
            </span>
          </span>
        );
      }

      let colorClass = "";
      let customStyle = {};
      if (mode === "typed") {
        colorClass = "text-[#2A2826] dark:text-neutral-100";
      } else if (mode === "hint") {
        colorClass = "text-neutral-400/60 dark:text-neutral-600/50";
      } else if (mode === "hidden") {
        colorClass = "text-transparent";
      } else if (mode === "mistake") {
        colorClass = "text-[#faac23] dark:text-[#faac23]";
      }

      return (
        <span key={i} className={`${colorClass} transition-colors duration-300`} style={customStyle}>
          {part}
        </span>
      );
    });
  };

  const renderTypedSpan = (block: any, blockStart: number, localIndexLimit: number) => {
    const clusters = [];
    for (let i = 0; i < localIndexLimit; i++) {
      const start = block.mapping[i];
      const end = (i + 1 === block.mapping.length)
        ? block.displayString.length
        : block.mapping[i + 1];

      const cluster = block.displayString.slice(start, end);
      const globalIdx = blockStart + i;
      const isMistake = sessionMistakeIndices.has(globalIdx);

      clusters.push(
        <span key={globalIdx} className="inline">
          {renderTextWithMarkers(cluster, isMistake ? "mistake" : "typed")}
        </span>
      );
    }
    return clusters;
  };

  return (
    <div className="w-full flex flex-col items-center pb-36 px-4">
      {/* LEFT STATS DOCK */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-4 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-4xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-6 px-4 z-50 transition-colors duration-300 min-w-[80px]">
        {/* PAGE CONTROL */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Page</span>
          <input 
            type="number"
            min="1"
            max="604"
            className="w-12 bg-transparent text-center text-lg font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#D6C19E] rounded transition-all"
            defaultValue={currentBlock?.page || 1}
            key={`page-${currentBlock?.page}`}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val !== currentBlock?.page) onJump('page', val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value);
                if (val && val !== currentBlock?.page) onJump('page', val);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>

        <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-700/50" />

        {/* JUZ CONTROL */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Juz</span>
          <input 
            type="number"
            min="1"
            max="30"
            className="w-12 bg-transparent text-center text-lg font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#D6C19E] rounded transition-all"
            defaultValue={currentBlock?.juz || 1}
            key={`juz-${currentBlock?.juz}`}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val !== currentBlock?.juz) onJump('juz', val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value);
                if (val && val !== currentBlock?.juz) onJump('juz', val);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>

        <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-700/50" />

        {/* AYAH CONTROL */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Ayah</span>
          <input 
            type="number"
            min="1"
            className="w-12 bg-transparent text-center text-lg font-bold text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-[#D6C19E] rounded transition-all"
            defaultValue={currentBlock?.ayahNumber || 1}
            key={`ayah-${currentBlock?.ayahNumber}`}
            onBlur={(e) => {
              const val = parseInt(e.target.value);
              if (val && val !== currentBlock?.ayahNumber) onJump('ayah', val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value);
                if (val && val !== currentBlock?.ayahNumber) onJump('ayah', val);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>

        <div className="w-full h-[2px] bg-neutral-100 dark:bg-neutral-700/30 my-1" />

        {/* PROGRESS */}
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Done</span>
          <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            {((currentIndex / (globalCheckString.length || 1)) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-700/50" />

        {/* ERRORS */}
        <div className="flex flex-col items-center gap-1 text-center relative group">
          <span className="text-[10px] uppercase font-bold text-red-500/80 tracking-wider">Errors</span>
          <span className="text-xl font-bold text-red-600 dark:text-red-400">
            {sessionMistakes}
          </span>
          <span className="text-[10px] font-medium text-red-400/60 mt-0.5" title="Total attempts">({sessionAttempts})</span>

          <button
            onClick={handleResetSessionStats}
            className="absolute -bottom-8 opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full shadow-sm text-neutral-500 hover:text-red-500 transition-all z-10 duration-200"
            title="Reset Session Mistakes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        </div>
      </div>

      {currentIndex === globalCheckString.length && globalCheckString.length > 0 && (
        <div className="my-8 flex flex-col items-center animate-in fade-in duration-500">
          <p className="text-3xl font-medium text-green-700 dark:text-green-500 quran-text tracking-normal border-b-2 border-green-500/30 pb-4">
            صَدَقَ اللّٰهُ الْعَظِيمُ
          </p>
        </div>
      )}

      <div
        className="relative w-full max-w-[800px] bg-[#FDFBF7] dark:bg-[#121212] shadow-2xl rounded-sm border-[16px] border-[#D6C19E] dark:border-neutral-800 px-8 py-16 rtl quran-text tracking-normal transition-colors duration-500 cursor-default select-none"
        dir="rtl"
        style={{ WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}
      >
        <div className="absolute inset-2 border-2 border-[#D6C19E] dark:border-neutral-700 opacity-50 pointer-events-none" />

        <div
          ref={containerRef}
          className="w-full text-[2.2rem] leading-[2.8] text-justify mushaf-rules relative" style={{ textAlignLast: 'center' }}
        >
          {pageData.preBismillah && (
            <div className="w-full text-[#2A2826] dark:text-neutral-100 flex justify-center mb-4 select-none" style={{ textAlignLast: 'auto' }}>
              <span>{pageData.preBismillah}</span>
            </div>
          )}

          {pageData.blocks.map((block, blockIndex) => {
            const blockStart = block.globalCheckOffset;
            const blockLength = block.checkString.length;
            const blockEnd = blockStart + blockLength;

            const isActiveAyah = currentIndex >= blockStart && currentIndex < blockEnd;
            const isFinished = currentIndex >= blockEnd;
            const isFuture = currentIndex < blockStart;

            const showHint = visibilityMode === "all" || (visibilityMode === "ayah" && isActiveAyah);

            return (
              <span key={blockIndex}>
                {isFinished ? (
                  renderTypedSpan(block, blockStart, block.mapping.length)
                ) : isFuture ? (
                  renderTextWithMarkers(block.displayString, showHint ? "hint" : "hidden")
                ) : (
                  <>
                    {(() => {
                      const localIndex = currentIndex - blockStart;
                      const currentDisplayIndex = block.mapping[localIndex] || 0;

                      const targetChar = block.displayString[currentDisplayIndex] || "";
                      const untypedSpan = block.displayString.slice(currentDisplayIndex + 1);

                      return (
                        <span className="inline">
                          {renderTypedSpan(block, blockStart, localIndex)}
                          <span
                            ref={targetRef}
                            className="relative inline"
                          >
                            {renderTextWithMarkers(targetChar, showHint ? "hint" : "hidden")}
                          </span>
                          {renderTextWithMarkers(untypedSpan, showHint ? "hint" : "hidden")}
                        </span>
                      );
                    })()}
                  </>
                )}
                {" "}
              </span>
            );
          })}

          {currentIndex < globalCheckString.length && (
            <div
              className="absolute pointer-events-none flex items-center justify-center transition-all duration-75 text-[2.5rem] leading-[2.6] z-10"
              style={{
                top: cursorPos.top,
                left: cursorPos.left,
                width: cursorPos.width,
                height: cursorPos.height,
              }}
            >
              {wrongChar ? (
                <>
                  <span
                    className="absolute top-[10%] bottom-[10%] left-[2px] w-[2px] rounded-full animate-flicker"
                    style={{
                      background: "linear-gradient(to bottom, transparent, #ff2d2d, #ff4d4d, transparent)",
                      boxShadow: "0 0 8px rgba(255,45,45,0.45)"
                    }}
                  />
                  <span
                    className="absolute top-[10%] bottom-[10%] right-[2px] w-[2px] rounded-full animate-flicker"
                    style={{
                      background: "linear-gradient(to bottom, transparent, #ff2d2d, #ff4d4d, transparent)",
                      boxShadow: "0 0 8px rgba(255,45,45,0.45)"
                    }}
                  />
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-[5px] rounded-full"
                    style={{
                      background: "#ff3b3b",
                      boxShadow: "0 0 12px 3px rgba(255,59,59,0.50)"
                    }}
                  />
                  <span className="relative z-10 text-red-600 dark:text-red-400 font-medium">
                    {wrongChar}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="absolute top-[10%] bottom-[10%] left-[2px] w-[2px] rounded-full animate-flicker"
                    style={{
                      background: isDarkMode
                        ? "linear-gradient(to bottom, transparent, #F4D58D, transparent)"
                        : "linear-gradient(to bottom, transparent, #D8BA72, transparent)",
                      boxShadow: isDarkMode
                        ? "0 0 6px rgba(244,213,141,0.42)"
                        : "0 0 5px rgba(216,186,114,0.30)"
                    }}
                  />
                  <span
                    className="absolute top-[10%] bottom-[10%] right-[2px] w-[2px] rounded-full animate-flicker"
                    style={{
                      background: isDarkMode
                        ? "linear-gradient(to bottom, transparent, #F4D58D, transparent)"
                        : "linear-gradient(to bottom, transparent, #D8BA72, transparent)",
                      boxShadow: isDarkMode
                        ? "0 0 6px rgba(244,213,141,0.42)"
                        : "0 0 5px rgba(216,186,114,0.30)"
                    }}
                  />
                  <span
                    className="absolute -bottom-1 left-0 right-0 h-[5px] rounded-full"
                    style={{
                      background: isDarkMode ? "#FFD98A" : "#E3C57A",
                      boxShadow: isDarkMode
                        ? "inset 0 0 0 1px rgba(255,255,255,0.75), 0 0 12px 2px rgba(255,217,138,0.50)"
                        : "inset 0 0 0 1px rgba(255,255,255,0.95), 0 2px 7px rgba(55,42,14,0.34)"
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#FDFBF7] dark:from-[#121212] via-[#FDFBF7]/80 dark:via-[#121212]/80 to-transparent pointer-events-none z-30 transition-opacity duration-700 ease-in-out ${isAtBottom || showKeyboard ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      />

      {/* ARABIC ON-SCREEN KEYBOARD */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-[700px] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-4 pb-6 transition-all duration-300 transform z-40 ${showKeyboard ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
        dir="rtl"
      >
        <div className="flex flex-col gap-2">
          {[
            ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
            ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط", "ذ"],
            ["ئ", "ء", "ؤ", "ر", "ى", "ة", "و", "ز", "ظ", "أ", "إ", "آ"]
          ].map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5">
              {row.map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleInput(letter)}
                  className="flex-1 min-w-[32px] sm:min-w-[42px] h-10 sm:h-12 bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-[#D6C19E]/30 dark:hover:bg-[#D6C19E]/20 text-[#2A2826] dark:text-neutral-100 text-lg sm:text-xl rounded-lg transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95"
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-1 sm:gap-1.5 mt-1">
            <button
              onClick={() => handleInput("Backspace")}
              className="px-6 h-10 sm:h-12 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-all border border-red-100 dark:border-red-900/30 active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              <span>Backspace</span>
            </button>
            <button
              onClick={() => handleInput(" ")}
              className="flex-[3] h-10 sm:h-12 bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-[#D6C19E]/30 dark:hover:bg-[#D6C19E]/20 text-[#2A2826] dark:text-neutral-100 rounded-lg transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95 text-sm font-medium"
            >
              SPACE
            </button>
          </div>
        </div>
      </div>

      <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-full shadow-xl border border-neutral-200 dark:border-neutral-700 p-2.5 z-50 transition-colors duration-300">
        <button
          onClick={() => setVisibilityMode('hidden')}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${visibilityMode === 'hidden' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
        </button>

        <button
          onClick={() => setVisibilityMode('ayah')}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${visibilityMode === 'ayah' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Active Ayah"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
        </button>

        <button
          onClick={() => setVisibilityMode('all')}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${visibilityMode === 'all' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Show All"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>

        <div className="w-8 h-[1px] bg-neutral-300 dark:bg-neutral-600 my-1" />

        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all focus:outline-none ${showKeyboard ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="On-Screen Keyboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" /><path d="M6 12h.01" /><path d="M18 12h.01" /><path d="M7 16h10" /><path d="M10 12h.01" /><path d="M14 12h.01" /></svg>
        </button>

        <div className="w-8 h-[1px] bg-neutral-300 dark:bg-neutral-600 my-1" />

        <button
          onClick={handleRestart}
          className="flex items-center justify-center w-12 h-12 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all focus:outline-none"
          title="Rewrite Surah"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </button>

        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-12 h-12 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all focus:outline-none"
          title="Toggle Night/Day Mode"
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
