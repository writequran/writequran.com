import { getStorage, setStorage } from './storage';

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
  if (typeof window !== "undefined") import('./sync-manager').then(m => m.debouncedSyncLocalToCloud());
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

const saveWeakSpotReviewStates = (states: Record<string, WeakSpotReviewState>) => {
  setStorage(WEAK_SPOT_REVIEW_KEY, JSON.stringify(states));
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
