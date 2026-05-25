"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n';
import { getStorage, setStorage } from '@/lib/storage';

interface VirtualKeyboardProps {
  showKeyboard: boolean;
  onInput: (key: string) => void;
  typingMode?: 'letter' | 'word';
  activeWordDraft?: string;
  wrongChar?: string | null;
  mobileToolbar?: ReactNode;
  onScaleChange?: (scale: number) => void;
}

export function VirtualKeyboard({
  showKeyboard,
  onInput,
  typingMode = 'letter',
  activeWordDraft = '',
  wrongChar = null,
  mobileToolbar,
  onScaleChange
}: VirtualKeyboardProps) {
  const { t } = useLanguage();

  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScale, setStartScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (onScaleChange) {
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

  useEffect(() => {
    let mounted = true;
    
    setTimeout(() => {
      if (mounted) {
        setIsMounted(true);
      }
    }, 0);
    
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    
    if (mounted) {
      handleResize();
      window.addEventListener('resize', handleResize);
      
      const savedScale = getStorage('keyboard_scale');
      if (savedScale) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScale(parseFloat(savedScale) || 1);
      }
    }
    
    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMobile) return;
    setIsDragging(true);
    setStartY(e.clientY);
    setStartScale(scale);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isMobile) return;
    const deltaY = e.clientY - startY;
    // deltaY > 0 means dragging down (shrinking). deltaY < 0 means dragging up (growing).
    // Using a factor to control sensitivity (e.g., 200px = 1.0 scale change)
    const newScale = Math.min(Math.max(startScale - (deltaY / 250), 0.7), 1.5);
    setScale(newScale);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || isMobile) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    setStorage('keyboard_scale', scale.toString());
  };

  const activeScale = isMobile ? 1 : scale;
  
  // Prevent hydration mismatch for CSS transitions
  if (!isMounted) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-1/2 w-full max-w-[750px] bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-neutral-200 dark:border-neutral-800 z-[60]"
      style={{
        transform: showKeyboard 
          ? `translate(-50%, 0) scale(${activeScale})` 
          : `translate(-50%, ${isMobile ? 'calc(100% - 54px)' : '100%'}) scale(${activeScale})`,
        opacity: (!showKeyboard && !isMobile) ? 0 : 1,
        pointerEvents: (!showKeyboard && !isMobile) ? "none" : "auto",
        transformOrigin: "bottom center",
        transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      dir="rtl"
    >
      {/* DRAG HANDLE (Desktop/Tablet Only) */}
      {!isMobile && (
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-full h-8 flex items-center justify-center cursor-ns-resize group touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="w-16 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 group-hover:bg-[#D6C19E] dark:group-hover:bg-[#D6C19E] transition-colors shadow-sm" />
        </div>
      )}

      {/* WORD DRAFT POPUP */}
      {typingMode === "word" && showKeyboard && (activeWordDraft.length > 0 || wrongChar) && (
        <div className="absolute bottom-full mb-1.5 sm:mb-2 left-1/2 -translate-x-1/2 w-fit max-w-[min(68vw,14rem)] pointer-events-none">
          <div className="rounded-full border border-[#E3C57A]/45 dark:border-[#D6C19E]/35 bg-[#F3E3BE]/55 dark:bg-[#6B5730]/28 backdrop-blur-xl px-4 py-2 shadow-[0_8px_24px_rgba(180,140,60,0.16)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
            <div className="min-h-[1.45rem] flex items-center justify-center text-[1rem] sm:text-[1.15rem] leading-none quran-text text-[#2A2826] dark:text-neutral-100">
              <span>{activeWordDraft || "\u00A0"}</span>
            </div>
          </div>
        </div>
      )}

      {mobileToolbar}

      <div className="p-2 sm:p-6 pb-4 sm:pb-8 touch-none">
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
                  onClick={() => onInput(letter)}
                  className="flex-1 min-w-[28px] sm:min-w-[42px] h-12 sm:h-12 bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-[#D6C19E]/30 dark:hover:bg-[#D6C19E]/20 text-[#2A2826] dark:text-neutral-100 text-base sm:text-xl rounded-lg transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95 touch-manipulation"
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-0.5 sm:gap-1.5 mt-1">
            <button
              onClick={() => onInput("Backspace")}
              className="px-4 sm:px-6 h-10 sm:h-12 bg-red-50/50 dark:bg-red-900/20 hover:bg-red-100/50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg transition-all border border-red-100 dark:border-red-900/30 active:scale-95 flex items-center gap-2 touch-manipulation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
              <span className="hidden sm:inline">{t("backspace")}</span>
            </button>
            <button
              onClick={() => onInput(" ")}
              className="flex-[3] h-10 sm:h-12 bg-neutral-100/50 dark:bg-neutral-800/50 hover:bg-[#D6C19E]/30 dark:hover:bg-[#D6C19E]/20 text-[#2A2826] dark:text-neutral-100 rounded-lg transition-all border border-neutral-200 dark:border-neutral-700 active:scale-95 text-xs font-bold uppercase tracking-widest touch-manipulation"
            >
              {t("space")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
