const GLOBAL_KEYS = new Set(['theme']);
const SESSION_KEYS = [/^session_attempts_/, /^session_mistake_indices_/, /^session_mistakes_/];

export function getStoragePrefix() {
  if (typeof window === 'undefined') return 'quran_typing_anon';
  const userId = localStorage.getItem('quran_typing_active_user_id');
  return userId ? `quran_typing_user_${userId}` : 'quran_typing_anon';
}

export function getScopedKey(key: string) {
  if (GLOBAL_KEYS.has(key)) {
    return `quran_typing_${key}`;
  }
  return `${getStoragePrefix()}_${key}`;
}

export function getStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(getScopedKey(key));
}

export function setStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getScopedKey(key), value);
}

export function removeStorage(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getScopedKey(key));
}

export function getTransientStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const scopedKey = getScopedKey(key);
  const sessionValue = sessionStorage.getItem(scopedKey);
  if (sessionValue !== null) return sessionValue;

  const legacyValue = localStorage.getItem(scopedKey);
  if (legacyValue !== null && SESSION_KEYS.some((pattern) => pattern.test(key))) {
    sessionStorage.setItem(scopedKey, legacyValue);
    localStorage.removeItem(scopedKey);
    return legacyValue;
  }

  return legacyValue;
}

export function setTransientStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  const scopedKey = getScopedKey(key);
  sessionStorage.setItem(scopedKey, value);
  if (SESSION_KEYS.some((pattern) => pattern.test(key))) {
    localStorage.removeItem(scopedKey);
  }
}

export function removeTransientStorage(key: string) {
  if (typeof window === 'undefined') return;
  const scopedKey = getScopedKey(key);
  sessionStorage.removeItem(scopedKey);
  localStorage.removeItem(scopedKey);
}

export function setActiveUserId(id: string | null) {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem('quran_typing_active_user_id', id);
  } else {
    localStorage.removeItem('quran_typing_active_user_id');
  }
}

export function pruneStorageFootprint() {
  if (typeof window === 'undefined') return;

  const prefix = getStoragePrefix();
  const currentSurah = getStorage('surah');

  Object.keys(localStorage).forEach((key) => {
    if (!key.startsWith(`${prefix}_`)) return;

    const unscopedKey = key.slice(prefix.length + 1);

    if (unscopedKey.startsWith('quran_typing_progress_')) {
      localStorage.removeItem(key);
      return;
    }

    if (SESSION_KEYS.some((pattern) => pattern.test(unscopedKey))) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        sessionStorage.setItem(key, value);
      }
      localStorage.removeItem(key);
      return;
    }

    if (
      currentSurah &&
      unscopedKey.startsWith('word_drafts_') &&
      unscopedKey !== `word_drafts_${currentSurah}`
    ) {
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || Object.keys(parsed).length === 0) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  });
}

export function migrateLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  
  if (localStorage.getItem('quran_typing_migration_v2') === 'completed') {
    return; // Migration already successfully ran
  }
  
  let migratedCount = 0;

  // 1. Primitive Preferences
  const migratePrimitive = (key: string, storedKey: string = key) => {
    const legacyVal = localStorage.getItem(key);
    if (legacyVal) {
      if (!getStorage(storedKey)) setStorage(storedKey, legacyVal);
      migratedCount++;
    }
  };
  migratePrimitive('surah');
  migratePrimitive('visibility_mode');
  migratePrimitive('theme');
  migratePrimitive('keyboard');
  
  // 2. Typing Indices
  for (let i = 1; i <= 114; i++) {
    migratePrimitive(`quran_typing_progress_${i}`);
    migratePrimitive(`session_attempts_${i}`);
    migratePrimitive(`session_mistake_indices_${i}`);
  }

  // 3. Merging Progress Stats JSON safely
  const legacyProgress = localStorage.getItem('progress_stats');
  if (legacyProgress) {
    try {
      const oldStats = JSON.parse(legacyProgress);
      const newStats = JSON.parse(getStorage('progress_stats') || '{}');
      Object.keys(oldStats).forEach(surah => {
        if (!newStats[surah]) {
          newStats[surah] = oldStats[surah];
        } else {
          newStats[surah].highestIndexReached = Math.max(newStats[surah].highestIndexReached || 0, oldStats[surah].highestIndexReached || 0);
          newStats[surah].totalMistakeEvents = Math.max(newStats[surah].totalMistakeEvents || 0, oldStats[surah].totalMistakeEvents || 0);
          newStats[surah].totalWrongAttempts = Math.max(newStats[surah].totalWrongAttempts || 0, oldStats[surah].totalWrongAttempts || 0);
        }
      });
      setStorage('progress_stats', JSON.stringify(newStats));
      migratedCount++;
    } catch (e) {}
  }

  // 4. Merging Mistake Stats JSON safely
  const legacyMistakes = localStorage.getItem('mistake_stats');
  if (legacyMistakes) {
    try {
      const oldStats = JSON.parse(legacyMistakes);
      const newStats = JSON.parse(getStorage('mistake_stats') || '{}');
      Object.keys(oldStats).forEach(key => {
        if (!newStats[key]) {
          newStats[key] = oldStats[key];
        } else {
          newStats[key].wrongAttempts = Math.max(newStats[key].wrongAttempts || 0, oldStats[key].wrongAttempts || 0);
        }
      });
      setStorage('mistake_stats', JSON.stringify(newStats));
      migratedCount++;
    } catch (e) {}
  }

  localStorage.setItem('quran_typing_migration_v2', 'completed');
}
