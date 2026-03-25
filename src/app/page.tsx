"use client";

import { useState } from "react";
import { TypingArea } from "@/components/TypingArea";
import { getAllSurahsMeta } from "@/lib/quran-data";

export default function Page() {
  const [surahNumber, setSurahNumber] = useState(1);
  const surahs = getAllSurahsMeta();

  return (
    <main className="flex-1 flex flex-col items-center justify-start bg-neutral-100 dark:bg-neutral-950 z-10 w-full overflow-hidden transition-colors duration-300">
      
      {/* MINIMAL SURAH SELECTOR */}
      <div className="w-full flex justify-center pt-8 pb-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm z-40 sticky top-0">
        <select 
          className="px-6 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md font-medium text-neutral-800 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-[#D6C19E] shadow-sm font-sans"
          value={surahNumber}
          onChange={(e) => setSurahNumber(Number(e.target.value))}
        >
          {surahs.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {s.name} ({s.englishName})
            </option>
          ))}
        </select>
      </div>

      <div className="w-full flex-1 flex flex-col items-center pb-12 pt-8">
        <TypingArea key={surahNumber} surahNumber={surahNumber} />
      </div>
    </main>
  );
}
