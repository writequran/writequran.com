import { createClient } from '@/utils/supabase/client';
import { getStorage, setStorage } from './storage';
import { MistakeRecord, ProgressStats, getSurahFinalProgressState } from './stats';

/**
 * Top-level Orchestrator: Pushes Local to Cloud.
 */
export async function syncLocalToCloud() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // Keep offline isolated!

  const now = new Date().toISOString();
  
  // 1. Current Progress State
  const surahNumber = parseInt(getStorage('surah') || '1', 10);
  const globalIndex = parseInt(getStorage('current_progress_index') || getStorage(`quran_typing_progress_${surahNumber}`) || '0', 10);
  
  await supabase.from('current_progress_state').upsert({
    user_id: user.id,
    surah_number: surahNumber,
    global_index: globalIndex,
    updated_at: now
  });

  // 2. User Preferences
  const visibilityMode = getStorage('visibility_mode') || 'hidden';
  const showKeyboard = getStorage('keyboard') === 'true';
  const theme = getStorage('theme') || 'light';
  const showOnLeaderboard = getStorage('privacy_show_on_leaderboard') !== 'false';
  const showPublicProfile = getStorage('privacy_show_public_profile') !== 'false';

  await supabase.from('user_preferences').upsert({
    user_id: user.id,
    theme,
    visibility_mode: visibilityMode,
    show_keyboard: showKeyboard,
    show_on_leaderboard: showOnLeaderboard,
    show_public_profile: showPublicProfile,
    updated_at: now
  });

  // 3. Surah Progress
  const progressStats: Record<string, ProgressStats> = JSON.parse(getStorage('progress_stats') || '{}');
  const progressUpserts = Object.keys(progressStats).map(surah => {
    // Collect specific typed indices for true-letter-retention across devices
    let typedIndicesArray: number[] = [];
    try {
      const savedIndices = getStorage(`typed_indices_${surah}`);
      if (savedIndices) typedIndicesArray = JSON.parse(savedIndices);
    } catch {
      // Ignore parse errors, default to empty
    }

    const finalState = getSurahFinalProgressState(parseInt(surah, 10));

    return {
      user_id: user.id,
      surah_number: parseInt(surah, 10),
      highest_index_reached: progressStats[surah].highestIndexReached,
      total_mistake_events: progressStats[surah].totalMistakeEvents,
      total_wrong_attempts: progressStats[surah].totalWrongAttempts,
      last_practiced: new Date(progressStats[surah].lastPracticed).toISOString(),
      typed_indices: typedIndicesArray,
      completed_ayat_count: finalState.completedAyat,
      is_completed: finalState.isCompleted
    };
  });

  if (progressUpserts.length > 0) {
    await supabase.from('surah_progress').upsert(progressUpserts, { onConflict: 'user_id,surah_number' });
  }

  // 4. Mistake Stats (Additive Upsert handled securely via Postgres Unique Constraint)
  const mistakeStats: Record<string, MistakeRecord> = JSON.parse(getStorage('mistake_stats') || '{}');
  const mistakeUpserts = Object.values(mistakeStats).map(m => ({
    user_id: user.id,
    surah_number: m.surahNumber,
    ayah_number: m.ayahNumber,
    global_index: m.globalIndex,
    expected_char: m.expectedChar,
    wrong_attempts: m.wrongAttempts,
    timestamp: new Date(m.timestamp || Date.now()).toISOString()
  }));

  if (mistakeUpserts.length > 0) {
    await supabase.from('mistake_stats').upsert(mistakeUpserts, { onConflict: 'user_id,surah_number,ayah_number,global_index,expected_char' });
  }
}

let syncTimer: any = null;
export function debouncedSyncLocalToCloud() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncLocalToCloud().catch(err => console.error("Background Sync Failed:", err));
  }, 3000);
}

/**
 * Top-level Orchestrator: Pulls Cloud to Local, merges securely, and pushes the merged result back.
 */
