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
    const data = localStorage.getItem('quran_typing_mistake_stats');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const saveMistakeStats = (stats: Record<string, MistakeRecord>) => {
  localStorage.setItem('quran_typing_mistake_stats', JSON.stringify(stats));
};

export const loadProgressStats = (): Record<number, ProgressStats> => {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem('quran_typing_progress_stats');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const saveProgressStats = (stats: Record<number, ProgressStats>) => {
  localStorage.setItem('quran_typing_progress_stats', JSON.stringify(stats));
};

export interface WeakSpot {
  surahNumber: number;
  ayahNumber: number;
  score: number;
  globalIndexStart?: number; // Optional quick jump reference
}

export const getWeakSpots = (): WeakSpot[] => {
  const mistakes = loadMistakeStats();
  // Aggregate by surah-ayah
  const ayahScores: Record<string, { surahNumber: number, ayahNumber: number, events: number, attempts: number, indexStart: number }> = {};
  
  Object.values(mistakes).forEach(m => {
    const key = `${m.surahNumber}-${m.ayahNumber}`;
    if (!ayahScores[key]) {
      ayahScores[key] = {
        surahNumber: m.surahNumber,
        ayahNumber: m.ayahNumber,
        events: 0,
        attempts: 0,
        indexStart: m.globalIndex
      };
    }
    ayahScores[key].events += 1;
    ayahScores[key].attempts += m.wrongAttempts;
    // Keep the earliest index in the ayah for jumping
    if (m.globalIndex < ayahScores[key].indexStart) {
      ayahScores[key].indexStart = m.globalIndex;
    }
  });

  return Object.values(ayahScores).map(a => ({
    surahNumber: a.surahNumber,
    ayahNumber: a.ayahNumber,
    globalIndexStart: a.indexStart,
    // Difficulty Score Formula: Unique Events get 2x weight relative to blunt force tracking attempts
    score: (a.events * 2) + (a.attempts * 1)
  })).sort((a, b) => b.score - a.score).slice(0, 10); // Top 10 hardest
};
