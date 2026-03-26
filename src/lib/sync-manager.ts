import { SyncPayload, pushSyncPayload, pullSyncPayload } from './cloud';
import { getStorage, setStorage } from './storage';

/**
 * Sweeps all localStorage quran_typing items and packages them into a strict SyncPayload.
 */
export function buildLocalPayload(): SyncPayload {
  const progressStats = JSON.parse(getStorage('progress_stats') || '{}');
  const mistakeStats = JSON.parse(getStorage('mistake_stats') || '{}');
  
  const sessionAttempts: Record<string, number> = {};
  const sessionMistakesIndices: Record<string, number[]> = {};

  for (let i = 1; i <= 114; i++) {
    const attempts = getStorage(`session_attempts_${i}`);
    if (attempts) sessionAttempts[i] = parseInt(attempts, 10);

    const indices = getStorage(`session_mistake_indices_${i}`);
    if (indices) sessionMistakesIndices[i] = JSON.parse(indices);
  }

  return {
    version: 1,
    updated_at: Date.now(),
    preferences: {
      surahNumber: parseInt(getStorage('surah') || '1', 10),
      visibilityMode: getStorage('visibility_mode') || 'hidden',
      showKeyboard: getStorage('keyboard') === 'true',
      theme: getStorage('theme') || 'light',
    },
    progressStats,
    mistakeStats,
    sessionAttempts,
    sessionMistakesIndices
  };
}

/**
 * Deep merges the Remote Payload into the user's Local Storage, resolving conflicts safely.
 * - Progress highestIndexReached takes Math.max()
 * - Mistakes takes the highest wrongAttempts and newest timestamp
 */
export function applyRemotePayloadToLocal(remote: SyncPayload) {
  // 1. Preferences Setup
  setStorage('surah', remote.preferences.surahNumber.toString());
  setStorage('visibility_mode', remote.preferences.visibilityMode);
  setStorage('keyboard', remote.preferences.showKeyboard.toString());
  setStorage('theme', remote.preferences.theme);
  
  // 2. Safely merge Progress
  const localProgress = JSON.parse(getStorage('progress_stats') || '{}');
  const mergedProgress = { ...remote.progressStats };
  Object.keys(localProgress).forEach(surah => {
    if (!mergedProgress[surah]) {
      mergedProgress[surah] = localProgress[surah];
    } else {
      mergedProgress[surah].highestIndexReached = Math.max(mergedProgress[surah].highestIndexReached || 0, localProgress[surah].highestIndexReached || 0);
      mergedProgress[surah].totalMistakeEvents = Math.max(mergedProgress[surah].totalMistakeEvents || 0, localProgress[surah].totalMistakeEvents || 0);
    }
  });
  setStorage('progress_stats', JSON.stringify(mergedProgress));

  // 3. Safely merge Mistakes
  const localMistakes = JSON.parse(getStorage('mistake_stats') || '{}');
  const mergedMistakes = { ...remote.mistakeStats };
  Object.keys(localMistakes).forEach(key => {
    if (!mergedMistakes[key]) {
      mergedMistakes[key] = localMistakes[key];
    } else {
      mergedMistakes[key].wrongAttempts = Math.max(mergedMistakes[key].wrongAttempts || 0, localMistakes[key].wrongAttempts || 0);
      mergedMistakes[key].timestamp = Math.max(mergedMistakes[key].timestamp || 0, localMistakes[key].timestamp || 0);
    }
  });
  setStorage('mistake_stats', JSON.stringify(mergedMistakes));

  // 4. Overwrite Sessions mapping
  Object.keys(remote.sessionAttempts).forEach(surah => {
    setStorage(`session_attempts_${surah}`, remote.sessionAttempts[surah].toString());
  });
  Object.keys(remote.sessionMistakesIndices).forEach(surah => {
    setStorage(`session_mistake_indices_${surah}`, JSON.stringify(remote.sessionMistakesIndices[surah]));
  });
}

/**
 * Top-level Orchestrator: Pushes Local to Cloud.
 */
export async function syncLocalToCloud() {
  const payload = buildLocalPayload();
  await pushSyncPayload(payload);
}

let syncTimer: any = null;
export function debouncedSyncLocalToCloud() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncLocalToCloud().catch(() => {});
  }, 3000);
}

/**
 * Top-level Orchestrator: Pulls Cloud to Local, merges securely, and pushes the merged result back.
 */
export async function syncCloudToLocal() {
  const remote = await pullSyncPayload();
  if (remote.empty || !remote.payload) {
    // Brand new account, no cloud data. Push our local data to cloud immediately!
    await syncLocalToCloud();
    return;
  }
  
  // Merge remote into local safely
  applyRemotePayloadToLocal(remote.payload);
  
  // Immediately push the newly unified highest-index records back to Cloud
  await syncLocalToCloud();
}
