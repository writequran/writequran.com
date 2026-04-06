"use client";

import { useLanguage } from "@/lib/i18n";

interface PopConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function PopConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmLabel,
  cancelLabel,
}: PopConfirmProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-full sm:mr-4 bottom-full sm:bottom-auto mb-4 sm:mb-0 sm:top-0 z-[100] animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-4 duration-200" dir="ltr">
      <div className="w-52 bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_50px_rgba(0,0,0,0.4)] border border-neutral-200/50 dark:border-neutral-700/50 p-5 flex flex-col items-center text-center">
        <h4 className="text-[13px] font-bold text-neutral-800 dark:text-neutral-100 mb-4 leading-tight tracking-tight">
          {title}
        </h4>
        <div className="flex gap-2.5 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-neutral-100 dark:bg-neutral-700/50 hover:bg-neutral-200 dark:hover:bg-neutral-600/50 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold rounded-xl transition-all active:scale-95 uppercase tracking-widest"
          >
            {cancelLabel ?? t("no")}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2 px-3 bg-[#D6C19E] hover:bg-[#C1A063] text-white dark:text-neutral-900 text-[10px] font-bold rounded-xl shadow-lg shadow-[#D6C19E]/30 transition-all active:scale-95 uppercase tracking-widest"
          >
            {confirmLabel ?? t("yes")}
          </button>
        </div>
        {/* Arrow (Enhanced Triangle) */}
        <div className="absolute top-[calc(100%-6px)] sm:top-auto sm:bottom-auto sm:left-full sm:-ml-1.5 left-1/2 -translate-x-1/2 sm:translate-x-0 w-3 h-3 bg-white/95 dark:bg-neutral-800/95 border-r border-b sm:border-r sm:border-t border-neutral-200/50 dark:border-neutral-700/50 rotate-45 z-[-1]" />
      </div>
    </div>
  );
}
