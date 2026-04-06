"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  showCancel = true,
}: ConfirmationModalProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-white dark:bg-neutral-800 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-8 flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-300">
        <div className="w-12 h-12 rounded-full bg-[#D6C19E]/10 dark:bg-[#D6C19E]/20 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-[#D6C19E]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 w-full">
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-200 text-sm font-bold rounded-2xl transition-all active:scale-95"
            >
              {cancelLabel ?? t("cancel")}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 bg-[#D6C19E] hover:bg-[#C1A063] text-white dark:text-neutral-900 text-sm font-bold rounded-2xl shadow-lg shadow-[#D6C19E]/20 transition-all active:scale-95"
          >
            {confirmLabel ?? t("continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
