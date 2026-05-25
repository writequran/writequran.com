"use server"

import { createClient } from '@/utils/supabase/server';
import { getSurah } from '@/lib/quran-data';

export async function syncProgressAction(
  currentProgressState: any,
  progressUpserts: any[],
  mistakeUpserts: any[]
) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error("Auth error in syncProgressAction:", error?.message || "No user found");
    return { success: false, error: "Unauthorized" };
  }

  // 1. Validate Current Progress State
  if (currentProgressState) {
    if (typeof currentProgressState.surah_number === 'number' && 
        typeof currentProgressState.global_index === 'number') {
        
        const safeSurahNumber = Math.max(1, Math.min(114, currentProgressState.surah_number));
        const surahData = getSurah(safeSurahNumber);
        const maxIndex = surahData.globalCheckString.length;
        const safeGlobalIndex = Math.max(0, Math.min(maxIndex, currentProgressState.global_index));

        await supabase.from('current_progress_state').upsert({
            user_id: user.id,
            surah_number: safeSurahNumber,
            global_index: safeGlobalIndex,
            updated_at: currentProgressState.updated_at || new Date().toISOString()
        });
    }
  }

  // 2. Validate and Upsert Surah Progress
  if (progressUpserts && progressUpserts.length > 0) {
    const validatedProgressUpserts = progressUpserts.map((progress: any) => {
      const surahNumber = Math.max(1, Math.min(114, Number(progress.surah_number)));
      const surahData = getSurah(surahNumber);
      const maxIndex = surahData.globalCheckString.length;

      // Sanitize typed_indices: remove duplicates and out-of-bounds indices
      let safeTypedIndices: number[] = [];
      if (Array.isArray(progress.typed_indices)) {
        const uniqueIndices = new Set<number>();
        for (const idx of progress.typed_indices) {
          if (typeof idx === 'number' && idx >= 0 && idx < maxIndex) {
            uniqueIndices.add(idx);
          }
        }
        safeTypedIndices = Array.from(uniqueIndices).sort((a, b) => a - b);
      }

      // Recalculate completed ayat and completion status authoritatively on the server
      let totalLetters = 0;
      let typedCount = 0;
      const typedSet = new Set(safeTypedIndices);

      for (let i = 0; i < surahData.globalCheckString.length; i++) {
        const char = surahData.globalCheckString[i];
        if (char !== ' ' && char !== '\u200C') {
          totalLetters++;
          if (typedSet.has(i)) {
            typedCount++;
          }
        }
      }

      let completedAyat = 0;
      for (const block of surahData.blocks) {
        let fullyTyped = true;
        const blockEnd = block.globalCheckOffset + block.checkString.length;
        for (let i = block.globalCheckOffset; i < blockEnd; i++) {
          if (!typedSet.has(i)) {
            fullyTyped = false;
            break;
          }
        }
        if (fullyTyped) completedAyat++;
      }

      const isCompleted = totalLetters > 0 && typedCount >= totalLetters;
      
      // Ensure highest_index_reached makes mathematical sense
      const calcHighest = safeTypedIndices.length > 0 ? safeTypedIndices[safeTypedIndices.length - 1] : 0;
      const claimedHighest = Math.max(0, Math.min(maxIndex, Number(progress.highest_index_reached) || 0));
      const safeHighestIndex = Math.max(calcHighest, claimedHighest);

      return {
        user_id: user.id,
        surah_number: surahNumber,
        highest_index_reached: safeHighestIndex,
        total_mistake_events: Math.max(0, Number(progress.total_mistake_events) || 0),
        total_wrong_attempts: Math.max(0, Number(progress.total_wrong_attempts) || 0),
        last_practiced: progress.last_practiced ? new Date(progress.last_practiced).toISOString() : new Date().toISOString(),
        typed_indices: safeTypedIndices,
        completed_ayat_count: completedAyat,
        is_completed: isCompleted
      };
    });

    if (validatedProgressUpserts.length > 0) {
      const { error } = await supabase.from('surah_progress').upsert(validatedProgressUpserts, { onConflict: 'user_id,surah_number' });
      if (error) console.error("Validation Upsert Error (surah_progress):", error);
    }
  }

  // 3. Validate and Upsert Mistake Stats
  if (mistakeUpserts && mistakeUpserts.length > 0) {
    const validatedMistakeUpserts = mistakeUpserts.map((m: any) => {
        const surahNumber = Math.max(1, Math.min(114, Number(m.surah_number)));
        const surahData = getSurah(surahNumber);
        
        // Ensure ayah exists
        const ayahNumber = Math.max(1, Number(m.ayah_number));
        const maxIndex = surahData.globalCheckString.length;
        
        return {
            user_id: user.id,
            surah_number: surahNumber,
            ayah_number: ayahNumber,
            global_index: Math.max(0, Math.min(maxIndex, Number(m.global_index) || 0)),
            expected_char: String(m.expected_char).slice(0, 5), // Prevent giant string injection
            wrong_attempts: Math.max(1, Number(m.wrong_attempts) || 1),
            timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()
        };
    });

    if (validatedMistakeUpserts.length > 0) {
        const { error } = await supabase.from('mistake_stats').upsert(validatedMistakeUpserts, { onConflict: 'user_id,surah_number,ayah_number,global_index,expected_char' });
        if (error) console.error("Validation Upsert Error (mistake_stats):", error);
    }
  }

  return { success: true };
}
