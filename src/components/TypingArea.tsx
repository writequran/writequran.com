"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getSurah, getAllSurahsMeta, type MushafBlock } from "@/lib/quran-data";
import { MistakeRecord, ProgressStats, loadMistakeStats, loadProgressStats, saveMistakeStats, saveProgressStats } from "@/lib/stats";
import { getStorage, setStorage } from "@/lib/storage";
import { ConfirmationModal } from "./ConfirmationModal";
import { PopConfirm } from "./PopConfirm";

// Helper to prevent verse markers from breaking to the next line
const preserveMarkerSpacing = (str: string) => {
  return str.replace(/ \u06DD/g, '\u00A0\u06DD');
};

const getTypedIndicesStorageKey = (surahNumber: number) => `typed_indices_${surahNumber}`;

function loadTypedIndices(surahNumber: number): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = getStorage(getTypedIndicesStorageKey(surahNumber));
    return saved ? new Set<number>(JSON.parse(saved)) : new Set<number>();
  } catch {
    return new Set<number>();
  }
}

function findFirstUntypedIndexInRange(typedIndices: Set<number>, start: number, end: number): number {
  for (let i = start; i < end; i++) {
    if (!typedIndices.has(i)) return i;
  }
  return end;
}

function findNextUntypedIndex(typedIndices: Set<number>, start: number, totalLength: number): number {
  return findFirstUntypedIndexInRange(typedIndices, start, totalLength);
}

function getBlockLimit(blocks: MushafBlock[], blockIndex: number, totalLength: number): number {
  const nextBlock = blocks[blockIndex + 1];
  return nextBlock ? nextBlock.globalCheckOffset : totalLength;
}

interface TypingAreaProps {
  surahNumber: number;
  jumpTarget?: { index: number; ts: number } | null;
  onJump: (type: 'ayah' | 'page' | 'juz' | 'surah', val: number) => void;
  onBlockChange?: (page: number, juz: number, ayah: number) => void;
  onStartReview?: () => void;
  onClearHistory?: () => void;
  onExitReview?: () => void;
  onNextReviewSpot?: () => void;
  isReviewMode?: boolean;
  reviewProgress?: string;
  hasWeakSpots?: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

interface PopConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

function MistakePopover({
  isOpen,
  onClose,
  onReset,
  onReview,
  onExit,
  isReviewMode,
  variant = "top"
}: {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  onReview: () => void;
  onExit: () => void;
  isReviewMode: boolean;
  variant?: "top" | "side";
}) {
  if (!isOpen) return null;

  return (
    <div
      className={`absolute z-[110] animate-in fade-in zoom-in-95 duration-200 ${variant === "top"
        ? "bottom-full right-0 left-auto translate-x-0 mb-3 slide-in-from-bottom-2"
        : "left-full top-1/2 -translate-y-1/2 ml-4 slide-in-from-left-2"
        }`}
    >
      <div 
        className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 min-w-fit flex flex-col gap-0.5"
        data-mistake-menu="true"
      >
        <button
          onClick={(e) => { e.stopPropagation(); onReset(); onClose(); }}
          className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95 text-right w-full whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
          Reset Session & History
        </button>

        {isReviewMode ? (
          <button
            onClick={(e) => { e.stopPropagation(); onExit(); onClose(); }}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl transition-all active:scale-95 text-right w-full font-sans whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            Exit Review Mode
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onReview(); onClose(); }}
            className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all active:scale-95 text-right w-full whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>
            Review Weak Spots
          </button>
        )}
      </div>

      {/* Adaptive Arrow */}
      <div className={`absolute w-3 h-3 bg-white dark:bg-neutral-900 rotate-45 z-[-1] ${variant === "top"
        ? "-bottom-1.5 right-4 border-r border-b border-neutral-200 dark:border-neutral-800"
        : "-left-1.5 top-1/2 -translate-y-1/2 border-l border-t border-neutral-200 dark:border-neutral-800"
        }`} />
    </div>
  );
}

