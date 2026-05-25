import React from 'react';
import { useLanguage } from '@/lib/i18n';

interface MemorizationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorizationRange: { startSurah: number; endSurah: number };
  onRangeChange: (range: { startSurah: number; endSurah: number }) => void;
  onStart: () => void;
  isMemorizationMode: boolean;
}

export function MemorizationSetupModal({
  isOpen,
  onClose,
  memorizationRange,
  onRangeChange,
  onStart,
  isMemorizationMode
}: MemorizationSetupModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[28px] shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6">
          <div className="w-12 h-12 bg-[#D6C19E]/10 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-1">{t("memorization_test")}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{t("from_surah") || "From Surah"}</span>
            <input
              type="number"
              min="1"
              max="114"
              value={memorizationRange.startSurah}
              onChange={(e) => onRangeChange({
                startSurah: Number.parseInt(e.target.value || "1", 10),
                endSurah: memorizationRange.endSurah,
              })}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D6C19E] transition-all"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{t("to_surah") || "To Surah"}</span>
            <input
              type="number"
              min="1"
              max="114"
              value={memorizationRange.endSurah}
              onChange={(e) => onRangeChange({
                startSurah: memorizationRange.startSurah,
                endSurah: Number.parseInt(e.target.value || "114", 10),
              })}
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 text-sm font-bold text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D6C19E] transition-all"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {t("cancel") || "Cancel"}
          </button>
          <button
            onClick={() => {
              onStart();
              onClose();
            }}
            className="flex-[2] px-4 py-3 rounded-xl bg-[#D6C19E] text-white text-sm font-bold shadow-sm hover:brightness-105 transition-all"
          >
            {isMemorizationMode ? t("new_random_ayah") || "New Random Ayah" : t("start_test") || "Start Test"}
          </button>
        </div>
      </div>
    </div>
  );
}
