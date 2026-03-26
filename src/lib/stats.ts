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