type VisibilityMode = "hidden" | "ayah" | "all";

export function TypingArea({
  surahNumber,
  jumpTarget,
  onJump,
  onBlockChange,
  onStartReview,
  onClearHistory,
  onExitReview,
  onNextReviewSpot,
  isReviewMode = false,
  reviewProgress = "",
  hasWeakSpots = false,
  isDarkMode,
  toggleTheme
}: TypingAreaProps) {
  const pageData = useMemo(() => getSurah(surahNumber), [surahNumber]);
  const surahMeta = useMemo(() => getAllSurahsMeta().find(s => s.number === surahNumber), [surahNumber]);
  const surahName = surahMeta?.name;
  const { globalCheckString, blocks } = pageData;
  const [typedIndices, setTypedIndices] = useState<Set<number>>(() => loadTypedIndices(surahNumber));

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const initialTypedIndices = loadTypedIndices(surahNumber);
    if (jumpTarget) {
      return findNextUntypedIndex(initialTypedIndices, jumpTarget.index, globalCheckString.length);
    }
    const saved = getStorage(`quran_typing_progress_${surahNumber}`);
    const parsed = saved ? parseInt(saved, 10) || 0 : 0;
    return findNextUntypedIndex(initialTypedIndices, parsed, globalCheckString.length);
  });

  const [wrongChar, setWrongChar] = useState<string | null>(null);

  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>(() => {
    if (typeof window === "undefined") return "hidden";
    return (getStorage('visibility_mode') as VisibilityMode) || "hidden";
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

  const [modalType, setModalType] = useState<"reset" | "rewrite" | "rewrite_ayah" | "mistake_menu" | null>(null);

  const sessionMistakes = sessionMistakeIndices.size;

  useEffect(() => {
    setStorage(`session_attempts_${surahNumber}`, sessionAttempts.toString());
  }, [sessionAttempts, surahNumber]);

  useEffect(() => {
    setStorage(`session_mistake_indices_${surahNumber}`, JSON.stringify(Array.from(sessionMistakeIndices)));
  }, [sessionMistakeIndices, surahNumber]);

  useEffect(() => {
    setStorage(getTypedIndicesStorageKey(surahNumber), JSON.stringify(Array.from(typedIndices).sort((a, b) => a - b)));
  }, [typedIndices, surahNumber]);

  const globalMistakesRef = useRef<Record<string, MistakeRecord>>({});
  const globalProgressRef = useRef<Record<number, ProgressStats>>({});

  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [showHint, setShowHint] = useState(false);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset timer whenever index or wrong char changes
    setShowHint(false);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);

    if (currentIndex < globalCheckString.length) {
      hintTimeoutRef.current = setTimeout(() => {
        setShowHint(true);
      }, 5000);
    }

    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [currentIndex, wrongChar, globalCheckString.length]);

  const targetRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastHandledJumpTsRef = useRef<number | null>(null);

  useEffect(() => {
    globalMistakesRef.current = loadMistakeStats();
    globalProgressRef.current = loadProgressStats();
  }, []);

  const currentBlock = useMemo(() => {
    return blocks.find((b: any) =>
      currentIndex >= b.globalCheckOffset &&
      currentIndex < b.globalCheckOffset + b.checkString.length
    ) || blocks[blocks.length - 1];
  }, [currentIndex, blocks]);

  const rewriteAyahTarget = useMemo(() => {
    const blockIndex = blocks.findIndex((block) =>
      currentIndex >= block.globalCheckOffset &&
      currentIndex < block.globalCheckOffset + block.checkString.length
    );

    if (blockIndex >= 0) {
      return {
        block: blocks[blockIndex],
        startIdx: blocks[blockIndex].globalCheckOffset,
        limit: getBlockLimit(blocks, blockIndex, globalCheckString.length),
      };
    }

    const fallbackIndex = currentIndex >= globalCheckString.length ? blocks.length - 1 : 0;
    const fallbackBlock = blocks[fallbackIndex];

    return fallbackBlock ? {
      block: fallbackBlock,
      startIdx: fallbackBlock.globalCheckOffset,
      limit: getBlockLimit(blocks, fallbackIndex, globalCheckString.length),
    } : null;
  }, [blocks, currentIndex, globalCheckString.length]);

  useEffect(() => {
    if (currentBlock && onBlockChange) {
      onBlockChange(currentBlock.page, currentBlock.juz, currentBlock.ayahNumber);
    }
  }, [currentBlock, onBlockChange]);

  useEffect(() => {
    if (jumpTarget && lastHandledJumpTsRef.current !== jumpTarget.ts) {
      lastHandledJumpTsRef.current = jumpTarget.ts;
      setCurrentIndex(findNextUntypedIndex(typedIndices, jumpTarget.index, globalCheckString.length));
    }
  }, [jumpTarget, typedIndices, globalCheckString.length]);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      
      // Mistake Menu Popover logic
      if (modalType === "mistake_menu") {
        if (!target.closest('[data-mistake-menu="true"]') && !target.closest('[data-mistake-trigger="true"]')) {
          setModalType(null);
        }
      }
      
      // Rewrite Ayah PopConfirm logic
      if (modalType === "rewrite_ayah") {
        if (!target.closest('[data-rewrite-ayah="true"]')) {
          setModalType(null);
        }
      }
    };

    if (modalType) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [modalType]);

  const updateCursorPos = useCallback(() => {
    if (targetRef.current && containerRef.current && currentIndex < globalCheckString.length) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

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
    setTimeout(updateCursorPos, 50);
  }, [isDarkMode, updateCursorPos]);

  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const handleResetSessionStats = () => {
    setModalType("mistake_menu");
  };

  const handleRestart = () => {
    setModalType("rewrite");
  };

  const handleRestartAyah = () => {
    if (!rewriteAyahTarget) return;
    setModalType("rewrite_ayah");
  };

  const confirmReset = () => {
    setSessionAttempts(0);
    setSessionMistakeIndices(new Set());
  };

  const confirmRestart = () => {
    setCurrentIndex(0);
    setWrongChar(null);
    setTypedIndices(new Set());
    setTimeout(updateCursorPos, 100);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmRestartAyah = () => {
    if (!rewriteAyahTarget) return;
    const { startIdx, limit } = rewriteAyahTarget;

    setCurrentIndex(startIdx);
    setWrongChar(null);
    setTypedIndices(prev => {
      const next = new Set(prev);
      for (const idx of Array.from(next)) {
        if (idx >= startIdx && idx < limit) {
          next.delete(idx);
        }
      }
      return next;
    });

    // Clear mistakes in the current ayah range
    setSessionMistakeIndices(prev => {
      const next = new Set(prev);
      for (const idx of Array.from(next)) {
        if (idx >= startIdx && idx < limit) {
          next.delete(idx);
        }
      }
      return next;
    });

    setTimeout(updateCursorPos, 100);
  };

  const handleInput = useCallback((char: string) => {
    if (char === "Backspace") {
      if (wrongChar) {
        setWrongChar(null);
      } else {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
        setTypedIndices(prev => {
          const next = new Set(prev);
          next.delete(Math.max(0, currentIndex - 1));
          return next;
        });
        setWrongChar(null);
      }
      return;
    }

    if (wrongChar) return;

    const expectedChar = globalCheckString[currentIndex];
    if (!expectedChar) return;

    if (char === expectedChar) {
      setTypedIndices(prev => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });
      setCurrentIndex((prev) => {
        const next = findNextUntypedIndex(new Set([...typedIndices, currentIndex]), prev + 1, globalCheckString.length);
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
  }, [currentIndex, globalCheckString, wrongChar, surahNumber, currentBlock, typedIndices]);

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
        <span key={i} className={`${colorClass} transition-colors duration-300`}>
          {part}
        </span>
      );
    });
  };

  const typedCount = typedIndices.size;

  return (
    <div className="w-full flex flex-col items-center pb-36 px-0">
      {/* LEFT STATS DOCK */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-3 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl rounded-full shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 py-10 px-2 z-50 transition-all duration-500 w-[64px]">

        {/* JUMP CONTROLS GROUP */}
        <div className="flex flex-col gap-3 w-full items-center">
          {/* PAGE CONTROL */}
          <div className="flex flex-col items-center gap-1 w-full group/ctrl">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider transition-colors group-hover/ctrl:text-[#D6C19E] select-none">Page</span>
            <div className="relative w-full">
              <input
                type="number"
                min="1"
                max="604"
                className="no-spinner bg-neutral-50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 w-full py-2.5 text-center text-lg font-bold text-neutral-800 dark:text-neutral-100 rounded-2xl border border-neutral-100 dark:border-neutral-800 group-hover/ctrl:border-[#D6C19E]/40 focus:border-[#D6C19E] focus:bg-white dark:focus:bg-neutral-900 focus:outline-none shadow-sm transition-all cursor-pointer"
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
          </div>

          {/* JUZ CONTROL */}
          <div className="flex flex-col items-center gap-1 w-full group/ctrl">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider transition-colors group-hover/ctrl:text-[#D6C19E] select-none">Juz</span>
            <div className="relative w-full">
              <input
                type="number"
                min="1"
                max="30"
                className="no-spinner bg-neutral-50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 w-full py-2.5 text-center text-lg font-bold text-neutral-800 dark:text-neutral-100 rounded-2xl border border-neutral-100 dark:border-neutral-800 group-hover/ctrl:border-[#D6C19E]/40 focus:border-[#D6C19E] focus:bg-white dark:focus:bg-neutral-900 focus:outline-none shadow-sm transition-all cursor-pointer"
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
          </div>

          {/* AYAH CONTROL */}
          <div className="flex flex-col items-center gap-1 w-full group/ctrl">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider transition-colors group-hover/ctrl:text-[#D6C19E] select-none">Ayah</span>
            <div className="relative w-full">
              <input
                type="number"
                min="1"
                className="no-spinner bg-neutral-50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 w-full py-2.5 text-center text-lg font-bold text-neutral-800 dark:text-neutral-100 rounded-2xl border border-neutral-100 dark:border-neutral-800 group-hover/ctrl:border-[#D6C19E]/40 focus:border-[#D6C19E] focus:bg-white dark:focus:bg-neutral-900 focus:outline-none shadow-sm transition-all cursor-pointer"
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
          </div>
        </div>

        <div className="w-8 h-[1px] bg-neutral-400 dark:bg-neutral-600 my-4" />

        {/* PASSIVE STATS */}
        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[9px] uppercase font-bold text-green-500 tracking-widest select-none">Done</span>
            <div className="flex items-center justify-center w-12 h-12 rounded-full border border-green-500/40 bg-green-50 dark:bg-green-900/10 shadow-sm mt-1">
              <span className="text-[20px] font-bold text-green-600 dark:text-green-400">
                {((typedCount / (globalCheckString.length || 1)) * 100).toFixed(0)}<span className="text-[10px] ml-0.5 opacity-50">%</span>
              </span>
            </div>
          </div>

          <div className={`flex flex-col items-center gap-1 text-center relative group/err min-h-[70px] transition-all duration-300 ${(!isReviewMode && sessionMistakes === 0 && hasWeakSpots) ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
            <span className={`text-[9px] uppercase font-bold tracking-widest select-none ${isReviewMode ? 'text-orange-500' : (sessionMistakes > 0 ? 'text-red-500/70' : 'text-neutral-400')}`}>
              {isReviewMode ? 'Reviewing' : 'Errors'}
            </span>

            <div className={`flex items-center mt-1 relative ${isReviewMode ? 'flex-col gap-0.5' : 'gap-1.5'}`}>
              <div
                onClick={() => setModalType("mistake_menu")}
                data-mistake-trigger="true"
                className={`flex items-center justify-center ${isReviewMode ? 'px-3' : 'w-10'} h-10 rounded-full border transition-all duration-300 shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${isReviewMode
                  ? 'border-orange-500/40 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400'
                  : 'border-red-500/40 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400'
                  }`}
              >
                <span className={`font-bold ${isReviewMode ? 'text-sm' : 'text-lg'}`}>
                  {isReviewMode ? reviewProgress : sessionMistakes}
                </span>
              </div>

              <MistakePopover
                isOpen={modalType === "mistake_menu"}
                onClose={() => setModalType(null)}
                onReset={() => { confirmReset(); onClearHistory?.(); setModalType(null); }}
                onReview={() => { onStartReview?.(); setModalType(null); }}
                onExit={() => { onExitReview?.(); setModalType(null); }}
                isReviewMode={isReviewMode}
                variant="side"
              />

              {isReviewMode && (
                <button
                  onClick={onNextReviewSpot}
                  className="flex items-center justify-center w-7 h-7 rounded-full text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-all active:scale-90"
                  title="Next Weak Spot"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              )}
            </div>

            {!isReviewMode && sessionMistakes > 0 && (
              <button
                onClick={handleResetSessionStats}
                className="absolute -bottom-6 flex items-center justify-center w-6 h-6 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-full shadow-md text-neutral-400 hover:text-red-500 transition-all z-10 duration-200 hover:scale-110 active:scale-95 sm:opacity-0 group-hover/err:opacity-100"
                title="Reset Session Mistakes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {typedCount === globalCheckString.length && globalCheckString.length > 0 && (
        <div className="my-8 flex flex-col items-center animate-in fade-in duration-500">
          <p className="text-3xl font-medium text-green-700 dark:text-green-500 quran-text tracking-normal border-b-2 border-green-500/30 pb-4">
            صَدَقَ اللّٰهُ الْعَظِيمُ
          </p>
        </div>
      )}

      <div
        className="relative w-full max-w-[800px] bg-[#FDFBF7] dark:bg-neutral-900 shadow-2xl rounded-sm border-2 sm:border-[16px] border-[#D6C19E] dark:border-neutral-700 px-3 sm:px-8 py-12 sm:py-24 rtl quran-text tracking-normal transition-colors duration-500 cursor-default select-none"
        dir="rtl"
        style={{ WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}
      >
        <div className="absolute inset-2 border-2 border-[#D6C19E] dark:border-neutral-700 opacity-50 pointer-events-none" />

        <div
          ref={containerRef}
          className="w-full text-[1.5rem] sm:text-[2.2rem] leading-[2.2] sm:leading-[2.8] text-justify mushaf-rules relative" style={{ textAlignLast: 'center' }}
        >
          {/* SURAH NAME HEADER (ABSOLUTE) */}
          <div className="absolute -top-10 sm:-top-16 left-0 right-0 flex justify-center pointer-events-none select-none">
            <span className="text-[1.5rem] sm:text-5xl text-neutral-1000 dark:text-neutral-200 opacity-100 font-medium quran-text">
              {surahName}
            </span>
          </div>

          {pageData.preBismillah && (
            <div className="w-full text-[#2A2826] dark:text-neutral-100 flex justify-center mb-4 select-none" style={{ textAlignLast: 'auto' }}>
              <span>{pageData.preBismillah}</span>
            </div>
          )}

          {pageData.blocks.map((block: any, blockIndex: number) => {
            const blockStart = block.globalCheckOffset;
            const blockLength = block.checkString.length;
            const blockEnd = blockStart + blockLength;

            const isActiveAyah = currentIndex >= blockStart && currentIndex < blockEnd;
            const showHint = visibilityMode === "all" || (visibilityMode === "ayah" && isActiveAyah);

            return (
              <span key={blockIndex}>
                {block.mapping.map((_: number, localIndex: number) => {
                  const start = block.mapping[localIndex];
                  const end = (localIndex + 1 === block.mapping.length)
                    ? block.displayString.length
                    : block.mapping[localIndex + 1];
                  const cluster = block.displayString.slice(start, end);
                  const globalIdx = blockStart + localIndex;
                  const isTyped = typedIndices.has(globalIdx);
                  const isMistake = sessionMistakeIndices.has(globalIdx);
                  const isTarget = globalIdx === currentIndex && currentIndex < globalCheckString.length;

                  return (
                    <span
                      key={globalIdx}
                      ref={isTarget ? targetRef : null}
                      className="inline"
                    >
                      {renderTextWithMarkers(
                        cluster,
                        isTyped ? (isMistake ? "mistake" : "typed") : (showHint ? "hint" : "hidden")
                      )}
                    </span>
                  );
                })}
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
              {showHint && (
                <div className="absolute bottom-full mb-1 sm:mb-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                  <div className="bg-[#D6C19E] text-white dark:text-neutral-900 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-base sm:text-lg font-bold shadow-xl flex items-center justify-center min-w-[32px]">
                    <span className="leading-none quran-text">{globalCheckString[currentIndex]}</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-[#D6C19E]" />
                  </div>
                </div>
              )}
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
                    className="absolute bottom-0 left-0 right-0 h-[4px] rounded-full"
                    style={{
                      background: isDarkMode ? "#FFD98A" : "#E3C57A",
                      boxShadow: isDarkMode
                        ? "0 0 10px 1px rgba(255,217,138,0.40)"
                        : "0 2px 5px rgba(55,42,14,0.20)"
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#FDFBF7] dark:from-neutral-900 via-[#FDFBF7]/80 dark:via-neutral-900/80 to-transparent pointer-events-none z-30 transition-opacity duration-700 ease-in-out ${isAtBottom || showKeyboard ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      />

      {/* ARABIC ON-SCREEN KEYBOARD + MOBILE TOOLBAR */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[750px] bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-neutral-200 dark:border-neutral-800 transition-all duration-500 transform z-[60] ${showKeyboard ? 'translate-y-0' : 'translate-y-[calc(100%-54px)] sm:translate-y-full sm:opacity-0 sm:pointer-events-none'
          }`}
        dir="rtl"
      >
        {/* Integrated Mobile Toolbar (Header) */}
        <div className="w-full sm:hidden border-b border-neutral-100 dark:border-neutral-800/50 py-1.5 px-1 bg-white/50 dark:bg-neutral-800/50">
          <div className="flex items-center justify-center gap-0 relative">
            {/* PROGRESS PERCENTAGE (left) */}
            <div className="absolute left-1 flex items-center justify-center w-8 h-8 rounded-full border border-green-500/40 bg-green-500/5 shadow-sm">
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                {Math.round((typedCount / (globalCheckString.length || 1)) * 100)}%
              </span>
            </div>

            {/* JUMP SHIFTERS MOVED TO TOP */}

            <button
              onClick={() => setVisibilityMode('hidden')}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${visibilityMode === 'hidden' ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
            </button>

            <button
              onClick={() => setVisibilityMode('ayah')}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${visibilityMode === 'ayah' ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
            </button>

            <button
              onClick={() => setVisibilityMode('all')}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${visibilityMode === 'all' ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /></svg>
            </button>

            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 shrink-0 mx-1" />

            <button
              onClick={() => setShowKeyboard(!showKeyboard)}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${showKeyboard ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" /><path d="M6 12h.01" /><path d="M18 12h.01" /><path d="M7 16h10" /><path d="M10 12h.01" /><path d="M14 12h.01" /></svg>
            </button>

            <div className="relative shrink-0" data-rewrite-ayah="true">
              <button
                onClick={handleRestartAyah}
                className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all scale-100 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /><path d="M12 7v5l3 3" /></svg>
              </button>
              <PopConfirm
                isOpen={modalType === "rewrite_ayah"}
                onClose={() => setModalType(null)}
                onConfirm={confirmRestartAyah}
                title="Rewrite Ayah?"
                confirmLabel="Yes"
                cancelLabel="No"
              />
            </div>

            <button
              onClick={handleRestart}
              className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shrink-0 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            </button>

            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 shrink-0 mx-1" />

            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shrink-0"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>

            {/* ERROR COUNTER / REVIEW TRACKER (right) */}
            {(sessionMistakes > 0 || isReviewMode || hasWeakSpots) && (
              <div className={`absolute right-1 flex items-center gap-0 transition-all duration-300 ${(!isReviewMode && sessionMistakes === 0 && hasWeakSpots) ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
                {isReviewMode && (
                  <button
                    onClick={onNextReviewSpot}
                    className="flex items-center justify-center w-6 h-6 rounded-full text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all active:scale-90"
                    title="Next Weak Spot"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setModalType(modalType === "mistake_menu" ? null : "mistake_menu")}
                    data-mistake-trigger="true"
                    className={`flex items-center justify-center ${isReviewMode ? 'px-1.5' : 'w-8'} h-8 rounded-full border transition-all duration-300 shadow-sm active:scale-95 ${isReviewMode
                      ? 'border-orange-500/40 bg-orange-50 dark:bg-orange-900/10'
                      : 'border-red-500/40 bg-red-50 dark:bg-red-900/10'
                      }`}
                    title={isReviewMode ? "Review Progress" : "Manage Mistakes"}
                  >
                    <span className={`font-bold ${isReviewMode ? 'text-[10px]' : 'text-[12px]'} ${isReviewMode ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {isReviewMode ? reviewProgress : sessionMistakes}
                    </span>
                    {!isReviewMode && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                      </div>
                    )}
                  </button>

                  <MistakePopover
                    isOpen={modalType === "mistake_menu"}
                    onClose={() => setModalType(null)}
                    onReset={() => { confirmReset(); onClearHistory?.(); }}
                    onReview={() => onStartReview?.()}
                    onExit={() => onExitReview?.()}
                    isReviewMode={isReviewMode}
                    variant="top"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Content */}
        <div className="p-2 sm:p-6 pb-4 sm:pb-8">
          <div className="flex flex-col gap-0.5 sm:gap-2">
            {[
              ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "د"],
              ["ش", "س", "ي", "ب", "ل", "ا", "ت", "ن", "م", "ك", "ط", "ذ"],
              ["ئ", "ء", "ؤ", "ر", "ى", "ة", "و", "ز", "ظ", "أ", "إ", "آ"]
            ].map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1.5">
                {row.map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleInput(letter)}
                    className="flex-1 min-w-[28px] sm:min-w-[42px] h-12 sm:h-12 bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-[#D6C19E]/30 dark:hover:bg-[#D6C19E]/20 text-[#2A2826] dark:text-neutral-100 text-base sm:text-xl rounded-lg transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95"
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
            <div className="flex justify-center gap-0.5 sm:gap-1.5 mt-1">
              <button
                onClick={() => handleInput("Backspace")}
                className="px-4 sm:px-6 h-10 sm:h-12 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg transition-all border border-red-100 dark:border-red-900/30 active:scale-95 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                <span className="hidden sm:inline">Backspace</span>
              </button>
              <button
                onClick={() => handleInput(" ")}
                className="flex-[3] h-10 sm:h-12 bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-[#D6C19E]/30 dark:hover:bg-[#D6C19E]/20 text-[#2A2826] dark:text-neutral-100 rounded-lg transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95 text-xs font-bold uppercase tracking-widest"
              >
                SPACE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP-ONLY TOOLBAR */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-4 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl rounded-full shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 py-2 px-2 z-50 transition-all duration-500 w-[64px]">
        <div className="flex flex-col items-center gap-1 group/btn">
          <button
            onClick={() => setVisibilityMode('hidden')}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${visibilityMode === 'hidden' ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            title="Hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
          </button>
          <span className={`text-[9px] uppercase font-bold tracking-widest transition-colors block ${visibilityMode === 'hidden' ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400 group-hover/btn:text-neutral-600'}`}>hide</span>
        </div>

        <div className="flex flex-col items-center gap-1 group/btn">
          <button
            onClick={() => setVisibilityMode('ayah')}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${visibilityMode === 'ayah' ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            title="Active Ayah"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
          </button>
          <span className={`text-[9px] uppercase font-bold tracking-widest text-center transition-colors block ${visibilityMode === 'ayah' ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400 group-hover/btn:text-neutral-600'}`}>ayah</span>
        </div>

        <div className="flex flex-col items-center gap-1 group/btn">
          <button
            onClick={() => setVisibilityMode('all')}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${visibilityMode === 'all' ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
            title="Show All"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <span className={`text-[9px] uppercase font-bold tracking-widest transition-colors block ${visibilityMode === 'all' ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400 group-hover/btn:text-neutral-600'}`}>all</span>
        </div>

        <div className="w-8 h-[1px] bg-neutral-400 dark:bg-neutral-600 my-1 hidden sm:block" />

        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          className={`flex items-center justify-center w-11 h-11 rounded-full transition-all focus:outline-none ${showKeyboard ? 'bg-[#D6C19E] text-white dark:text-neutral-900 shadow-md' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          title="On-Screen Keyboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" /><path d="M6 12h.01" /><path d="M18 12h.01" /><path d="M7 16h10" /><path d="M10 12h.01" /><path d="M14 12h.01" /></svg>
        </button>

        <div className="w-8 h-[1px] bg-neutral-400 dark:bg-neutral-600 my-1 hidden sm:block" />

        <div className="flex flex-col items-center gap-1 group/btn relative" data-rewrite-ayah="true">
          <button
            onClick={handleRestartAyah}
            className="flex items-center justify-center w-11 h-11 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all focus:outline-none"
            title="Rewrite Ayah"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /><path d="M12 7v5l3 3" /></svg>
          </button>
          <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 group-hover/btn:text-neutral-600 transition-colors block">ayah</span>

          <PopConfirm
            isOpen={modalType === "rewrite_ayah"}
            onClose={() => setModalType(null)}
            onConfirm={confirmRestartAyah}
            title="Rewrite current Ayah?"
            confirmLabel="Yes"
            cancelLabel="No"
          />
        </div>

        <div className="flex flex-col items-center gap-1 group/btn">
          <button
            onClick={handleRestart}
            className="flex items-center justify-center w-11 h-11 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all focus:outline-none"
            title="Rewrite Surah"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
          <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 group-hover/btn:text-neutral-600 transition-colors block">rewrite</span>
        </div>
        <div className="w-8 h-[1px] bg-neutral-400 dark:bg-neutral-600 my-1 hidden sm:block" />

        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-11 h-11 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all focus:outline-none hidden sm:flex"
          title="Toggle Night/Day Mode"
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          )}
        </button>
      </div>

      <ConfirmationModal
        isOpen={modalType === "reset"}
        onClose={() => setModalType(null)}
        onConfirm={() => {
          confirmReset();
          onClearHistory?.();
        }}
        title="Reset All Progress?"
        message="This will clear your current session mistakes and your entire mistake history for this Surah."
      />



      <ConfirmationModal
        isOpen={modalType === "rewrite"}
        onClose={() => setModalType(null)}
        onConfirm={confirmRestart}
        title="Rewrite Surah?"
        message="This will reset your progress to the beginning of this Surah."
      />
    </div>
  );
}
