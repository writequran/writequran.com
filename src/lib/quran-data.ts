/**
 * Normalizes Arabic text by reducing alefs, removing tatweels, 
 * and transforming similar character variants to a singular baseline for easy typing.
 */
export const normalizeArabicBase = (text: string) => {
  return text
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // Normalize all Alefs
    .replace(/\u0640/g, '') // Remove Tatweel/Kashida
    .replace(/\u06CC/g, '\u064A'); // Map Farsi Yaa to Arabic Yaa safely
};

/**
 * Strips all harakat (diacritics), quranic stops/marks, and ayah markers 
 * for checking bare user keystrokes.
 */
export const stripDiacritics = (text: string) => {
  // \u064B-\u065F basic Tashkeel
  // \u0670 Superscript Alef
  // \u06D6-\u06ED Quranic stops/symbols
  // \u06DD End of Ayah marker
  // \u0660-\u0669 Arabic-Indic Digits
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
    // We strictly ignore all decorative markers, diacritics, and digits for typing
    const isDiacriticOrMarker = /[\u064B-\u065F\u0670\u06D6-\u06ED\u06DD\u0660-\u0669]/.test(char);
    
    if (!isDiacriticOrMarker) {
      const normalizedChar = normalizeArabicBase(char);
      checkString += normalizedChar;
      mapping.push(i);
    }
  }
  
  return {
    displayString: rawText,
    checkString,
    mapping,
  };
};

export interface MushafLine {
  displayString: string;
  checkString: string;
  mapping: number[];
  globalCheckOffset: number;
}

export interface MushafPageData {
  pageNumber: number;
  lines: MushafLine[];
  globalCheckString: string;
}

// Simulated Fatiha Madinah Mushaf Page 1
// \u06DD is the official Unicode End Of Ayah marker. 
// \u0661-\u0667 are Arabic-Indic numerals 1-7.
const page1Lines = [
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ \u06DD\u0661",
  "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ \u06DD\u0662",
  "الرَّحْمَٰنِ الرَّحِيمِ \u06DD\u0663",
  "مَالِكِ يَوْمِ الدِّينِ \u06DD\u0664",
  "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ \u06DD\u0665",
  "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ \u06DD\u0666",
  "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ",
  "غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ \u06DD\u0667"
];

export const getMushafPage = (pageNumber: number): MushafPageData => {
  const linesData: MushafLine[] = [];
  let globalCheckString = "";
  let currentOffset = 0;

  const rawLines = pageNumber === 1 ? page1Lines : [];

  for (const rawLine of rawLines) {
    const { displayString, checkString, mapping } = prepareTypingData(rawLine);
    
    linesData.push({
      displayString,
      checkString,
      mapping,
      globalCheckOffset: currentOffset,
    });
    
    globalCheckString += checkString;
    currentOffset += checkString.length;
  }

  return {
    pageNumber,
    lines: linesData,
    globalCheckString,
  };
};
