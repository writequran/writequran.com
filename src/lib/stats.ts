import { getAllSurahsMeta, getSurah } from './quran-data';
import { getStorage, setStorage } from './storage';
import type { Language } from './i18n';

export interface MistakeRecord {
  surahNumber: number;
  ayahNumber: number;
  globalIndex: number;
  expectedChar: string;
  wrongAttempts: number;
  timestamp: number;
}

export interface ProgressStats {
  surahNumber: number;
  highestIndexReached: number;
  totalMistakeEvents: number;
  totalWrongAttempts: number;
  lastPracticed: number;
}

const getTypedIndicesStorageKey = (surahNumber: number) => `typed_indices_${surahNumber}`;
const ACTIVITY_HISTORY_KEY = 'activity_history';

export type ActivityHistory = Record<string, number>;

const notifyStatsChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('quran-typing-stats-change'));
};

const getLocalActivityDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const loadActivityHistory = (): ActivityHistory => {
  if (typeof window === 'undefined') return {};
  try {
    const data = getStorage(ACTIVITY_HISTORY_KEY);
    const storedHistory: ActivityHistory = data ? JSON.parse(data) : {};
    const mergedHistory: ActivityHistory = { ...storedHistory };

    const progressStats = loadProgressStats();
    Object.values(progressStats).forEach((progress) => {
      if (!progress?.lastPracticed) return;
      const key = getLocalActivityDateKey(new Date(progress.lastPracticed));
      mergedHistory[key] = Math.max(mergedHistory[key] || 0, 12);
    });

    const mistakeStats = loadMistakeStats();
    Object.values(mistakeStats).forEach((mistake) => {
      if (!mistake?.timestamp) return;
      const key = getLocalActivityDateKey(new Date(mistake.timestamp));
      mergedHistory[key] = Math.min((mergedHistory[key] || 0) + Math.max(1, mistake.wrongAttempts), 5000);
    });

    return mergedHistory;
  } catch {
    return {};
  }
};

export const recordDailyActivity = (amount = 1) => {
  if (typeof window === 'undefined' || amount <= 0) return;

  const history = loadActivityHistory();
  const todayKey = getLocalActivityDateKey();
  history[todayKey] = Math.min((history[todayKey] || 0) + amount, 5000);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 120);
  const cutoffKey = getLocalActivityDateKey(cutoff);

  Object.keys(history).forEach((key) => {
    if (key < cutoffKey) {
      delete history[key];
    }
  });

  setStorage(ACTIVITY_HISTORY_KEY, JSON.stringify(history));
};

