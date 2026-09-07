import { describe, it, expect } from 'vitest';
import {
  normalizeString,
  cleanTitle,
  cleanSearchNoise,
  detectLanguage,
  transliterateQuery,
  correctSpelling,
  getDamerauLevenshteinDistance,
  getSimilarity,
  parseSearchQuery,
  calculateConfidenceScore,
  deduplicateTracks,
} from '../lib/searchEngine';

describe('Global Music Search Engine — Query Understanding & Normalization', () => {
  it('should normalize strings preserving non-Latin Unicode scripts and stripping Latin accents', () => {
    // Latin diacritics
    expect(normalizeString('Beyoncé')).toBe('beyonce');
    expect(normalizeString('Motörhead')).toBe('motorhead');
    expect(normalizeString('Rosalía')).toBe('rosalia');

    // Bengali script preserved
    expect(normalizeString('তুমি রবে নীরবে')).toBe('তুমি রবে নীরবে');
    expect(normalizeString('বসে বসে ভাবি!')).toBe('বসে বসে ভাবি');

    // Hindi / Devanagari script preserved
    expect(normalizeString('केसरिया तेरा इश्क')).toBe('केसरिया तेरा इश्क');
    expect(normalizeString('तुम ही हो...')).toBe('तुम ही हो');

    // Punjabi / Gurmukhi script preserved
    expect(normalizeString('ਕਰਨ ਔਜਲਾ')).toBe('ਕਰਨ ਔਜਲਾ');

    // Tamil, Arabic, Japanese preserved
    expect(normalizeString('காதல்')).toBe('காதல்');
    expect(normalizeString('كن فيكون')).toBe('كن فيكون');
    expect(normalizeString('夜に駆ける')).toBe('夜に駆ける');
  });

  it('should clean search noise without removing version tags', () => {
    expect(cleanSearchNoise('Kesariya official audio 4k')).toBe('Kesariya');
    expect(cleanSearchNoise('Wavy full song lyrics')).toBe('Wavy');
    expect(cleanTitle('Perfect (Official Music Video)')).toBe('Perfect');
  });

  it('should accurately detect global music languages and scripts', () => {
    expect(detectLanguage('তুমি রবে নীরবে').language).toBe('bn');
    expect(detectLanguage('केसरिया').language).toBe('hi');
    expect(detectLanguage('ਕਰਨ ਔਜਲਾ').language).toBe('pa');
    expect(detectLanguage('كن فيكون').language).toBe('ar');
    expect(detectLanguage('夜に駆ける').language).toBe('ja');

    // Romanized language hints
    expect(detectLanguage('tumi robe nirobe bangla rabindra').language).toBe('bn');
    expect(detectLanguage('arijit singh bollywood romantic').language).toBe('hi');
    expect(detectLanguage('diljit dosanjh punjabi bhangra').language).toBe('pa');
    expect(detectLanguage('bad bunny reggaeton').language).toBe('es');
  });
});

describe('Global Music Search Engine — Transliteration & Typo Tolerance', () => {
  it('should transliterate Romanized Indic queries into native script and vice versa', () => {
    const tumiRobe = transliterateQuery('tumi robe nirobe');
    expect(tumiRobe).toContain('তুমি রবে নীরবে');

    const amiJeTomar = transliterateQuery('ami je tomar');
    expect(amiJeTomar).toContain('আমি যে তোমার');

    const kesariya = transliterateQuery('kesariya');
    expect(kesariya).toContain('केसरिया');

    const tumHiHo = transliterateQuery('tum hi ho');
    expect(tumHiHo).toContain('तुम ही हो');

    const teraBanJaunga = transliterateQuery('tera ban jaunga');
    expect(teraBanJaunga.some(v => v.includes('तेरा बन'))).toBe(true);

    // Reverse transliteration
    const bengaliReverse = transliterateQuery('তুমি রবে নীরবে');
    expect(bengaliReverse).toContain('tumi robe nirobe');
  });

  it('should correct misspellings and common typos with Damerau-Levenshtein transposition tolerance', () => {
    // Adjacent transposition
    expect(getDamerauLevenshteinDistance('shakria', 'shakira')).toBe(1);
    expect(correctSpelling('shakria').corrected).toBe('Shakira');

    // Typo in artist names
    expect(correctSpelling('arjit singh').corrected).toBe('Arijit Singh');
    expect(correctSpelling('karan aujlaa').corrected).toBe('Karan Aujla');
    expect(correctSpelling('weeknd').corrected).toBe('The Weeknd');
    expect(correctSpelling('cold play').corrected).toBe('Coldplay');
    expect(correctSpelling('taylor swif').corrected).toBe('Taylor Swift');
    expect(correctSpelling('ed sheran').corrected).toBe('Ed Sheeran');
    expect(correctSpelling('billi eilish').corrected).toBe('Billie Eilish');

    // Typo in song names
    expect(correctSpelling('kesria').corrected).toBe('Kesariya');
    expect(correctSpelling('chalya').corrected).toBe('Chaleya');
    expect(correctSpelling('heerie').corrected).toBe('Heeriye');
    expect(correctSpelling('pasori').corrected).toBe('Pasoori');
  });
});

