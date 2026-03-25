export const normalizeArabicBase = (text: string) => {
  return text
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0640/g, '')
    .replace(/\u06CC/g, '\u064A');
};

export const stripDiacritics = (text: string) => {
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06DD\u0660-\u0669]/g, '');
};

export const normalizeArabic = (text: string) => {
  return normalizeArabicBase(stripDiacritics(text));
};

export interface NormalizedData {
  displayString: string;
  checkString: string;
  mapping: number[];
}

export const prepareTypingData = (rawText: string): NormalizedData => {
  let checkString = "";
  const mapping: number[] = [];
  
  for (let i = 0; i < rawText.length; i++) {
    const char = rawText[i];
    const isDiacriticOrMarker = /[\u064B-\u065F\u0670\u06D6-\u06ED\u06DD\u0660-\u0669]/.test(char);
    
    if (!isDiacriticOrMarker) {
      if (char === " " || char === "\u200C") {
        checkString += char;
        mapping.push(i);
      } else {
        const normalizedChar = normalizeArabicBase(char);
        checkString += normalizedChar;
        mapping.push(i);
      }
    }
  }
  
  return {
    displayString: rawText,
    checkString,
    mapping,
  };
};

/**
 * Finds the nearest logical checkIndex for a given character offset in the visual displayString.
 * Useful for mapping mouse clicks back to the typing cursor position.
 */
export const findCheckIndexByDisplayOffset = (block: MushafBlock, displayOffset: number): number => {
  if (displayOffset <= 0) return 0;
  
  // Find the largest mapping index that is less than or equal to the display offset.
  // The mapping array is sorted by definition as it follows the visual string order.
  let closestIndex = 0;
  for (let i = 0; i < block.mapping.length; i++) {
    if (block.mapping[i] <= displayOffset) {
      closestIndex = i;
    } else {
      break;
    }
  }
  return closestIndex;
};

import quranDataRaw from '../data/quran-uthmani.json';

// Bypass TS index checks for the rapid integration of the cloud dataset
const quranJson = quranDataRaw as any;

export interface QuranSurahMeta {
  number: number;
  name: string;
  englishName: string;
}

export interface MushafBlock {
  displayString: string;
  checkString: string;
  mapping: number[];
  globalCheckOffset: number;
  surahNumber: number;
  ayahNumber: number;
  page: number;
}

export interface SurahTypingData {
  surahNumber: number;
  preBismillah?: string;
  blocks: MushafBlock[];
  globalCheckString: string;
}

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicDigits = (num: number): string => {
  return num.toString().split('').map(d => arabicDigits[parseInt(d)]).join('');
};

export const getAllSurahsMeta = (): QuranSurahMeta[] => {
  return quranJson.data.surahs.map((s: any) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
  }));
};

export const getSurah = (surahNumber: number): SurahTypingData => {
  const surah = quranJson.data.surahs.find((s: any) => s.number === surahNumber);
  const blocksData: MushafBlock[] = [];
  let globalCheckString = "";
  let currentOffset = 0;
  let preBismillah: string | undefined = undefined;

  for (const ayah of surah.ayahs) {
    let rawText = ayah.text;
    
    // Explicit Uthmani Basmala sequence prefix explicitly injected by API cloud
    const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
    
    // Exclude Basmala natively for non-Fatihah non-Tawbah Surahs
    if (surah.number !== 1 && surah.number !== 9 && ayah.numberInSurah === 1) {
      if (rawText.startsWith(bismillah)) {
        preBismillah = bismillah;
        // By slicing rawText BEFORE compile, we mathematically guarantee that the resulting
        // displayString, checkString, and mapping indices omit the display-only Basmala outright.
        rawText = rawText.slice(bismillah.length).trim();
      }
    }
    
    // Explicitly pair standard verses manually with official Ayah markers 
    rawText += ` \u06DD${toArabicDigits(ayah.numberInSurah)}`;

    const { displayString, checkString, mapping } = prepareTypingData(rawText);
    
    blocksData.push({
      displayString,
      checkString,
      mapping,
      globalCheckOffset: currentOffset,
      surahNumber: surah.number,
      ayahNumber: ayah.numberInSurah,
      page: ayah.page,
    });
    
    globalCheckString += checkString;
    currentOffset += checkString.length;
  }

  return {
    surahNumber,
    preBismillah,
    blocks: blocksData,
    globalCheckString,
  };
};

/**
 * Audits the full dataset across three layers:
 *
 *   1. Raw source  — the unmodified ayah text from quran-uthmani.json
 *   2. Display text — raw source + only the two approved display-only transformations:
 *                     (a) Basmala separation for non-Fatihah/non-Tawbah surahs
 *                     (b) Ayah-end marker + Arabic-Indic digit appended per ayah
 *   3. Check string — normalized form (diacritics stripped, Alef variants collapsed)
 *                     used exclusively for keystroke validation, never displayed
 *
 * Does NOT claim byte-for-byte identity with the raw JSON — the display text differs
 * from the raw source by those two intentional approved transformations only.
 */
export const verifyQuranIntegrity = (): boolean => {
  const meta = getAllSurahsMeta();
  let passed = true;
  const bismillah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

  for (const surahMeta of meta) {
    const surahData = getSurah(surahMeta.number);
    const rawSurah = quranJson.data.surahs.find((s: any) => s.number === surahMeta.number);

    for (let i = 0; i < rawSurah.ayahs.length; i++) {
      const rawSource = rawSurah.ayahs[i].text;

      // Build expected display text using only the two approved transformations.
      let expectedDisplay = rawSource;
      if (surahMeta.number !== 1 && surahMeta.number !== 9 && i === 0) {
        if (expectedDisplay.startsWith(bismillah)) {
          expectedDisplay = expectedDisplay.slice(bismillah.length).trim();
        }
      }
      expectedDisplay += ` \u06DD${toArabicDigits(rawSurah.ayahs[i].numberInSurah)}`;

      const actualDisplay = surahData.blocks[i].displayString;
      const actualCheck  = surahData.blocks[i].checkString;

      if (actualDisplay !== expectedDisplay) {
        console.error(
          `[FAIL] Display mismatch — Surah ${surahMeta.number} Ayah ${i + 1}\n` +
          `  Raw source:       ${rawSource}\n` +
          `  Expected display: ${expectedDisplay}\n` +
          `  Actual display:   ${actualDisplay}`
        );
        passed = false;
      } else {
        // Verify check string is the normalized form of display text, nothing more.
        const expectedCheck = normalizeArabic(actualDisplay);
        if (actualCheck !== expectedCheck) {
          console.error(
            `[FAIL] Check string deviation — Surah ${surahMeta.number} Ayah ${i + 1}\n` +
            `  Display text:   ${actualDisplay}\n` +
            `  Expected check: ${expectedCheck}\n` +
            `  Actual check:   ${actualCheck}`
          );
          passed = false;
        }
      }
    }
  }

  if (passed) {
    console.log("[PASS] All 3 layers verified:");
    console.log("  • Raw source: preserved faithfully as the base");
    console.log("  • Display text: raw source + Basmala separation + ayah markers (only approved changes)");
    console.log("  • Check string: normalized subset of display text, never used in display layer");
  }
  return passed;
};