export const loadMistakeStats = (): Record<string, MistakeRecord> => {
  if (typeof window === 'undefined') return {};
  try {
    const data = getStorage('mistake_stats');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const saveMistakeStats = (stats: Record<string, MistakeRecord>) => {
  setStorage('mistake_stats', JSON.stringify(stats));
  notifyStatsChanged();
  if (typeof window !== "undefined") import('./sync-manager').then(m => m.debouncedSyncLocalToCloud());
};

export const loadProgressStats = (): Record<number, ProgressStats> => {
  if (typeof window === 'undefined') return {};
  try {
    const data = getStorage('progress_stats');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const saveProgressStats = (stats: Record<number, ProgressStats>) => {
  setStorage('progress_stats', JSON.stringify(stats));
  notifyStatsChanged();
  if (typeof window !== "undefined") import('./sync-manager').then(m => m.debouncedSyncLocalToCloud());
};

export interface SurahFinalProgressState {
  typedCount: number;
  totalLetters: number;
  completedAyat: number;
  progressPercent: number;
  isCompleted: boolean;
}

export const getSurahFinalProgressState = (surahNumber: number): SurahFinalProgressState => {
  const surahData = getSurah(surahNumber);
  let typedIndices = new Set<number>();

  if (typeof window !== 'undefined') {
    try {
      const saved = getStorage(getTypedIndicesStorageKey(surahNumber));
      typedIndices = saved ? new Set<number>(JSON.parse(saved)) : new Set<number>();
    } catch {
      typedIndices = new Set<number>();
    }
  }

  let totalLetters = 0;
  let typedCount = 0;

  for (let i = 0; i < surahData.globalCheckString.length; i++) {
    const char = surahData.globalCheckString[i];
    if (char !== ' ' && char !== '\u200C') {
      totalLetters++;
      if (typedIndices.has(i)) {
        typedCount++;
      }
    }
  }

  let completedAyat = 0;
  for (const block of surahData.blocks) {
    let fullyTyped = true;
    const blockEnd = block.globalCheckOffset + block.checkString.length;
    for (let i = block.globalCheckOffset; i < blockEnd; i++) {
      if (!typedIndices.has(i)) {
        fullyTyped = false;
        break;
      }
    }
    if (fullyTyped) completedAyat++;
  }

  return {
    typedCount,
    totalLetters,
    completedAyat,
    progressPercent: totalLetters > 0 ? (typedCount / totalLetters) * 100 : 0,
    isCompleted: totalLetters > 0 && typedCount >= totalLetters,
  };
};

export interface WeakSpot {
  surahNumber: number;
  ayahNumber: number;
  score: number;
  globalIndexStart?: number; // Optional quick jump reference
  latestMistakeTimestamp?: number;
}

export interface WeakSpotReviewState {
  surahNumber: number;
  ayahNumber: number;
  lastReviewedAt: number;
  nextDueAt: number;
  intervalIndex: number;
}

const WEAK_SPOT_REVIEW_KEY = 'weak_spot_reviews';
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const;

const getWeakSpotKey = (surahNumber: number, ayahNumber: number) => `${surahNumber}-${ayahNumber}`;

const loadWeakSpotReviewStates = (): Record<string, WeakSpotReviewState> => {
  if (typeof window === 'undefined') return {};
  try {
    const data = getStorage(WEAK_SPOT_REVIEW_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export interface ReviewAnalyticsItem {
  label: string;
  score: number;
  meta?: string;
}

export interface ReviewAnalytics {
  hardestSurahs: ReviewAnalyticsItem[];
  hardestAyat: ReviewAnalyticsItem[];
  hardestLetters: ReviewAnalyticsItem[];
  reviewedCount: number;
  successfulReviewCount: number;
  reviewSuccessRate: number;
}

const saveWeakSpotReviewStates = (states: Record<string, WeakSpotReviewState>) => {
  setStorage(WEAK_SPOT_REVIEW_KEY, JSON.stringify(states));
  notifyStatsChanged();
};

const aggregateWeakSpotStats = () => {
  const mistakes = loadMistakeStats();
  const ayahScores: Record<string, { surahNumber: number, ayahNumber: number, events: number, attempts: number, indexStart: number, latestMistakeTimestamp: number }> = {};
  
  Object.values(mistakes).forEach(m => {
    const key = `${m.surahNumber}-${m.ayahNumber}`;
    if (!ayahScores[key]) {
      ayahScores[key] = {
        surahNumber: m.surahNumber,
        ayahNumber: m.ayahNumber,
        events: 0,
        attempts: 0,
        indexStart: m.globalIndex,
        latestMistakeTimestamp: m.timestamp
      };
    }
    ayahScores[key].events += 1;
    ayahScores[key].attempts += m.wrongAttempts;
    // Keep the earliest index in the ayah for jumping
    if (m.globalIndex < ayahScores[key].indexStart) {
      ayahScores[key].indexStart = m.globalIndex;
    }
    if (m.timestamp > ayahScores[key].latestMistakeTimestamp) {
      ayahScores[key].latestMistakeTimestamp = m.timestamp;
    }
  });

  return Object.values(ayahScores).map(a => ({
    surahNumber: a.surahNumber,
    ayahNumber: a.ayahNumber,
    globalIndexStart: a.indexStart,
    latestMistakeTimestamp: a.latestMistakeTimestamp,
    // Difficulty Score Formula: Unique Events get 2x weight relative to blunt force tracking attempts
    score: (a.events * 2) + (a.attempts * 1)
  })).sort((a, b) => b.score - a.score);
};

export const getReviewAnalytics = (language: Language = 'en'): ReviewAnalytics => {
  const mistakes = loadMistakeStats();
  const reviewStates = loadWeakSpotReviewStates();
  const weakSpots = aggregateWeakSpotStats();
  const surahMetaByNumber = new Map(getAllSurahsMeta().map((surah) => [surah.number, surah]));
  const hardestSurahsMap: Record<number, { score: number; ayat: Set<number> }> = {};
  const hardestLettersMap: Record<string, { score: number; count: number }> = {};

  Object.values(mistakes).forEach((mistake) => {
    if (!hardestSurahsMap[mistake.surahNumber]) {
      hardestSurahsMap[mistake.surahNumber] = { score: 0, ayat: new Set<number>() };
    }
    hardestSurahsMap[mistake.surahNumber].score += mistake.wrongAttempts + 1;
    hardestSurahsMap[mistake.surahNumber].ayat.add(mistake.ayahNumber);

    const letterKey = mistake.expectedChar || "؟";
    if (!hardestLettersMap[letterKey]) {
      hardestLettersMap[letterKey] = { score: 0, count: 0 };
    }
    hardestLettersMap[letterKey].score += mistake.wrongAttempts + 1;
    hardestLettersMap[letterKey].count += 1;
  });

  const hardestSurahs = Object.entries(hardestSurahsMap)
    .map(([surahNumber, data]) => {
      const numericSurahNumber = Number(surahNumber);
      const surah = surahMetaByNumber.get(numericSurahNumber);
      const surahName = language === 'ar'
        ? (surah?.name || `سورة ${numericSurahNumber}`)
        : (surah?.englishName || `Surah ${numericSurahNumber}`);
      return {
        label: `${numericSurahNumber}. ${surahName}`,
        score: data.score,
        meta: `${data.ayat.size} ${language === 'ar' ? 'آية' : 'ayah'}`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const hardestAyat = weakSpots
    .slice(0, 4)
    .map((spot) => ({
      label: `${spot.surahNumber}:${spot.ayahNumber}`,
      score: spot.score,
      meta: language === 'ar' ? `${spot.score} صعوبة` : `${spot.score} difficulty`,
    }));

  const hardestLetters = Object.entries(hardestLettersMap)
    .map(([letter, data]) => ({
      label: letter === " " ? (language === 'ar' ? "مسافة" : "Space") : letter,
      score: data.score,
      meta: language === 'ar' ? `${data.count} زلات` : `${data.count} slips`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const reviewedWeakSpots = weakSpots.filter((spot) => reviewStates[getWeakSpotKey(spot.surahNumber, spot.ayahNumber)]);
  const successfulReviewCount = reviewedWeakSpots.filter((spot) => {
    const state = reviewStates[getWeakSpotKey(spot.surahNumber, spot.ayahNumber)];
    if (!state) return false;
    const hasNoFreshMistakes = (spot.latestMistakeTimestamp || 0) <= state.lastReviewedAt;
    return hasNoFreshMistakes && state.intervalIndex > 0;
  }).length;

  const fallbackReviewedCount = Object.keys(reviewStates).length;
  const reviewedCount = reviewedWeakSpots.length > 0 ? reviewedWeakSpots.length : fallbackReviewedCount;
  const reviewSuccessRate = reviewedCount > 0
    ? (successfulReviewCount / reviewedCount) * 100
    : 0;

  return {
    hardestSurahs,
    hardestAyat,
    hardestLetters,
    reviewedCount,
    successfulReviewCount,
    reviewSuccessRate,
  };
};

export const getWeakSpots = (now = Date.now()): WeakSpot[] => {
  const reviewStates = loadWeakSpotReviewStates();

  return aggregateWeakSpotStats()
    .filter((spot) => {
      const state = reviewStates[getWeakSpotKey(spot.surahNumber, spot.ayahNumber)];
      if (!state) return true;
      if ((spot.latestMistakeTimestamp || 0) > state.lastReviewedAt) return true;
      return now >= state.nextDueAt;
    })
    .slice(0, 10);
};

export const getTrackedWeakSpotsCount = (): number => {
  return aggregateWeakSpotStats().length;
};

export const getNextWeakSpotDueAt = (): number | null => {
  const reviewStates = loadWeakSpotReviewStates();
  const tracked = aggregateWeakSpotStats();
  let nextDueAt: number | null = null;

  tracked.forEach((spot) => {
    const state = reviewStates[getWeakSpotKey(spot.surahNumber, spot.ayahNumber)];
    if (!state) {
      nextDueAt = Date.now();
      return;
    }
    if ((spot.latestMistakeTimestamp || 0) > state.lastReviewedAt) {
      nextDueAt = Date.now();
      return;
    }
    if (nextDueAt === null || state.nextDueAt < nextDueAt) {
      nextDueAt = state.nextDueAt;
    }
  });

  return nextDueAt;
};

export const markWeakSpotReviewed = (spot: Pick<WeakSpot, 'surahNumber' | 'ayahNumber' | 'latestMistakeTimestamp'>, reviewedAt = Date.now()) => {
  const states = loadWeakSpotReviewStates();
  const key = getWeakSpotKey(spot.surahNumber, spot.ayahNumber);
  const existing = states[key];
  const hasNewMistakeSinceLastReview = !existing || (spot.latestMistakeTimestamp || 0) > existing.lastReviewedAt;
  const nextIntervalIndex = hasNewMistakeSinceLastReview
    ? 0
    : Math.min(existing.intervalIndex + 1, REVIEW_INTERVAL_DAYS.length - 1);
  const nextDueAt = reviewedAt + (REVIEW_INTERVAL_DAYS[nextIntervalIndex] * 24 * 60 * 60 * 1000);

  states[key] = {
    surahNumber: spot.surahNumber,
    ayahNumber: spot.ayahNumber,
    lastReviewedAt: reviewedAt,
    nextDueAt,
    intervalIndex: nextIntervalIndex,
  };

  saveWeakSpotReviewStates(states);
};

export interface MilestoneProgress {
  firstCompletedSurahNumber: number | null;
  totalCompletedAyat: number;
  totalLettersTyped: number;
}

export const getMilestoneProgress = (): MilestoneProgress => {
  const progressStats = loadProgressStats();
  let firstCompletedSurahNumber: number | null = null;
  let totalCompletedAyat = 0;
  let totalLettersTyped = 0;

  for (const surahId in progressStats) {
    const surahNumber = parseInt(surahId, 10);

    try {
      const finalState = getSurahFinalProgressState(surahNumber);
      totalLettersTyped += finalState.typedCount;
      totalCompletedAyat += finalState.completedAyat;

      if (finalState.isCompleted) {
        if (firstCompletedSurahNumber === null || surahNumber < firstCompletedSurahNumber) {
          firstCompletedSurahNumber = surahNumber;
        }
      }
    } catch (e) {
      // Ignore if surah data cannot be loaded
    }
  }
  
  return { firstCompletedSurahNumber, totalCompletedAyat, totalLettersTyped };
};
