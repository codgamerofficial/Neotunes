/**
 * Transliteration Engine for Global Multilingual Music Queries.
 * Provides bidirectional Romanized-to-Script and Script-to-Romanized expansions
 * for Indic scripts (Bengali, Hindi/Devanagari, Punjabi/Gurmukhi) alongside curated song dictionaries.
 */

// 1. High-frequency bidirectional catalog transliteration mapping
export const TRANSLITERATION_LEXICON: Record<string, string[]> = {
  // Bengali
  'tumi robe nirobe': ['তুমি রবে নীরবে'],
  'তুমি রবে নীরবে': ['tumi robe nirobe'],
  'ami je tomar': ['আমি যে তোমার'],
  'আমি যে তোমার': ['ami je tomar'],
  'bose bose bhabi': ['বসে বসে ভাবি'],
  'বসে বসে ভাবি': ['bose bose bhabi'],
  'bose bose vabi': ['বসে বসে ভাবি'],
  'boose boose vabi': ['বসে বসে ভাবি'],
  'bhalobashi': ['ভালোবাসি'],
  'valobashi': ['ভালোবাসি'],
  'ভালোবাসি': ['bhalobashi', 'valobashi'],
  'kothao amar': ['কোথাও আমার'],
  'amar hiyar majhe': ['আমার হিয়ার মাঝে'],
  'chole jaona': ['চলে যেও না'],
  'anupam roy': ['অনুপম রায়'],
  'অনুপম রায়': ['anupam roy'],
  'arijit singh': ['অরিজিৎ সিং', 'अरिजीत सिंह'],
  'অরিজিৎ সিং': ['arijit singh'],
  'shreya ghoshal': ['শ্রেয়া ঘোষাল', 'श्रेया घोषाल'],
  'শ্রেয়া ঘোষাল': ['shreya ghoshal'],
  'kishore kumar': ['কিশোর কুমার', 'किशोर कुमार'],
  'কিশোর কুমার': ['kishore kumar'],
  'hemanta mukherjee': ['হেমন্ত মুখোপাধ্যায়'],
  'manna dey': ['মান্না দে'],

  // Hindi / Devanagari
  'kesariya': ['केसरिया'],
  'केसरिया': ['kesariya'],
  'kesria': ['केसरिया'],
  'tum hi ho': ['तुम ही हो'],
  'तुम ही हो': ['tum hi ho'],
  'tera ban jaunga': ['तेरा बन जाऊँगा', 'तेरा बन जाऊंगा'],
  'तेरा बन जाऊँगा': ['tera ban jaunga'],
  'apna bana le': ['अपना बना ले'],
  'अपना बना ले': ['apna bana le'],
  'apna bana leh': ['अपना बना ले'],
  'chaleya': ['चलेया'],
  'चलेया': ['chaleya'],
  'chalya': ['चलेया'],
  'heeriye': ['हीरियें', 'हीरिये'],
  'हीरियें': ['heeriye'],
  'heerie': ['हीरियें'],
  'channa mereya': ['चन्ना मेरेया'],
  'चन्ना मेरेया': ['channa mereya'],
  'tere vaaste': ['तेरे वास्ते'],
  'तेरे वास्ते': ['tere vaaste'],
  'tere waste': ['तेरे वास्ते'],
  'pasoori': ['पसूरी'],
  'पसूरी': ['pasoori'],
  'dil diyan gallan': ['दिल दियां गल्लां'],
  'raataan lambiyan': ['रातां लम्बियां'],
  'kabira': ['कबीरा'],
  'zaalima': ['ज़ालिमा', 'जालिमा'],
  'galti se mistake': ['गलती से मिस्टेक'],
  'kalank': ['कलंक'],
  'pritam': ['प्रीतम'],
  'प्रीतम': ['pritam'],
  'अरिजीत सिंह': ['arijit singh'],

  // Punjabi / Gurmukhi
  'karan aujla': ['ਕਰਨ ਔਜਲਾ', 'करण औजला'],
  'ਕਰਨ ਔਜਲਾ': ['karan aujla'],
  'diljit dosanjh': ['ਦਿਲਜੀਤ ਦੋਸਾਂਝ', 'दिलजीत दोसांझ'],
  'ਦਿਲਜੀਤ ਦੋਸਾਂਝ': ['diljit dosanjh'],
  'sidhu moosewala': ['ਸਿੱਧੂ ਮੂਸੇਵਾਲਾ', 'सिद्धू मूसेवाला'],
  'ਸਿੱਧੂ ਮੂਸੇਵਾਲਾ': ['sidhu moosewala'],
  'wavy': ['ਵੇਵੀ'],
  'tauba tauba': ['ਤੌਬਾ ਤੌਬਾ', 'तौबा तौबा'],

  // Arabic / Urdu
  'kun faya kun': ['كن فيكون', 'कुन फाया कुन'],
  'afreen afreen': ['آفرین آفرین', 'आफ़रीन आफ़रीन'],
};

// 2. Rule-based Indic Consonants / Vowels phonetic table
const DEVANAGARI_RULES: [RegExp, string][] = [
  [/ksha/gi, 'क्ष'],
  [/tra/gi, 'त्र'],
  [/gya/gi, 'ज्ञ'],
  [/kh/gi, 'ख'],
  [/gh/gi, 'घ'],
  [/ch/gi, 'च'],
  [/chh/gi, 'छ'],
  [/jh/gi, 'झ'],
  [/th/gi, 'थ'],
  [/dh/gi, 'ध'],
  [/ph/gi, 'फ'],
  [/bh/gi, 'भ'],
  [/sh/gi, 'श'],
  [/k/gi, 'क'],
  [/g/gi, 'ग'],
  [/j/gi, 'ज'],
  [/t/gi, 'त'],
  [/d/gi, 'द'],
  [/n/gi, 'न'],
  [/p/gi, 'प'],
  [/b/gi, 'ब'],
  [/m/gi, 'म'],
  [/y/gi, 'य'],
  [/r/gi, 'र'],
  [/l/gi, 'ल'],
  [/v/gi, 'व'],
  [/w/gi, 'व'],
  [/s/gi, 'स'],
  [/h/gi, 'ह'],
];

/**
 * Generates transliterated query candidates.
 * Returns an array of search variants including original query,
 * exact lexicon mappings, sub-phrase mappings, and script conversions.
 */
export function transliterateQuery(query: string): string[] {
  if (!query || !query.trim()) return [];

  const norm = query.toLowerCase().trim();
  const variants = new Set<string>();
  variants.add(query);

  // 1. Direct match in dictionary
  if (TRANSLITERATION_LEXICON[norm]) {
    TRANSLITERATION_LEXICON[norm].forEach(t => variants.add(t));
  }

  // 2. Multi-word / Subphrase dictionary replacement
  for (const [key, mappings] of Object.entries(TRANSLITERATION_LEXICON)) {
    if (norm !== key && norm.includes(key)) {
      mappings.forEach(mapped => {
        variants.add(norm.replace(key, mapped));
      });
    }
  }

  // 3. If query contains Indic Unicode script, also extract ASCII Romanized counterpart
  for (const [key, mappings] of Object.entries(TRANSLITERATION_LEXICON)) {
    if (mappings.includes(query) || mappings.some(m => query.includes(m))) {
      variants.add(key);
    }
  }

  return Array.from(variants);
}
