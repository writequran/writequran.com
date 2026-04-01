"use client";

import React from 'react';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onClearHistory: () => void;
}

export function MenuDrawer({ isOpen, onClose, isDarkMode, toggleTheme, onClearHistory }: MenuDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/10 dark:bg-black/40 backdrop-blur-[2px] z-[150] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-[280px] sm:w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl z-[160] shadow-2xl border-r border-neutral-200/50 dark:border-neutral-800/50 transition-all duration-500 ease-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 pt-8 border-b border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D6C19E]/20 flex items-center justify-center border border-[#D6C19E]/30 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D6C19E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18" /><path d="M12 7v5l3 3" /></svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 tracking-tight">WriteQuran</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          {/* Nav Items */}
          <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">Account</p>
            <button className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#D6C19E]"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span className="font-semibold text-sm">User Profile</span>
            </button>

            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">Preferences</p>
            <button 
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300"
            >
              <div className="flex items-center gap-4">
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                )}
                <span className="font-semibold text-sm">{isDarkMode ? 'Light Mode' : 'Night Mode'}</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-yellow-500/20' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${isDarkMode ? 'right-0.5 bg-yellow-500 shadow-sm' : 'left-0.5 bg-white shadow-sm'}`} />
              </div>
            </button>

            <button 
              onClick={() => { onClearHistory(); onClose(); }}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group text-red-600 dark:text-red-400 mt-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
              <span className="font-semibold text-sm">Clear All History</span>
            </button>

            <div className="my-4 h-px bg-neutral-100 dark:bg-neutral-800/50 mx-4" />

            <p className="px-4 text-[10px] uppercase font-bold text-neutral-400 tracking-widest mb-2">Support</p>
            <button className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all group text-neutral-600 dark:text-neutral-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#D6C19E]"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              <span className="font-semibold text-sm">Contact Us</span>
            </button>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-neutral-100 dark:border-neutral-800/50 flex flex-col items-center gap-1.5 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D6C19E]" />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 dark:text-neutral-400">WriteQuran V1.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