export async function syncCloudToLocal() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Pull Data
  const [prefRes, progStateRes, surahRes, mistakeRes] = await Promise.all([
    supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
    supabase.from('current_progress_state').select('*').eq('user_id', user.id).single(),
    supabase.from('surah_progress').select('*').eq('user_id', user.id),
    supabase.from('mistake_stats').select('*').eq('user_id', user.id)
  ]);

  if (!prefRes.data && !progStateRes.data && (!surahRes.data || surahRes.data.length === 0)) {
    // Brand new cloud account. Push our local dataset up fully!
    await syncLocalToCloud();
    return;
  }

  // 2. Safely merge Preferences (Time-Priority not strictly necessary as client init usually lacks it natively unless they modified offline)
  if (prefRes.data) {
    setStorage('theme', prefRes.data.theme);
    setStorage('visibility_mode', prefRes.data.visibility_mode);
    setStorage('keyboard', prefRes.data.show_keyboard.toString());
    setStorage('privacy_show_on_leaderboard', String(prefRes.data.show_on_leaderboard ?? true));
    setStorage('privacy_show_public_profile', String(prefRes.data.show_public_profile ?? true));
  }

  // 3. Current Progress State (Resume pointer)
  if (progStateRes.data) {
    // We update the Surah and the explicit local progress pointer
    setStorage('surah', progStateRes.data.surah_number.toString());
    setStorage('current_progress_index', progStateRes.data.global_index.toString());
  }

  // 4. Safely merge historical Surah Progress (Max wins)
  const localProgress = JSON.parse(getStorage('progress_stats') || '{}');
  if (surahRes.data) {
    surahRes.data.forEach(row => {
      const s = row.surah_number.toString();
      let shouldUpdateLocalIndices = false;

      if (!localProgress[s]) {
        localProgress[s] = {
          surahNumber: row.surah_number,
          highestIndexReached: row.highest_index_reached,
          totalMistakeEvents: row.total_mistake_events,
          totalWrongAttempts: row.total_wrong_attempts,
          lastPracticed: new Date(row.last_practiced).getTime()
        };
        shouldUpdateLocalIndices = true;
      } else {
        localProgress[s].highestIndexReached = Math.max(localProgress[s].highestIndexReached, row.highest_index_reached);
        localProgress[s].totalMistakeEvents = Math.max(localProgress[s].totalMistakeEvents, row.total_mistake_events);
        localProgress[s].totalWrongAttempts = Math.max(localProgress[s].totalWrongAttempts, row.total_wrong_attempts);
        localProgress[s].lastPracticed = Math.max(localProgress[s].lastPracticed, new Date(row.last_practiced).getTime());
        
        // If exact index count array is larger from cloud, we trust cloud as max authority for specific strokes
        if (row.typed_indices && Array.isArray(row.typed_indices) && row.typed_indices.length > localProgress[s].highestIndexReached) {
          shouldUpdateLocalIndices = true;
        }
      }

      // Safely orchestrate array merges so true letter metrics survive device migration
      if (row.typed_indices && Array.isArray(row.typed_indices)) {
        try {
          const cloudSet = new Set<number>(row.typed_indices);
          const localStored = getStorage(`typed_indices_${s}`);
          const localSet = localStored ? new Set<number>(JSON.parse(localStored)) : new Set<number>();
          
          if (cloudSet.size > localSet.size || shouldUpdateLocalIndices) {
            // Unify them safely natively
            const mergedArray = Array.from(new Set([...Array.from(cloudSet), ...Array.from(localSet)])).sort((a, b) => a - b);
            setStorage(`typed_indices_${s}`, JSON.stringify(mergedArray));
          }
        } catch {
          // Fallback if parsing massively corrupts
        }
      }
    });
    setStorage('progress_stats', JSON.stringify(localProgress));
  }

  // 5. Safely merge Mistake Stats (Logical Key based, Additive logic)
  const localMistakes = JSON.parse(getStorage('mistake_stats') || '{}');
  if (mistakeRes.data) {
    mistakeRes.data.forEach(row => {
      const key = `${row.surah_number}-${row.ayah_number}-${row.global_index}`;
      if (!localMistakes[key]) {
        localMistakes[key] = {
          surahNumber: row.surah_number,
          ayahNumber: row.ayah_number,
          globalIndex: row.global_index,
          expectedChar: row.expected_char,
          wrongAttempts: row.wrong_attempts,
          timestamp: new Date(row.timestamp).getTime()
        };
      } else {
        // Sum the attempts if they somehow diverged, maintaining the oldest initial record as the baseline or capturing highest
        localMistakes[key].wrongAttempts = Math.max(localMistakes[key].wrongAttempts, row.wrong_attempts);
        localMistakes[key].timestamp = Math.max(localMistakes[key].timestamp, new Date(row.timestamp).getTime());
      }
    });
    setStorage('mistake_stats', JSON.stringify(localMistakes));
  }

  // 6. Push unified results back up to Cloud guaranteeing synchronization max bounds
  await syncLocalToCloud();
}
