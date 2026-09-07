/**
 * World-Class Global Music Search Engine for NeoTunes.
 * Re-exports the modular query understanding, normalization, language detection,
 * transliteration, typo tolerance, intent parsing, and ranking subsystems.
 */

export * from './searchEngine/types';
export * from './searchEngine/normalizer';
export * from './searchEngine/languageDetector';
export * from './searchEngine/transliteration';
export * from './searchEngine/typoTolerance';
export * from './searchEngine/intentParser';
export * from './searchEngine/ranking';

// Backward compatibility helper for classifySemanticIntent
import { parseSearchQuery, MOOD_SYNONYMS } from './searchEngine/intentParser';

export interface SemanticIntent {
  intent: 'mood' | 'similarity' | 'collab_mix' | 'retro' | 'general';
  vibe?: string;
  targetSong?: string;
  artistName?: string;
  tags: string[];
}

export function classifySemanticIntent(query: string): SemanticIntent {
  const norm = query.toLowerCase().trim();

  // A. Check for Similarity Intent (e.g., "songs like chaleya")
  const similarityMatch = norm.match(/(?:songs\s+like|recommend\s+similar\s+to|similar\s+songs\s+to|like\s+)(.+)/i);
  if (similarityMatch && similarityMatch[1]) {
    return {
      intent: 'similarity',
      targetSong: similarityMatch[1].trim(),
      tags: ['similar', similarityMatch[1].trim()],
    };
  }

  // B. Check for Collab/Remix Mixes (e.g., "Arijit + EDM")
  if (norm.includes('+') || norm.includes('plus') || norm.includes('and edm') || norm.includes('remix')) {
    const parts = norm.split(/[\+\&]|plus|and/);
    const artist = parts[0]?.trim();
    return {
      intent: 'collab_mix',
      artistName: artist,
      tags: ['edm', 'remix', 'electronic', artist || ''],
    };
  }

  // C. Check for Retro Intent (e.g., "90s Bengali songs", "old Kishore Kumar")
  const isRetro = norm.includes('old') || norm.includes('retro') || norm.includes('classic') || /\b(90s|80s|70s|90's|80's|70's|1990|1980)\b/i.test(norm);
  if (isRetro) {
    const tags = ['retro', 'classic'];
    if (norm.includes('bengali')) tags.push('bengali');
    if (norm.includes('kishore')) tags.push('kishore kumar');
    return {
      intent: 'retro',
      tags,
    };
  }

  // D. Check for Mood/Activity Intents
  for (const moodKey of Object.keys(MOOD_SYNONYMS)) {
    if (norm.includes(moodKey)) {
      return {
        intent: 'mood',
        vibe: moodKey,
        tags: MOOD_SYNONYMS[moodKey] || [moodKey],
      };
    }
  }

  const parsed = parseSearchQuery(query);
  return {
    intent: 'general',
    vibe: undefined,
    targetSong: parsed.entities.track,
    artistName: parsed.entities.artist,
    tags: [],
  };
}
