"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAllSurahsMeta, getSurah } from "@/lib/quran-data";

interface MemorizationTestPanelProps {
  surahNumber: number;
  ayahNumber: number;
  typingMode: "letter" | "word";
  isDarkMode: boolean;
  toggleTheme: () => void;
  onExit: () => void;
  onNext: () => void;
}

interface WordSegment {
  start: number;
  end: number;
  commitEnd: number;
}

const CHECK_SPACE_RE = /[\s\u00A0]/;

function buildWordSegments(checkString: string): WordSegment[] {
  const segments: WordSegment[] = [];
  let index = 0;

  while (index < checkString.length) {
    while (index < checkString.length && CHECK_SPACE_RE.test(checkString[index])) {
      index += 1;
    }

    if (index >= checkString.length) break;

    const start = index;
    while (index < checkString.length && !CHECK_SPACE_RE.test(checkString[index])) {
      index += 1;
    }

    const end = index;
    let commitEnd = end;
    while (commitEnd < checkString.length && CHECK_SPACE_RE.test(checkString[commitEnd])) {
      commitEnd += 1;
    }

    segments.push({ start, end, commitEnd });
  }

  return segments;
}

export function MemorizationTestPanel({
  surahNumber,
  ayahNumber,
  typingMode,
  isDarkMode,
  toggleTheme,
  onExit,
  onNext,
}: MemorizationTestPanelProps) {
  const surahMeta = useMemo(() => getAllSurahsMeta().find((surah) => surah.number === surahNumber), [surahNumber]);
  const pageData = useMemo(() => getSurah(surahNumber), [surahNumber]);
  const ayahBlock = useMemo(
    () => pageData.blocks.find((block) => block.ayahNumber === ayahNumber) || pageData.blocks[0],
    [ayahNumber, pageData.blocks]
  );
  const wordSegments = useMemo(() => buildWordSegments(ayahBlock.checkString), [ayahBlock.checkString]);

  const [typedIndices, setTypedIndices] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongChar, setWrongChar] = useState<string | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [mistakeIndices, setMistakeIndices] = useState<Set<number>>(new Set());
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [wordDraft, setWordDraft] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  const targetRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    setTypedIndices(new Set());
    setCurrentIndex(0);
    setWrongChar(null);
    setWrongAttempts(0);
    setMistakeIndices(new Set());
    setShowKeyboard(false);
    setWordDraft("");
    setIsComplete(false);
  }, [ayahNumber, surahNumber, typingMode]);

  const currentSegmentIndex = useMemo(() => {
    if (typingMode !== "word") return -1;
    return wordSegments.findIndex((segment) => {
      for (let i = segment.start; i < segment.commitEnd; i++) {
        if (!typedIndices.has(i)) return true;
      }
      return false;
    });
  }, [typedIndices, typingMode, wordSegments]);

  const currentSegment = currentSegmentIndex >= 0 ? wordSegments[currentSegmentIndex] : null;
  const score = Math.round((ayahBlock.checkString.length / Math.max(ayahBlock.checkString.length + wrongAttempts, 1)) * 100);
  const currentTargetWord = currentSegment
    ? ayahBlock.checkString.slice(currentSegment.start, currentSegment.end)
    : "";

  const updateCursorPos = useCallback(() => {
    if (targetRef.current && containerRef.current && currentIndex < ayahBlock.checkString.length) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setCursorPos({
        top: targetRect.top - containerRect.top,
        left: targetRect.left - containerRect.left - 5,
        width: targetRect.width + 10,
        height: targetRect.height,
      });
    }
  }, [ayahBlock.checkString.length, currentIndex]);

  useEffect(() => {
    const timeoutId = window.setTimeout(updateCursorPos, 50);
    window.addEventListener("resize", updateCursorPos);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateCursorPos);
    };
  }, [updateCursorPos]);

  useEffect(() => {
    window.setTimeout(updateCursorPos, 50);
  }, [isDarkMode, updateCursorPos]);

  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex]);

  const completeIfNeeded = useCallback((nextTypedIndices: Set<number>) => {
    if (nextTypedIndices.size >= ayahBlock.checkString.length) {
      setIsComplete(true);
      setCurrentIndex(ayahBlock.checkString.length);
      setWrongChar(null);
    }
  }, [ayahBlock.checkString.length]);

  const handleInput = useCallback((char: string) => {
    if (isComplete) return;

    if (typingMode === "word") {
      const segment = currentSegment;
      if (!segment) return;

      const targetWord = ayahBlock.checkString.slice(segment.start, segment.end);
      if (char === "Backspace") {
        if (wordDraft.length === 0) {
          setWrongChar(null);
          return;
        }

        const nextDraft = wordDraft.slice(0, -1);
        setWordDraft(nextDraft);
        setCurrentIndex(segment.start);
        setWrongChar(null);
        return;
      }

      const nextDraft = wordDraft + char;
      if (nextDraft === targetWord) {
        const nextTypedIndices = new Set(typedIndices);
        for (let i = segment.start; i < segment.commitEnd; i++) {
          nextTypedIndices.add(i);
        }
        setTypedIndices(nextTypedIndices);
        setWordDraft("");

        const nextSegment = wordSegments[currentSegmentIndex + 1];
        const nextIndex = nextSegment ? nextSegment.start : ayahBlock.checkString.length;
        setCurrentIndex(nextIndex);
        setWrongChar(null);
        completeIfNeeded(nextTypedIndices);
        return;
      }

      setWordDraft(nextDraft);
      setCurrentIndex(segment.start);
      setWrongChar(null);

      if (targetWord.startsWith(nextDraft)) {
        return;
      }

      const errorOffset = Math.min(Math.max(nextDraft.length - 1, 0), Math.max(targetWord.length - 1, 0));
      const activeIndex = segment.start + errorOffset;
      setWrongAttempts((value) => value + 1);
      setMistakeIndices((prev) => new Set(prev).add(activeIndex));
      return;
    }

    if (char === "Backspace") {
      if (wrongChar) {
        setWrongChar(null);
        return;
      }

      if (currentIndex <= 0) return;
      const previousIndex = currentIndex - 1;
      setTypedIndices((prev) => {
        const next = new Set(prev);
        next.delete(previousIndex);
        return next;
      });
      setCurrentIndex(previousIndex);
      return;
    }

    if (wrongChar) return;

    const expectedChar = ayahBlock.checkString[currentIndex];
    if (!expectedChar) return;

    if (char === expectedChar) {
      const nextTypedIndices = new Set(typedIndices);
      nextTypedIndices.add(currentIndex);
      setTypedIndices(nextTypedIndices);
      setCurrentIndex((value) => value + 1);
      setWrongChar(null);
      completeIfNeeded(nextTypedIndices);
      return;
    }

    setWrongChar(char);
    setWrongAttempts((value) => value + 1);
    setMistakeIndices((prev) => new Set(prev).add(currentIndex));
  }, [
    ayahBlock.checkString,
    completeIfNeeded,
    currentIndex,
    currentSegment,
    currentSegmentIndex,
    isComplete,
    typedIndices,
    typingMode,
    wordDraft,
    wordSegments,
    wrongChar,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (event.key === " ") event.preventDefault();

      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length > 1) {
        if (event.key === "Backspace") {
          handleInput("Backspace");
        }
        return;
      }

      handleInput(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput]);

  return (
    <div className="w-full max-w-[900px] px-4 sm:px-0 pb-40">
      <div className="mb-6 sm:mb-8 rounded-[28px] border border-[#D6C19E]/40 bg-white/90 dark:bg-neutral-900/90 shadow-xl backdrop-blur-sm p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#C1A063]">Memorization Test</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-100">
              {surahMeta?.number}. {surahMeta?.englishName}
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Ayah {ayahBlock.ayahNumber} · {typingMode === "word" ? "Word by Word" : "Letter by Letter"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-11 h-11 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
              title="Toggle Theme"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-600 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      {isComplete && (
        <div className="mb-6 rounded-[28px] border border-green-200 dark:border-green-900/60 bg-green-50/90 dark:bg-green-950/30 shadow-lg p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-green-600 dark:text-green-400">Result</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-4xl font-bold text-green-700 dark:text-green-300">{score}%</div>
              <p className="mt-1 text-sm text-green-700/80 dark:text-green-200/80">
                {mistakeIndices.size} weak position{mistakeIndices.size === 1 ? "" : "s"} · {wrongAttempts} wrong attempt{wrongAttempts === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onNext}
                className="px-4 py-2.5 rounded-full bg-[#D6C19E] text-white text-sm font-semibold shadow-sm hover:brightness-105 transition-all"
              >
                New Random Ayah
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-white/70 dark:hover:bg-neutral-800 transition-all"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="relative w-full bg-[#FDFBF7] dark:bg-neutral-900 shadow-2xl rounded-sm border-2 sm:border-[16px] border-[#D6C19E] dark:border-neutral-700 px-3 sm:px-8 py-12 sm:py-24 rtl quran-text tracking-normal transition-colors duration-500 select-none"
        dir="rtl"
        style={{ WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}
      >
        <div className="absolute inset-2 border-2 border-[#D6C19E] dark:border-neutral-700 opacity-50 pointer-events-none" />

        <div
          ref={containerRef}
          className="w-full text-[1.6rem] sm:text-[2.3rem] leading-[2.2] sm:leading-[2.9] text-justify mushaf-rules relative"
          style={{ textAlignLast: "center", minHeight: "8.2rem" }}
        >
          {ayahBlock.mapping.map((start, localIndex) => {
            const end = localIndex + 1 === ayahBlock.mapping.length ? ayahBlock.displayString.length : ayahBlock.mapping[localIndex + 1];
            const cluster = ayahBlock.displayString.slice(start, end);
            const isTyped = typedIndices.has(localIndex);
            const isDraftTyped = Boolean(
              typingMode === "word" &&
              currentSegment &&
              localIndex >= currentSegment.start &&
              localIndex < currentSegment.start + wordDraft.length
            );
            const isTarget = localIndex === currentIndex && currentIndex < ayahBlock.checkString.length;
            const isMistakeTarget = wrongChar !== null && isTarget;

            return (
              <span
                key={localIndex}
                ref={isTarget ? targetRef : null}
                className={`inline transition-colors duration-200 ${isTyped || isDraftTyped
                  ? isMistakeTarget
                    ? "text-[#faac23]"
                    : "text-[#2A2826] dark:text-neutral-100"
                  : "text-transparent"
                }`}
              >
                {cluster}
              </span>
            );
          })}
          {!isComplete && currentIndex < ayahBlock.checkString.length && (
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
                  <span className="absolute top-[10%] bottom-[10%] left-[2px] w-[2px] rounded-full animate-flicker" style={{ background: "linear-gradient(to bottom, transparent, #ff2d2d, #ff4d4d, transparent)", boxShadow: "0 0 8px rgba(255,45,45,0.45)" }} />
                  <span className="absolute top-[10%] bottom-[10%] right-[2px] w-[2px] rounded-full animate-flicker" style={{ background: "linear-gradient(to bottom, transparent, #ff2d2d, #ff4d4d, transparent)", boxShadow: "0 0 8px rgba(255,45,45,0.45)" }} />
                  <span className="absolute -bottom-1 left-0 right-0 h-[5px] rounded-full" style={{ background: "#ff3b3b", boxShadow: "0 0 12px 3px rgba(255,59,59,0.50)" }} />
                  <span className="relative z-10 text-red-600 dark:text-red-400 font-medium">{wrongChar}</span>
                </>
              ) : (
                <>
                  <span className="absolute top-[10%] bottom-[10%] left-[2px] w-[2px] rounded-full animate-flicker" style={{ background: isDarkMode ? "linear-gradient(to bottom, transparent, #F4D58D, transparent)" : "linear-gradient(to bottom, transparent, #D8BA72, transparent)", boxShadow: isDarkMode ? "0 0 6px rgba(244,213,141,0.42)" : "0 0 5px rgba(216,186,114,0.30)" }} />
                  <span className="absolute top-[10%] bottom-[10%] right-[2px] w-[2px] rounded-full animate-flicker" style={{ background: isDarkMode ? "linear-gradient(to bottom, transparent, #F4D58D, transparent)" : "linear-gradient(to bottom, transparent, #D8BA72, transparent)", boxShadow: isDarkMode ? "0 0 6px rgba(244,213,141,0.42)" : "0 0 5px rgba(216,186,114,0.30)" }} />
                  <span className="absolute bottom-0 left-0 right-0 h-[4px] rounded-full" style={{ background: isDarkMode ? "#FFD98A" : "#E3C57A", boxShadow: isDarkMode ? "0 0 10px 1px rgba(255,217,138,0.40)" : "0 2px 5px rgba(55,42,14,0.20)" }} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[750px] bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-neutral-200 dark:border-neutral-800 transition-all duration-500 transform z-[60] ${showKeyboard ? "translate-y-0" : "translate-y-[calc(100%-54px)] sm:translate-y-full sm:opacity-0 sm:pointer-events-none"}`} dir="rtl">
        {typingMode === "word" && showKeyboard && (wordDraft.length > 0 || wrongChar) && (
          <div className="absolute bottom-full mb-1.5 sm:mb-2 left-1/2 -translate-x-1/2 w-fit max-w-[min(68vw,14rem)] pointer-events-none">
            <div className="rounded-full border border-[#E3C57A]/45 dark:border-[#D6C19E]/35 bg-[#F3E3BE]/55 dark:bg-[#6B5730]/28 backdrop-blur-xl px-4 py-2 shadow-[0_8px_24px_rgba(180,140,60,0.16)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
              <div className="min-h-[1.45rem] flex items-center justify-center text-[1rem] sm:text-[1.15rem] leading-none quran-text text-[#2A2826] dark:text-neutral-100">
                <span>{wordDraft || "\u00A0"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full sm:hidden border-b border-neutral-100 dark:border-neutral-800/50 py-1.5 px-1 bg-white/50 dark:bg-neutral-800/50">
          <div className="flex items-center justify-center gap-0 relative">
            <div className="absolute left-1 flex items-center justify-center min-w-[2.5rem] h-8 px-2 rounded-full border border-[#D6C19E]/40 bg-[#D6C19E]/10 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9C7B41]">Test</span>
            </div>
            <button
              onClick={() => setShowKeyboard((value) => !value)}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all shrink-0 ${showKeyboard ? "bg-[#D6C19E] text-white dark:text-neutral-900 shadow-sm" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" /><path d="M6 12h.01" /><path d="M18 12h.01" /><path d="M7 16h10" /><path d="M10 12h.01" /><path d="M14 12h.01" /></svg>
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
            <div className="absolute right-1 flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 shadow-sm">
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400">{wrongAttempts}</span>
            </div>
          </div>
        </div>

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

      <div className="fixed right-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-4 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-xl rounded-full shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50 py-2 px-2 z-50 transition-all duration-500 w-[64px]">
        <button
          onClick={() => setShowKeyboard((value) => !value)}
          className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${showKeyboard ? "bg-[#D6C19E] text-white dark:text-neutral-900 shadow-md" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
          title="On-Screen Keyboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" /><path d="M6 12h.01" /><path d="M18 12h.01" /><path d="M7 16h10" /><path d="M10 12h.01" /><path d="M14 12h.01" /></svg>
        </button>
        <div className="w-8 h-[1px] bg-neutral-400 dark:bg-neutral-600 my-1 hidden sm:block" />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center w-11 h-11 rounded-full border border-[#D6C19E]/40 bg-[#D6C19E]/10 text-[#9C7B41] font-bold text-[10px] uppercase tracking-widest">
            test
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400">mode</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center w-11 h-11 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-sm">
            {wrongAttempts}
          </div>
          <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400">wrong</span>
        </div>
      </div>
    </div>
  );
}
