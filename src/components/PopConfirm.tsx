"use client";

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
  confirmLabel = "Yes",
  cancelLabel = "No",
}: PopConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-full mr-3 top-0 z-[100] animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="w-48 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col items-center text-center">
        <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 mb-3 leading-tight">
          {title}
        </h4>
        <div className="flex gap-2 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 px-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-200 text-[10px] font-bold rounded-xl transition-all active:scale-95 uppercase tracking-wider"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-1.5 px-3 bg-[#D6C19E] hover:bg-[#C1A063] text-white dark:text-neutral-900 text-[10px] font-bold rounded-xl shadow-lg shadow-[#D6C19E]/20 transition-all active:scale-95 uppercase tracking-wider"
          >
            {confirmLabel}
          </button>
        </div>
        {/* Arrow */}
        <div className="absolute top-5 -right-1.5 w-3 h-3 bg-white dark:bg-neutral-800 border-r border-t border-neutral-200 dark:border-neutral-700 rotate-45" />
      </div>
    </div>
  );
}
