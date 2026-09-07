import { QueryEntities, QueryIntent, SearchQuery } from './types';
import { normalizeString } from './normalizer';
import { detectLanguage } from './languageDetector';
import { transliterateQuery } from './transliteration';

// Known Version Modifiers
export const VERSION_MODIFIERS: Record<string, string> = {
  'acoustic': 'acoustic',
  'unplugged': 'acoustic',
  'live': 'live',
  'concert': 'live',
  'live performance': 'live',
  'remix': 'remix',
  'club mix': 'remix',
  'instrumental': 'instrumental',
  'karaoke': 'instrumental',
  'slowed': 'slowed',
  'slowed reverb': 'slowed',
  'reverb': 'slowed',
  'sped up': 'sped up',
  'speed up': 'sped up',
  'nightcore': 'sped up',
  'cover': 'cover',
  'tribute': 'cover',
  'female version': 'female version',
  'male version': 'male version',
  'lofi': 'lofi',
  'lo-fi': 'lofi',
  'chill': 'lofi',
  'original': 'original',
  'official': 'original',
  'remastered': 'remastered',
  'radio edit': 'radio edit',
  'extended': 'extended',
};

// Known Moods & Synonyms
export const MOOD_SYNONYMS: Record<string, string[]> = {
  'sad': ['sad', 'emotional', 'painful', 'heartbreak', 'breakup', 'melancholic', 'biraha', 'kannu', 'dard'],
  'romantic': ['romantic', 'love', 'pyaar', 'ishq', 'prem', 'mohabbat', 'valobasha', 'dil'],
  'workout': ['gym', 'workout', 'fitness', 'energy', 'energetic', 'upbeat', 'high bpm', 'motivation', 'hype'],
  'gym': ['gym', 'workout', 'fitness', 'energy', 'energetic', 'upbeat', 'high bpm', 'motivation', 'hype'],
  'rain': ['rain', 'monsoon', 'barish', 'monsoon hits', 'acoustic', 'rainy', 'brishti'],
  'study': ['study', 'coding', 'focus', 'instrumental', 'lofi', 'ambient', 'concentration', 'relaxing'],
  'focus': ['study', 'coding', 'focus', 'instrumental', 'lofi', 'ambient', 'concentration', 'relaxing'],
  'sleep': ['sleep', 'relax', 'calm', 'ambient', 'soothing', 'meditation', 'lullaby', 'peaceful'],
  'party': ['party', 'dance', 'club', 'upbeat', 'house', 'dj', 'remix', 'bhangra'],
};

// Known Global & Regional Artists for Entity Separation
export const KNOWN_ARTISTS = [
  'arijit singh', 'arijit', 'karan aujla', 'diljit dosanjh', 'diljit',
  'shakira', 'the weeknd', 'weeknd', 'taylor swift', 'coldplay',
  'ed sheeran', 'billie eilish', 'bruno mars', 'shreya ghoshal',
  'pritam', 'atif aslam', 'hanumankind', 'anupam roy', 'kishore kumar',
  'bad bunny', 'dua lipa', 'sidhu moosewala', 'ap dhillon', 'shubh',
  'ar rahman', 'anirudh', 'nachiketa', 'hemanta mukherjee', 'manna dey',
  'imagine dragons', 'drake', 'eminem', 'post malone', 'travis scott',
  'justin bieber', 'selena gomez', 'ariana grande', 'bts', 'blackpink'
];

/**
 * Expands query terms with relevant mood and activity synonyms.
 */
export function expandSynonyms(query: string): string[] {
  const norm = query.toLowerCase();
  const matched = new Set<string>();

  for (const [key, list] of Object.entries(MOOD_SYNONYMS)) {
    if (norm.includes(key)) {
      list.forEach(syn => matched.add(syn));
    }
  }

  return Array.from(matched);
}

/**
 * Parses raw search query into structured SearchQuery with entities, intent, and filters.
 */
export function parseSearchQuery(rawQuery: string): SearchQuery {
  const norm = normalizeString(rawQuery);
  const detectedLang = detectLanguage(rawQuery);
  const transliteratedQueries = transliterateQuery(rawQuery);
  const tokens = norm.split(/\s+/).filter(Boolean);

  const entities: QueryEntities = {};
  let intent: QueryIntent = 'general';
  let cleanQueryForEntity = norm;

  // 1. Version Modifier Detection
  for (const [modifierKey, canonicalModifier] of Object.entries(VERSION_MODIFIERS)) {
    const regex = new RegExp(`\\b${modifierKey}\\b`, 'i');
    if (regex.test(cleanQueryForEntity)) {
      entities.versionModifier = canonicalModifier;
      cleanQueryForEntity = cleanQueryForEntity.replace(regex, '').trim();
      break;
    }
  }

  // 2. Year & Era Detection
  const yearMatch = cleanQueryForEntity.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    entities.year = parseInt(yearMatch[1], 10);
    cleanQueryForEntity = cleanQueryForEntity.replace(yearMatch[0], '').trim();
  }

  const eraMatch = cleanQueryForEntity.match(/\b(90s|80s|70s|2000s|2010s|retro|classic|old)\b/i);
  if (eraMatch) {
    entities.era = eraMatch[1].toLowerCase();
    intent = 'discovery_era';
    cleanQueryForEntity = cleanQueryForEntity.replace(eraMatch[0], '').trim();
  }

  // 3. Mood / Vibe / Playlist Detection
  for (const [moodKey] of Object.entries(MOOD_SYNONYMS)) {
    const moodRegex = new RegExp(`\\b${moodKey}\\b`, 'i');
    if (moodRegex.test(cleanQueryForEntity)) {
      entities.mood = moodKey;
      if (intent === 'general') intent = 'discovery_mood';
      break;
    }
  }

  // 4. Playlist intent check
  if (/\b(playlist|songs|top 50|hits|best of|tracks|collection)\b/i.test(cleanQueryForEntity)) {
    if (intent === 'general') intent = 'playlist';
    cleanQueryForEntity = cleanQueryForEntity
      .replace(/\b(playlist|songs|top 50|hits|best of|tracks|collection|song)\b/gi, '')
      .trim();
  }

  // 5. Artist + Track Entity Recognition
  for (const artist of KNOWN_ARTISTS) {
    if (cleanQueryForEntity.includes(artist)) {
      entities.artist = artist;
      const leftover = cleanQueryForEntity.replace(artist, '').trim();
      if (leftover.length > 0) {
        entities.track = leftover;
        intent = 'track_artist';
      } else {
        intent = 'artist';
      }
      break;
    }
  }

  // If no known artist detected, determine whether single track or general
  if (!entities.artist) {
    if (cleanQueryForEntity.length > 0) {
      if (entities.versionModifier) {
        entities.track = cleanQueryForEntity;
        intent = 'version';
      } else if (intent === 'general') {
        intent = 'track';
        entities.track = cleanQueryForEntity;
      }
    }
  }

  return {
    rawQuery,
    normalizedQuery: norm,
    language: detectedLang.language,
    transliteratedQueries,
    tokens,
    intent,
    entities,
    filters: {
      version: entities.versionModifier,
      language: detectedLang.language,
      genre: entities.genre,
      year: entities.year,
    },
    confidence: 0.95,
  };
}

/**
 * Backward compatibility parser helper
 */
export function parseQueryTokens(query: string) {
  const parsed = parseSearchQuery(query);
  return {
    original: query,
    artistName: parsed.entities.artist,
    songTitle: parsed.entities.track,
    cleanTokens: parsed.tokens,
  };
}
