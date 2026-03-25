"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getMushafPage } from "@/lib/quran-data";

interface TypingAreaProps {
  pageNumber: number;
}

type VisibilityMode = "hidden" | "ayah" | "all";

export function TypingArea({ pageNumber }: TypingAreaProps) {
  const pageData = getMushafPage(pageNumber);
  const { globalCheckString } = pageData;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongChar, setWrongChar] = useState<string | null>(null);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("hidden");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const targetRef = useRef<HTMLSpanElement>(null);

  // Initialize theme securely natively checking classlist or OS prefs
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
    // Update cursor pos because scrollbar changes might slightly shift layout bounds
    setTimeout(updateCursorPos, 50);
  };

  useEffect(() => {
    const handleScroll = () => {
      // Small 100px threshold to hide the fade just before hitting the exact absolute bottom
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
      // Use smooth scroll to keep target centered. 
      // Offset by bottom dock size happens organically due to center block logic.
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

  // State tracker used sequentially inside map() to accurately highlight the active working ayah bounds
  let isInActiveAyah = false;

  const renderTextWithMarkers = (text: string, isTyped: boolean) => {
    if (!text) return null;
    const parts = text.split(/(\u06DD[\u0660-\u0669]+)/g);
    
    return parts.map((part, i) => {
      const isMarker = part.startsWith('\u06DD');
      if (isMarker) {
        if (!isTyped) {
          isInActiveAyah = false; // The active targeted ayah cleanly finishes here
        }
        return <span key={i} className="text-[#C1A063] mx-1 transition-colors duration-300">{part}</span>;
      }
      
      let show = isTyped || visibilityMode === "all" || (visibilityMode === "ayah" && isInActiveAyah);
      
      return (
        <span key={i} className={show ? "text-[#2A2826] dark:text-neutral-100 transition-colors duration-300" : "opacity-0"}>
          {part}
        </span>
      );
    });
  };

  return (
    <div className="w-full flex flex-col items-center pb-36 px-4">
      {/* FINAL COMPLETION INDICATOR (In-Page) */}
      {currentIndex === globalCheckString.length && globalCheckString.length > 0 && (
        <div className="my-8 flex flex-col items-center animate-in fade-in duration-500">
          <p className="text-3xl font-medium text-green-700 dark:text-green-500 font-arabic tracking-normal border-b-2 border-green-500/30 pb-4">
            صَدَقَ اللّٰهُ الْعَظِيمُ
          </p>
        </div>
      )}

      {/* MUSHAF PAGE FRAME */}
      <div 
        className="relative w-full max-w-[800px] bg-[#FDFBF7] dark:bg-[#121212] shadow-2xl rounded-sm border-[16px] border-[#D6C19E] dark:border-neutral-800 px-8 py-16 rtl font-arabic tracking-normal transition-colors duration-500"
        dir="rtl"
      >
        <div className="absolute inset-2 border-2 border-[#D6C19E] dark:border-neutral-700 opacity-50 pointer-events-none" />

        <div className="flex flex-col w-full h-full justify-between items-stretch gap-y-6 text-center">
          {pageData.lines.map((line, lineIndex) => {
             const lineStart = line.globalCheckOffset;
             const lineLength = line.checkString.length;
             const lineEnd = lineStart + lineLength;

             const isFinished = currentIndex >= lineEnd;
             const isFuture = currentIndex < lineStart;
             const isActive = !isFinished && !isFuture;

             const baseClasses = "w-full text-[2.5rem] leading-[2.6] text-center flex justify-center flex-wrap";

             if (isFinished) {
               return (
                 <div key={lineIndex} className={baseClasses}>
                   {renderTextWithMarkers(line.displayString, true)}
                 </div>
               );
             }

             if (isFuture) {
               return (
                 <div key={lineIndex} className={baseClasses}>
                   {renderTextWithMarkers(line.displayString, false)}
                 </div>
               );
             }

             // Active Line Tracking
             const localIndex = currentIndex - lineStart;
             const currentDisplayIndex = localIndex < line.mapping.length ? line.mapping[localIndex] : line.displayString.length;
             const nextDisplayIndex = localIndex + 1 < line.mapping.length ? line.mapping[localIndex + 1] : line.displayString.length;

             const typedSpan = line.displayString.slice(0, currentDisplayIndex);
             const targetSpan = line.displayString.slice(currentDisplayIndex, nextDisplayIndex);
             const untypedSpan = line.displayString.slice(nextDisplayIndex);

             // Evaluate typed portion
             const renderTyped = renderTextWithMarkers(typedSpan, true);
             
             // Core anchoring moment: Once we reach targetSpan, we are inside the active Ayah natively
             isInActiveAyah = true;
             
             // Evaluate untyped portion (which inherits the newly validated active Ayah state)
             const renderUntyped = renderTextWithMarkers(untypedSpan, false);

             return (
               <div key={lineIndex} className={baseClasses}>
                 {renderTyped}
                 <span ref={targetRef} className="opacity-0">{targetSpan}</span>
                 {renderUntyped}
               </div>
             );
          })}
        </div>

        {/* BOUNDING BOX ABSOLUTE OVERLAY */}
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

      {/* CONTINUATION FADE OVERLAY */}
      {/* Precisely bounds to the max-w-[800px] Mushaf card securely fading out text passing underneath */}
      <div 
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[800px] h-48 bg-gradient-to-t from-[#FDFBF7] dark:from-[#121212] via-[#FDFBF7]/80 dark:via-[#121212]/80 to-transparent pointer-events-none z-30 transition-opacity duration-700 ease-in-out ${isAtBottom ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      />

      {/* FIXED BOTTOM CONTROL DOCK */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-full shadow-xl border border-neutral-200 dark:border-neutral-700 px-6 py-3 z-50 transition-colors duration-300">
        
        {/* State 1: Hidden */}
        <button 
          onClick={() => setVisibilityMode('hidden')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${visibilityMode === 'hidden' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          <span className="hidden sm:inline">Hidden</span>
        </button>

        {/* State 2: Active Ayah */}
        <button 
          onClick={() => setVisibilityMode('ayah')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${visibilityMode === 'ayah' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Show Current Ayah"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          <span className="hidden sm:inline">Active Ayah</span>
        </button>

        {/* State 3: Show All */}
        <button 
          onClick={() => setVisibilityMode('all')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${visibilityMode === 'all' ? 'bg-[#D6C19E] text-white dark:text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
          title="Show All"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="hidden sm:inline">Show All</span>
        </button>
        
        {/* Divider */}
        <div className="w-[1px] h-6 bg-neutral-300 dark:bg-neutral-600 mx-2" />

        {/* Action: Rewrite Page */}
        <button 
          onClick={handleRestart}
          className="flex items-center justify-center p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all focus:outline-none"
          title="Rewrite Page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>

        {/* Action: Toggle Theme */}
        <button 
          onClick={toggleTheme}
          className="flex items-center justify-center p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all focus:outline-none"
          title="Toggle Night/Day Mode"
        >
          {isDarkMode ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          )}
        </button>

      </div>
    </div>
  );
}
