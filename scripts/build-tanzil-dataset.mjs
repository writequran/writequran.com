import fs from 'fs';

const textXmlPath = '/tmp/tanzil-uthmani.xml';
const metadataXmlPath = '/tmp/tanzil-quran-data.xml';
const outputPath = '/Users/akhlilud/quran-typing/src/data/quran-uthmani.json';

const textXml = fs.readFileSync(textXmlPath, 'utf8');
const metadataXml = fs.readFileSync(metadataXmlPath, 'utf8');
const existingJson = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

const parseAttrs = (tag) => {
  const attrs = {};
  for (const match of tag.matchAll(/([A-Za-z_]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
};

const parseStartList = (xml, tagName) => {
  return [...xml.matchAll(new RegExp(`<${tagName}\\s+([^/>]+?)\\s*/>`, 'g'))].map((match) => {
    const attrs = parseAttrs(match[1]);
    return {
      index: Number(attrs.index),
      sura: Number(attrs.sura),
      aya: Number(attrs.aya),
      type: attrs.type,
    };
  });
};

const compareRef = (a, b) => {
  if (a.sura !== b.sura) return a.sura - b.sura;
  return a.aya - b.aya;
};

const suraMeta = [...metadataXml.matchAll(/<sura\s+([^/>]+?)\s*\/>/g)].map((match) => {
  const attrs = parseAttrs(match[1]);
  return {
    index: Number(attrs.index),
    ayas: Number(attrs.ayas),
    name: attrs.name,
    tname: attrs.tname,
    ename: attrs.ename,
    type: attrs.type,
  };
});

const juzStarts = parseStartList(metadataXml, 'juz');
const quarterStarts = parseStartList(metadataXml, 'quarter');
const manzilStarts = parseStartList(metadataXml, 'manzil');
const rukuStarts = parseStartList(metadataXml, 'ruku');
const pageStarts = parseStartList(metadataXml, 'page');
const sajdaEntries = parseStartList(metadataXml, 'sajda');

const sajdaMap = new Map(
  sajdaEntries.map((entry) => [
    `${entry.sura}:${entry.aya}`,
    {
      id: entry.index,
      recommended: entry.type === 'recommended',
      obligatory: entry.type === 'obligatory',
    },
  ]),
);

const textSuras = [...textXml.matchAll(/<sura\s+([^>]+)>([\s\S]*?)<\/sura>/g)].map((match) => {
  const suraAttrs = parseAttrs(match[1]);
  const ayahs = [...match[2].matchAll(/<aya\s+([^/>]+?)\s*\/>/g)].map((ayaMatch) => {
    const attrs = parseAttrs(ayaMatch[1]);
    return {
      index: Number(attrs.index),
      text: attrs.text,
      bismillah: attrs.bismillah,
    };
  });

  return {
    index: Number(suraAttrs.index),
    name: suraAttrs.name,
    ayahs,
  };
});

if (textSuras.length !== 114 || suraMeta.length !== 114) {
  throw new Error('Unexpected Tanzil data shape while rebuilding Quran dataset.');
}

let juzCursor = 0;
let quarterCursor = 0;
let manzilCursor = 0;
let rukuCursor = 0;
let pageCursor = 0;
let globalAyahNumber = 1;

const surahs = textSuras.map((textSura) => {
  const meta = suraMeta.find((entry) => entry.index === textSura.index);
  const existingMeta = existingJson.data.surahs.find((entry) => entry.number === textSura.index);
  if (!meta) {
    throw new Error(`Missing metadata for sura ${textSura.index}.`);
  }
  if (meta.ayas !== textSura.ayahs.length) {
    throw new Error(`Ayah count mismatch for sura ${textSura.index}.`);
  }

  const ayahs = textSura.ayahs.map((ayah) => {
    while (
      juzCursor + 1 < juzStarts.length &&
      compareRef(juzStarts[juzCursor + 1], { sura: textSura.index, aya: ayah.index }) <= 0
    ) {
      juzCursor += 1;
    }

    while (
      quarterCursor + 1 < quarterStarts.length &&
      compareRef(quarterStarts[quarterCursor + 1], { sura: textSura.index, aya: ayah.index }) <= 0
    ) {
      quarterCursor += 1;
    }
    while (
      manzilCursor + 1 < manzilStarts.length &&
      compareRef(manzilStarts[manzilCursor + 1], { sura: textSura.index, aya: ayah.index }) <= 0
    ) {
      manzilCursor += 1;
    }
    while (
      rukuCursor + 1 < rukuStarts.length &&
      compareRef(rukuStarts[rukuCursor + 1], { sura: textSura.index, aya: ayah.index }) <= 0
    ) {
      rukuCursor += 1;
    }
    while (
      pageCursor + 1 < pageStarts.length &&
      compareRef(pageStarts[pageCursor + 1], { sura: textSura.index, aya: ayah.index }) <= 0
    ) {
      pageCursor += 1;
    }

    const text = ayah.bismillah ? `${ayah.bismillah} ${ayah.text}` : ayah.text;

    return {
      number: globalAyahNumber++,
      text,
      numberInSurah: ayah.index,
      juz: juzStarts[juzCursor].index,
      manzil: manzilStarts[manzilCursor].index,
      page: pageStarts[pageCursor].index,
      ruku: rukuStarts[rukuCursor].index,
      hizbQuarter: quarterStarts[quarterCursor].index,
      sajda: sajdaMap.get(`${textSura.index}:${ayah.index}`) ?? false,
    };
  });

  return {
    number: textSura.index,
    name: existingMeta?.name ?? `سُورَةُ ${meta.name}`,
    englishName: existingMeta?.englishName ?? meta.tname,
    englishNameTranslation: existingMeta?.englishNameTranslation ?? meta.ename,
    revelationType: existingMeta?.revelationType ?? meta.type,
    ayahs,
  };
});

const payload = {
  code: 200,
  status: 'OK',
  data: {
    surahs,
    edition: {
      identifier: 'tanzil-uthmani',
      language: 'ar',
      name: 'القرآن الكريم برسم عثماني (Tanzil Uthmani)',
      englishName: 'Tanzil Uthmani',
      format: 'text',
      type: 'quran',
      source: 'Tanzil.net',
      version: '1.0.2',
    },
  },
};

fs.writeFileSync(outputPath, JSON.stringify(payload));

console.log(`Wrote ${surahs.length} surahs and ${globalAyahNumber - 1} ayahs to ${outputPath}`);
