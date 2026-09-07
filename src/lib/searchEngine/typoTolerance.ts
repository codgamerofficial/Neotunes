import { normalizeString } from './normalizer';

/**
 * Calculates Damerau-Levenshtein distance between two strings,
 * including single-character edits and adjacent transpositions (e.g. "shakria" -> "shakira").
 */
export function getDamerauLevenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[len1][len2];
}

/**
 * Returns normalized similarity score between 0.0 and 1.0 using Damerau-Levenshtein distance.
 */
export function getSimilarity(s1: string, s2: string): number {
  const str1 = normalizeString(s1);
  const str2 = normalizeString(s2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  return Math.max(0, 1.0 - getDamerauLevenshteinDistance(str1, str2) / maxLen);
}

// Levenshtein distance for backward compatibility
export function getLevenshteinDistance(s1: string, s2: string): number {
  return getDamerauLevenshteinDistance(s1, s2);
}

// Global Music Artist & Track Spelling Correction Dictionary
export const SPELL_DICTIONARY: Record<string, string> = {
  // Global & Indian Artists
  'arjit': 'Arijit',
  'arijit': 'Arijit',
  'arjit singh': 'Arijit Singh',
  'arijit sing': 'Arijit Singh',
  'arjit sing': 'Arijit Singh',
  'shakria': 'Shakira',
  'shakira': 'Shakira',
  'karan aujlaa': 'Karan Aujla',
  'karan aujla': 'Karan Aujla',
  'weeknd': 'The Weeknd',
  'the weeknd': 'The Weeknd',
  'the weekend': 'The Weeknd',
  'weekend': 'The Weeknd',
  'cold play': 'Coldplay',
  'coldplay': 'Coldplay',
  'hanumankindd': 'Hanumankind',
  'hanumankindo': 'Hanumankind',
  'hanumankind': 'Hanumankind',
  'bruno mars song': 'Bruno Mars',
  'bruno marss': 'Bruno Mars',
  'taylor': 'Taylor Swift',
  'taylor swif': 'Taylor Swift',
  'taylor swift': 'Taylor Swift',
  'sheeran': 'Ed Sheeran',
  'ed sheeran': 'Ed Sheeran',
  'ed sheran': 'Ed Sheeran',
  'billie': 'Billie Eilish',
  'billie eilish': 'Billie Eilish',
  'billi eilish': 'Billie Eilish',
  'diljit': 'Diljit Dosanjh',
  'diljit dosanjh': 'Diljit Dosanjh',
  'diljit dosanj': 'Diljit Dosanjh',
  'shreya': 'Shreya Ghoshal',
  'shreya ghoshal': 'Shreya Ghoshal',
  'shreya ghosal': 'Shreya Ghoshal',
  'pritam': 'Pritam',
  'pritom': 'Pritam',
  'atif': 'Atif Aslam',
  'atif aslam': 'Atif Aslam',
  'anupam': 'Anupam Roy',
  'anupam roy': 'Anupam Roy',
  'kishore': 'Kishore Kumar',
  'kishore kumar': 'Kishore Kumar',
  'bad buny': 'Bad Bunny',
  'bad bunny': 'Bad Bunny',
  'dua lip': 'Dua Lipa',
  'dua lipa': 'Dua Lipa',

  // Common Track Titles & Romanized Typos
  'kesria': 'Kesariya',
  'kesriya': 'Kesariya',
  'kesariya': 'Kesariya',
  'chalya': 'Chaleya',
  'chaleya': 'Chaleya',
  'heerie': 'Heeriye',
  'heeriye': 'Heeriye',
  'apna bana leh': 'Apna Bana Le',
  'apna bana le': 'Apna Bana Le',
  'tum hi ho': 'Tum Hi Ho',
  'tumhi ho': 'Tum Hi Ho',
  'pasoori': 'Pasoori',
  'pasori': 'Pasoori',
  'parkha na': 'Parakha Na',
  'parkhana': 'Parakha Na',
  'parakna': 'Parakha Na',
  'parakhna': 'Parakha Na',
  'parkha': 'Parakha Na',
  'boose boose vabi': 'Bose Bose Bhabi',
  'boose boose vaby': 'Bose Bose Bhabi',
  'bose bose vabi': 'Bose Bose Bhabi',
  'bose bose bhabi': 'Bose Bose Bhabi',
  'beliver': 'Believer',
  'believer': 'Believer',
};

// Common target vocabulary for dynamic fuzzy spell correction
const VOCABULARY_TARGETS = Object.values(SPELL_DICTIONARY);

/**
 * Phonetic Music Key (adapted simplified Soundex for music names).
 */
export function getMusicPhoneticKey(str: string): string {
  const norm = normalizeString(str).toUpperCase();
  if (!norm) return '';

  const firstLetter = norm[0];
  const mapped = norm
    .slice(1)
    .replace(/[AEIOUYHW]/g, '0')
    .replace(/[BFPV]/g, '1')
    .replace(/[CGJKQSXZ]/g, '2')
    .replace(/[DT]/g, '3')
    .replace(/[L]/g, '4')
    .replace(/[MN]/g, '5')
    .replace(/[R]/g, '6')
    .replace(/0+/g, '') // remove vowels
    .replace(/(\d)\1+/g, '$1'); // collapse adjacent duplicates

  return (firstLetter + mapped).padEnd(4, '0').slice(0, 4);
}

/**
 * Corrects spelling of search queries with controlled typo tolerance.
 * Returns the corrected string, a boolean indicator whether changes occurred,
 * and a confidence level.
 */
export function correctSpelling(query: string): {
  corrected: string;
  changed: boolean;
  didYouMean: boolean;
  confidence: number;
} {
  const normalized = normalizeString(query);
  if (!normalized) {
    return { corrected: query, changed: false, didYouMean: false, confidence: 1.0 };
  }

  // 1. Direct dictionary match
  if (SPELL_DICTIONARY[normalized]) {
    const target = SPELL_DICTIONARY[normalized];
    return {
      corrected: target,
      changed: target.toLowerCase() !== query.toLowerCase().trim(),
      didYouMean: true,
      confidence: 0.98,
    };
  }

  // 2. Token-level dictionary correction
  const words = query.trim().split(/\s+/);
  let changed = false;
  const correctedWords = words.map(word => {
    const normWord = normalizeString(word);
    if (SPELL_DICTIONARY[normWord]) {
      changed = true;
      return SPELL_DICTIONARY[normWord];
    }
    return word;
  });

  if (changed) {
    return {
      corrected: correctedWords.join(' '),
      changed: true,
      didYouMean: true,
      confidence: 0.92,
    };
  }

  // 3. Dynamic fuzzy matching against known music catalog targets (Damerau-Levenshtein <= 2)
  let bestCandidate = '';
  let bestSimilarity = 0;

  for (const target of VOCABULARY_TARGETS) {
    const sim = getSimilarity(normalized, target);
    const dist = getDamerauLevenshteinDistance(normalized, normalizeString(target));
    if (dist <= 2 && sim > 0.78 && sim > bestSimilarity) {
      bestSimilarity = sim;
      bestCandidate = target;
    }
  }

  if (bestCandidate && bestCandidate.toLowerCase() !== normalized) {
    return {
      corrected: bestCandidate,
      changed: true,
      didYouMean: true,
      confidence: bestSimilarity,
    };
  }

  return {
    corrected: query,
    changed: false,
    didYouMean: false,
    confidence: 1.0,
  };
}