describe('Global Music Search Engine — Intent & Version Parsing', () => {
  it('should parse version modifiers such as acoustic, live, remix, and female version', () => {
    const q1 = parseSearchQuery('tum hi ho acoustic');
    expect(q1.entities.versionModifier).toBe('acoustic');
    expect(q1.entities.track).toBe('tum hi ho');

    const q2 = parseSearchQuery('tere vaaste female version');
    expect(q2.entities.versionModifier).toBe('female version');
    expect(q2.entities.track).toBe('tere vaaste');

    const q3 = parseSearchQuery('perfect remix');
    expect(q3.entities.versionModifier).toBe('remix');
    expect(q3.entities.track).toBe('perfect');
  });

  it('should separate artist and track in combined queries', () => {
    const combined1 = parseSearchQuery('Arijit Singh Channa Mereya');
    expect(combined1.intent).toBe('track_artist');
    expect(combined1.entities.artist).toBe('arijit singh');
    expect(combined1.entities.track).toBe('channa mereya');

    const combined2 = parseSearchQuery('Karan Aujla Wavy');
    expect(combined2.intent).toBe('track_artist');
    expect(combined2.entities.artist).toBe('karan aujla');
    expect(combined2.entities.track).toBe('wavy');

    const combined3 = parseSearchQuery('Shakira Waka Waka');
    expect(combined3.intent).toBe('track_artist');
    expect(combined3.entities.artist).toBe('shakira');
    expect(combined3.entities.track).toBe('waka waka');
  });

  it('should extract mood, era, and playlist intents', () => {
    const moodQuery = parseSearchQuery('Punjabi workout songs');
    expect(moodQuery.intent).toBe('discovery_mood');
    expect(moodQuery.entities.mood).toBe('workout');

    const eraQuery = parseSearchQuery('90s Bengali songs');
    expect(eraQuery.intent).toBe('discovery_era');
    expect(eraQuery.entities.era).toBe('90s');
  });
});

describe('Global Music Search Engine — Exact Match Priority & Ranking', () => {
  it('should guarantee exact match outranks popular but non-exact tracks', () => {
    const query = 'Kesariya';
    const parsed = parseSearchQuery(query);

    const exactTrack = {
      id: 'spot_1',
      title: 'Kesariya',
      artist: { name: 'Arijit Singh' },
      popularity: 60,
    };

    const popularUnrelated = {
      id: 'spot_2',
      title: 'Something With Kesariya in Title Reprise Dance Edition',
      artist: { name: 'Random Artist' },
      popularity: 100,
    };

    const exactScore = calculateConfidenceScore(exactTrack, query, parsed);
    const popularScore = calculateConfidenceScore(popularUnrelated, query, parsed);

    expect(exactScore.overallConfidence).toBeGreaterThan(popularScore.overallConfidence);
    expect(exactScore.exactScore).toBe(100);
    expect(popularScore.exactScore).toBe(0);
  });

  it('should prioritize requested acoustic version over original when version modifier is specified', () => {
    const query = 'tum hi ho acoustic';
    const parsed = parseSearchQuery(query);

    const acousticVersion = {
      id: 'track_acoustic',
      title: 'Tum Hi Ho (Acoustic Version)',
      artist: { name: 'Arijit Singh' },
      popularity: 70,
    };

    const originalStudio = {
      id: 'track_original',
      title: 'Tum Hi Ho (Original Motion Picture Soundtrack)',
      artist: { name: 'Arijit Singh' },
      popularity: 90,
    };

    const acousticScore = calculateConfidenceScore(acousticVersion, query, parsed);
    const originalScore = calculateConfidenceScore(originalStudio, query, parsed);

    expect(acousticScore.versionScore).toBeGreaterThan(originalScore.versionScore);
  });

  it('should deduplicate tracks while preserving distinct recordings (Acoustic vs Original)', () => {
    const tracks = [
      { id: '1', title: 'Perfect (Official Video)', artist: { name: 'Ed Sheeran' } },
      { id: '2', title: 'Perfect', artist: { name: 'Ed Sheeran' } },
      { id: '3', title: 'Perfect (Acoustic)', artist: { name: 'Ed Sheeran' } },
    ];

    const deduplicated = deduplicateTracks(tracks);
    expect(deduplicated.length).toBe(2);
    // Preserves original studio and acoustic version separately
    expect(deduplicated.some(t => t.title.includes('Acoustic'))).toBe(true);
  });
});
