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

  for (const ayah of surah.ayahs) {
    // AlquranCloud embeds \n to demarcate Bismillahs functionally in Ayah 1
    // Replacing it with native organic spacing prevents layout engine snapping loops
    let rawText = ayah.text.replace(/\n/g, ' ');
    
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
    blocks: blocksData,
    globalCheckString,
  };
};
