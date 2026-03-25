"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSurah, findCheckIndexByDisplayOffset } from "@/lib/quran-data";

interface TypingAreaProps {
  surahNumber: number;
}

type VisibilityMode = "hidden" | "ayah" | "all";

export function TypingArea({ surahNumber }: TypingAreaProps) {
  const pageData = getSurah(surahNumber);
  const { globalCheckString } = pageData;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongChar, setWrongChar] = useState<string | null>(null);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("hidden");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const targetRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

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
    if (targetRef.current && currentIndex < globalCheckString.length) {
      setCursorPos({
        top: targetRef.current.offsetTop,
        left: targetRef.current.offsetLeft,
        width: targetRef.current.offsetWidth,
        height: targetRef.current.offsetHeight,
      });
    }
  }, [currentIndex, globalCheckString.length]);

  useEffect(() => {
    const timeoutId = setTimeout(updateCursorPos, 150);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") e.preventDefault();

      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        if (e.key === "Backspace") {
          if (wrongChar) {
            setWrongChar(null);
          } else {
            setCurrentIndex((prev) => Math.max(0, prev - 1));
            setWrongChar(null);
          }
        }
        return;
      }

      if (wrongChar) return;

      const expectedChar = globalCheckString[currentIndex];
      if (!expectedChar) return;

      const typedChar = e.key;

      if (typedChar === expectedChar) {
        setCurrentIndex((prev) => prev + 1);
        setWrongChar(null);
      } else {
        setWrongChar(typedChar);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, globalCheckString, wrongChar]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setWrongChar(null);
    setTimeout(updateCursorPos, 100);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTextClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks on the main text area
    const target = e.target as HTMLElement;
    const blockEl = target.closest('[data-block-index]');
    if (!blockEl) return;

    const blockIndex = parseInt(blockEl.getAttribute('data-block-index') || '-1');
    if (blockIndex === -1) return;

    const block = pageData.blocks[blockIndex];
    if (!block) return;

    // Use the native Range API to find character offset at click position
    let range: Range | undefined;
    if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
      }
    } else if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (r) range = r;
    }

    if (!range || !range.startContainer) return;

    // We need to find the offset relative to the block's displayString.
    // Since we split by markers, the text might be in different spans.
    const textNode = range.startContainer;
    const offsetInNode = range.startOffset;

    // Find all text nodes within the block element and sum up lengths until we hit ours
    const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
    let totalDisplayOffset = 0;
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode === textNode) {
        totalDisplayOffset += offsetInNode;
        break;
      }
      totalDisplayOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    // Map display offset to check index
    const checkIndexInBlock = findCheckIndexByDisplayOffset(block, totalDisplayOffset);
    const newGlobalIndex = block.globalCheckOffset + checkIndexInBlock;

    setCurrentIndex(newGlobalIndex);
    setWrongChar(null);
  }, [pageData.blocks]);

  let isInActiveAyah = false;

  const renderTextWithMarkers = (text: string, isTyped: boolean, isHint: boolean = false) => {
    if (!text) return null;
    const parts = text.split(/(\u06DD[\u0660-\u0669]+)/g);

    return parts.map((part, i) => {
      const isMarker = part.startsWith('\u06DD');
      
      // Determine visibility for foreground text
      // Hint layer is always 'visible' within its layer, but its layer's opacity is controlled by the parent
      let show = isHint || isTyped || visibilityMode === "all" || (visibilityMode === "ayah" && isInActiveAyah);

      if (isMarker) {
        if (!isTyped && !isHint) {
          isInActiveAyah = false;
        }
        
        // Suppress markers in the hint layer to reduce clutter
        if (isHint) return null;

        const digits = part.slice(1);
        const markerMaskBackground = (show && !isHint) ? "bg-[#FDFBF7] dark:bg-[#121212]" : "";
        const markerColor = "text-[#C1A063]";
        
        return (
          <span key={i} className={`relative inline-flex items-center justify-center mx-1 ${markerColor} transition-all duration-300 select-none ${markerMaskBackground}`}>
            {/* Base Circle establishing the exact normal glyph size without expansion */}
            <span className="leading-none quran-text">{'\u06DD'}</span>

            {/* Isolated absolute layer bounding perfectly inside the circle to guarantee absolute centering. */}
            <span className={`absolute inset-0 flex items-center justify-center text-[0.45em] quran-text leading-none z-10 translate-y-[0em]`}>
              {digits}
            </span>
          </span>
        );
      }

      let colorClass = "";
      let maskClass = "";
      
      if (isHint) {
        // Significantly soften the hint layer to avoid distraction
        colorClass = "text-neutral-200/30 dark:text-neutral-800/20";
        maskClass = "bg-transparent";
      } else if (show) {
        colorClass = "text-[#2A2826] dark:text-neutral-100";
        // Apply solid background mask only to revealed text to allow guide lines to show in empty space
        maskClass = "bg-[#FDFBF7] dark:bg-[#121212]";
      } else {
        // Use transparent color instead of opacity-0 to keep the layout run intact for shaping
        colorClass = "text-transparent";
        maskClass = "bg-transparent";
      }

      return (
        <span key={i} className={`${colorClass} ${maskClass} transition-all duration-300`}>
          {part}
        </span>
      );
    });
  };

  return (
    <div className="w-full flex flex-col items-center pb-36 px-4">

      {currentIndex === globalCheckString.length && globalCheckString.length > 0 && (
        <div className="my-8 flex flex-col items-center animate-in fade-in duration-500">
          <p className="text-3xl font-medium text-green-700 dark:text-green-500 quran-text tracking-normal border-b-2 border-green-500/30 pb-4">
            صَدَقَ اللّٰهُ الْعَظِيمُ
          </p>
        </div>
      )}

      <div
        className="relative w-full max-w-[800px] bg-[#FDFBF7] dark:bg-[#121212] shadow-2xl rounded-sm border-[16px] border-[#D6C19E] dark:border-neutral-800 px-8 py-16 rtl quran-text tracking-normal transition-colors duration-500 cursor-text select-text"
        dir="rtl"
        onClick={handleTextClick}
        style={{ WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}
      >
        <div className="absolute inset-2 border-2 border-[#D6C19E] dark:border-neutral-700 opacity-50 pointer-events-none" />

        <div className="w-full text-[2.2rem] leading-[2.8] text-center mushaf-rules relative">
          {pageData.preBismillah && (
            <div className="w-full text-[#2A2826] dark:text-neutral-100 flex justify-center mb-4 select-none">
              <span>{pageData.preBismillah}</span>
            </div>
          )}

          {/* BACKGROUND HINT LAYER (GHOST TEXT) */}
          <div className="absolute inset-0 px-8 py-16 pointer-events-none select-none transition-opacity duration-300">
            {pageData.blocks.map((block, blockIndex) => {
              const blockStart = block.globalCheckOffset;
              const blockLength = block.checkString.length;
              const blockEnd = blockStart + blockLength;
              const isActive = currentIndex >= blockStart && currentIndex < blockEnd;

              const showHint = visibilityMode === "all" || (visibilityMode === "ayah" && isActive);
              const hintOpacity = showHint ? "opacity-100" : "opacity-0";

              return (
                <span key={`hint-${blockIndex}`} className={`transition-opacity duration-300 ${hintOpacity}`}>
                  {renderTextWithMarkers(block.displayString, false, true)}
                  {" "}
                </span>
              );
            })}
          </div>

          {/* FOREGROUND TYPING LAYER */}
          <div className="relative z-10">
            {pageData.blocks.map((block, blockIndex) => {
              const blockStart = block.globalCheckOffset;
              const blockLength = block.checkString.length;
              const blockEnd = blockStart + blockLength;

              const isFinished = currentIndex >= blockEnd;
              const isFuture = currentIndex < blockStart;

              if (isFinished) {
                return (
                  <span key={blockIndex} data-block-index={blockIndex}>
                    {renderTextWithMarkers(block.displayString, true)}
                    {" "}
                  </span>
                );
              }

              if (isFuture) {
                return (
                  <span key={blockIndex} data-block-index={blockIndex}>
                    {renderTextWithMarkers(block.displayString, false)}
                    {" "}
                  </span>
                );
              }

              const localIndex = currentIndex - blockStart;
              const currentDisplayIndex = block.mapping[localIndex] || 0;

              const typedSpan = block.displayString.slice(0, currentDisplayIndex);
              const targetSpan = block.displayString.slice(currentDisplayIndex, currentDisplayIndex + 1);
              const untypedSpan = block.displayString.slice(currentDisplayIndex + 1);

              const ZWJ = '\u200D';
              const typedWithJ = typedSpan ? typedSpan + ZWJ : "";
              const targetWithJ = ZWJ + targetSpan + ZWJ;
              const untypedWithJ = untypedSpan ? ZWJ + untypedSpan : "";

              const renderTyped = renderTextWithMarkers(typedWithJ, true);
              isInActiveAyah = true;
              const renderUntyped = renderTextWithMarkers(untypedWithJ, false);

              return (
                <span key={blockIndex} data-block-index={blockIndex} className="inline whitespace-normal">
                  {renderTyped}
                  <span ref={targetRef} className="text-transparent pointer-events-none select-none bg-transparent">{targetWithJ}</span>
                  {renderUntyped}
                  {" "}
                </span>
              );
            })}
          </div>
        </div>

        {currentIndex < globalCheckString.length && (
          <div
            className="absolute pointer-events-none flex items-center justify-center transition-all duration-75 text-[2.5rem] leading-[2.6]"
            style={{
              top: cursorPos.top,
              left: cursorPos.left,
              width: cursorPos.width,
              height: cursorPos.height,
            }}
          >
            {wrongChar ? (
              <span className="text-red-500 z-10">{wrongChar}</span>
            ) : (
              <span className="absolute bottom-2 left-0 right-0 h-[3px] bg-[#D6C19E] animate-pulse rounded-full z-10" />
            )}
          </div>
        )}
      </div>

      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-48 bg-gradient-to-t from-[#FDFBF7] dark:from-[#121212] via-[#FDFBF7]/80 dark:via-[#121212]/80 to-transparent pointer-events-none z-30 transition-opacity duration-700 ease-in-out ${isAtBottom ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-full shadow-xl border border-neutral-200 dark:border-neutral-700 px-6 py-3 z-50 transition-colors duration-300">

        <button
          onClick={() => setVisibilityMode('hidden')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${visibilityMode === 'hidden' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
          <span className="hidden sm:inline">Hidden</span>
        </button>

        <button
          onClick={() => setVisibilityMode('ayah')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${visibilityMode === 'ayah' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Show Current Ayah"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
          <span className="hidden sm:inline">Active Ayah</span>
        </button>

        <button
          onClick={() => setVisibilityMode('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${visibilityMode === 'all' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Show All"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          <span className="hidden sm:inline">Show All</span>
        </button>

        <div className="w-[1px] h-6 bg-neutral-300 dark:bg-neutral-600 mx-2" />

        <button
          onClick={handleRestart}
          className="flex items-center justify-center p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all focus:outline-none"
          title="Rewrite Surah"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </button>

        <button
          onClick={toggleTheme}
          className="flex items-center justify-center p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all focus:outline-none"
          title="Toggle Night/Day Mode"
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          )}
        </button>
      </div>
    </div>
  );
}
