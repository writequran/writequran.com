"use client";

import { useMemo } from "react";
import { getAllSurahsMeta } from "@/lib/quran-data";
import { getMilestoneProgress } from "@/lib/stats";

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function MilestoneCard({
  title,
  description,
  value,
  target,
  achieved,
  progressPercent,
}: {
  title: string;
  description: string;
  value: string;
  target: string;
  achieved: boolean;
  progressPercent: number;
}) {
  return (
    <div className={`rounded-3xl border px-5 py-5 transition-colors ${
      achieved
        ? "border-emerald-200 bg-emerald-50/90 dark:border-emerald-800/70 dark:bg-emerald-900/20"
        : "border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-800/80"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-neutral-400 dark:text-neutral-500">
            Milestone
          </p>
          <h3 className="mt-2 text-base font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
        <div className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
          achieved
            ? "bg-emerald-600 text-white"
            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
        }`}>
          {achieved ? "Unlocked" : "Locked"}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</span>
          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{target}</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              achieved ? "bg-emerald-500" : "bg-[#D6C19E]"
            }`}
            style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ProgressModal({ isOpen, onClose }: ProgressModalProps) {
  const milestones = useMemo(() => {
    const progress = getMilestoneProgress();
    const surahs = getAllSurahsMeta();
    const firstCompletedSurah = progress.firstCompletedSurahNumber
      ? surahs.find((surah) => surah.number === progress.firstCompletedSurahNumber)
      : null;

    return {
      firstCompletedSurahLabel: firstCompletedSurah
        ? `${firstCompletedSurah.number}. ${firstCompletedSurah.englishName}`
        : "None yet",
      hasCompletedSurah: Boolean(firstCompletedSurah),
      totalCompletedAyat: progress.totalCompletedAyat,
      totalLettersTyped: progress.totalLettersTyped,
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-[32px] border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 shadow-[0_25px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200/80 dark:border-neutral-800 px-6 py-5 sm:px-7">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[#B08B52] dark:text-[#D6C19E]">
              My Progress
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              Milestones
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <MilestoneCard
              title="First Completed Surah"
              description="Finish an entire surah from beginning to end."
              value={milestones.firstCompletedSurahLabel}
              target="Complete 1 surah"
              achieved={milestones.hasCompletedSurah}
              progressPercent={milestones.hasCompletedSurah ? 100 : 0}
            />

            <MilestoneCard
              title="10 Ayat Completed"
              description="Fully complete ten ayat across your practice."
              value={`${milestones.totalCompletedAyat} ayat`}
              target="10 ayat"
              achieved={milestones.totalCompletedAyat >= 10}
              progressPercent={(milestones.totalCompletedAyat / 10) * 100}
            />

            <MilestoneCard
              title="1000 Letters Typed"
              description="Type one thousand Quran letters in total."
              value={`${milestones.totalLettersTyped}`}
              target="1000 letters"
              achieved={milestones.totalLettersTyped >= 1000}
              progressPercent={(milestones.totalLettersTyped / 1000) * 100}
            />

            <div className="rounded-3xl border border-[#D6C19E]/35 bg-gradient-to-br from-[#FCF6EA] to-[#F7EFE2] px-5 py-5 dark:border-neutral-700 dark:from-neutral-800 dark:to-neutral-900">
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#B08B52] dark:text-[#D6C19E]">
                Keep Going
              </p>
              <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Every letter counts
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                Your milestones grow automatically from the progress you already make while practicing. Keep typing, revising, and finishing ayat to unlock more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
