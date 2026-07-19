// Spell correction, transliteration, synonyms, fuzzy search, and confidence scoring helpers.

// Normalize strings for matching (remove special characters, trim, lowercase)
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u0900-\u097F\u0980-\u09FF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A00-\u0A7F\u0A80-\u0AFF\u0A80-\u0DFF]/gi, '') // preserve accents, devanagari, bengali, tamil, telugu, kannada, punjabi, gujarati, etc.
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Spell Correction Dictionary
const SPELL_DICTIONARY: Record<string, string> = {
  'arjit': 'Arijit',
  'arijit': 'Arijit',
  'pritom': 'Pritam',
  'pritam': 'Pritam',
  'weeknd': 'The Weeknd',
  'the weeknd': 'The Weeknd',
  'hanumankindd': 'Hanumankind',
  'hanumankindo': 'Hanumankind',
  'cold play': 'Coldplay',
  'boose boose vabi': 'Bose Bose Bhabi',
  'boose boose vaby': 'Bose Bose Bhabi',
  'bose bose vabi': 'Bose Bose Bhabi',
  'kesria': 'Kesariya',
  'kesriya': 'Kesariya',
  'chalya': 'Chaleya',
  'heerie': 'Heeriye',
  'heeriye': 'Heeriye',
  'apna bana le': 'Apna Bana Le',
  'apna bana leh': 'Apna Bana Le',
  'tum hi ho': 'Tum Hi Ho',
  'pasoori': 'Pasoori',
  'diljit': 'Diljit Dosanjh',
  'shreya': 'Shreya Ghoshal',
  'atif': 'Atif Aslam',
  'taylor': 'Taylor Swift',
  'sheeran': 'Ed Sheeran',
  'billie': 'Billie Eilish',
};

export function correctSpelling(query: string): { corrected: string; changed: boolean } {
  const normalized = query.trim().toLowerCase();
  
  // 1. Try exact match in full-phrase dictionary
  if (SPELL_DICTIONARY[normalized]) {
    return { corrected: SPELL_DICTIONARY[normalized], changed: true };
  }

  // 2. Try word-level correction
  const words = query.split(/\s+/);
  let changed = false;
  const correctedWords = words.map(word => {
    const normWord = word.toLowerCase();
    if (SPELL_DICTIONARY[normWord]) {
      changed = true;
      return SPELL_DICTIONARY[normWord];
    }
    return word;
  });

  return {
    corrected: correctedWords.join(' '),
    changed: changed
  };
}

// 2. Transliteration Mapping
const TRANSLITERATION_MAP: Record<string, string> = {
  'bose bose bhabi': 'বসে বসে ভাবি',
  'bose bose vabi': 'বসে বসে ভাবি',
  'boose boose vabi': 'বসে বসে ভাবি',
  'apna bana le': 'अपना बना ले',
  'tum hi ho': 'तुम ही हो',
  'kesariya': 'केसरिया',
  'kesria': 'केसरिया',
  'chaleya': 'चलेया',
  'chalya': 'चलेया',
  'heeriye': 'हीरियें',
  'heerie': 'हीरियें',
  'pasoori': 'पसूरी',
  'ami je tomar': 'আমি যে তোমার',
  'galti se mistake': 'गलती से मिस्टेक',
  'kabira': 'कबीरा',
  'zaalima': 'ज़ालिमा',
};

export function transliterateQuery(query: string): string[] {
  const norm = query.toLowerCase().trim();
  const list = [query];
  
  if (TRANSLITERATION_MAP[norm]) {
    list.push(TRANSLITERATION_MAP[norm]);
  }
  
  // Look for sub-phrase matches if not matched exactly
  for (const [english, script] of Object.entries(TRANSLITERATION_MAP)) {
    if (norm !== english && norm.includes(english)) {
      list.push(query.replace(new RegExp(english, 'gi'), script));
    }
  }
  
  return Array.from(new Set(list));
}

// 3. Synonym Expansion Mapping
const SYNONYMS: Record<string, string[]> = {
  'sad': ['sad', 'emotional', 'painful', 'heartbreak', 'breakup', 'melancholic', 'biraha', 'kannu'],
  'romantic': ['romantic', 'love', 'pyaar', 'ishq', 'prem', 'mohabbat', 'valobasha'],
  'gym': ['gym', 'workout', 'fitness', 'energy', 'energetic', 'upbeat', 'high bpm', 'motivation'],
  'workout': ['gym', 'workout', 'fitness', 'energy', 'energetic', 'upbeat', 'high bpm', 'motivation'],
  'rain': ['rain', 'monsoon', 'barish', 'monsoon hits', 'acoustic', 'rainy', 'brishti'],
  'monsoon': ['rain', 'monsoon', 'barish', 'monsoon hits', 'acoustic', 'rainy', 'brishti'],
  'study': ['study', 'coding', 'focus', 'instrumental', 'lofi', 'ambient', 'concentration', 'relaxing'],
  'coding': ['study', 'coding', 'focus', 'instrumental', 'lofi', 'ambient', 'concentration', 'relaxing'],
  'focus': ['study', 'coding', 'focus', 'instrumental', 'lofi', 'ambient', 'concentration', 'relaxing'],
  'sleep': ['sleep', 'relax', 'calm', 'ambient', 'soothing', 'meditation', 'lullaby'],
  'relax': ['sleep', 'relax', 'calm', 'ambient', 'soothing', 'meditation'],
  'party': ['party', 'dance', 'club', 'upbeat', 'house', 'dj', 'remix'],
  'edm': ['edm', 'electronic', 'dance', 'house', 'techno', 'trance'],
};

export function expandSynonyms(query: string): string[] {
  const norm = query.toLowerCase();
  const matchedSynonyms = new Set<string>();
  
  for (const [key, list] of Object.entries(SYNONYMS)) {
    if (norm.includes(key)) {
      list.forEach(syn => matchedSynonyms.add(syn));
    }
  }
  
  return Array.from(matchedSynonyms);
}

// 4. Fuzzy Match Helpers (Levenshtein Distance)
export function getLevenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

export function getSimilarity(s1: string, s2: string): number {
  const str1 = normalizeString(s1);
  const str2 = normalizeString(s2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  return 1.0 - getLevenshteinDistance(str1, str2) / maxLength;
}

// 5. Semantic Intent Classifier
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
      tags: ['edm', 'remix', 'electronic', artist],
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
  for (const moodKey of Object.keys(SYNONYMS)) {
    if (norm.includes(moodKey)) {
      return {
        intent: 'mood',
        vibe: moodKey,
        tags: SYNONYMS[moodKey],
      };
    }
  }

  return {
    intent: 'general',
    tags: [],
  };
}

// 6. Scoring & Confidence Metrics
export interface ConfidenceMetrics {
  exactScore: number;
  fuzzyScore: number;
  semanticScore: number;
  popularityScore: number;
  officialScore: number;
  freshnessScore: number;
  overallConfidence: number;
}

export function calculateConfidenceScore(
  track: {
    title: string;
    artist: { name: string };
    album?: { releaseDate?: string };
    popularity?: number;
    sourceType?: string;
    id: string;
  },
  query: string,
  semanticIntent: SemanticIntent,
  searchTerms: string[]
): ConfidenceMetrics {
  const normTitle = normalizeString(track.title);
  const normArtist = normalizeString(track.artist.name);

  // A. Exact Score: 100 if the query is an exact match for title or artist
  let exactScore = 0;
  if (searchTerms.some(term => {
    const normTerm = normalizeString(term);
    return normTitle === normTerm || normArtist === normTerm;
  })) {
    exactScore = 100;
  }

  // B. Fuzzy Score: similarity of query to title or artist
  let fuzzyScore = 0;
  searchTerms.forEach(term => {
    const normTerm = normalizeString(term);
    const titleSim = getSimilarity(normTerm, normTitle) * 100;
    const artistSim = getSimilarity(normTerm, normArtist) * 100;
    
    // Partial substring boosts
    let partialBoost = 0;
    if (normTitle.startsWith(normTerm) || normArtist.startsWith(normTerm)) {
      partialBoost = 90;
    } else if (normTitle.includes(normTerm) || normArtist.includes(normTerm)) {
      partialBoost = 80;
    }

    // Token intersection ratio
    const termWords = normTerm.split(' ');
    const titleWords = normTitle.split(' ');
    const commonWords = termWords.filter(w => titleWords.includes(w));
    const tokenOverlap = termWords.length > 0 ? (commonWords.length / termWords.length) * 85 : 0;

    fuzzyScore = Math.max(fuzzyScore, titleSim, artistSim, partialBoost, tokenOverlap);
  });
  fuzzyScore = Math.round(fuzzyScore);

  // C. Semantic Score: matches vibe, tags, or synonyms
  let semanticScore = 0;
  if (semanticIntent.intent !== 'general') {
    const hasVibeMatch = semanticIntent.tags.some(tag => {
      const normTag = normalizeString(tag);
      return normTitle.includes(normTag) || normArtist.includes(normTag);
    });

    if (hasVibeMatch) {
      semanticScore = 100;
    } else if (semanticIntent.intent === 'collab_mix') {
      const artistMatch = semanticIntent.artistName ? normArtist.includes(normalizeString(semanticIntent.artistName)) : false;
      const edmMatch = normTitle.includes('edm') || normTitle.includes('remix') || normTitle.includes('mix') || normTitle.includes('electronic');
      if (artistMatch && edmMatch) {
        semanticScore = 100;
      } else if (artistMatch || edmMatch) {
        semanticScore = 50;
      }
    } else if (semanticIntent.intent === 'retro') {
      // Checked via freshness or kishore match
      const kishoreMatch = semanticIntent.tags.includes('kishore kumar') && normArtist.includes('kishore');
      if (kishoreMatch) {
        semanticScore = 100;
      }
    }
  }

  // D. Popularity Score: raw popularity clamped 0-100
  const popularityScore = Math.min(100, Math.max(0, track.popularity || 0));

  // E. Official Score
  let officialScore = 50; // default
  const isOfficialCatalog = !track.id.startsWith('yt_') && !track.id.startsWith('pod-') && !track.id.startsWith('mood-') && !track.id.startsWith('dz_yt_');
  
  if (isOfficialCatalog) {
    officialScore = 90; // Official Catalog Song
  } else {
    // If it's a YouTube video, parse title context
    if (normTitle.includes('official music video') || normTitle.includes('official video')) {
      officialScore = 60; // Official Music Video
    } else if (normTitle.includes('live') || normTitle.includes('concert') || normTitle.includes('performance') || normTitle.includes('session')) {
      officialScore = 40; // Live Performance
    } else if (normTitle.includes('podcast') || normTitle.includes('episode')) {
      officialScore = 30; // Podcast
    } else if (normTitle.includes('cover') || normTitle.includes('tribute') || normTitle.includes('remix') || normTitle.includes('mashup')) {
      officialScore = 20; // Cover / Remix
    } else if (normTitle.includes('shorts') || normTitle.includes('tiktok')) {
      officialScore = 10; // Short
    } else if (normTitle.includes('fan') || normTitle.includes('reupload') || normTitle.includes('upload')) {
      officialScore = 5;  // Fan upload
    }
  }

  // F. Freshness Score
  let freshnessScore = 50;
  const releaseDate = track.album?.releaseDate || '';
  const matchYear = releaseDate.match(/\b(19\d\d|20\d\d)\b/);
  if (matchYear) {
    const year = parseInt(matchYear[1], 10);
    if (semanticIntent.intent === 'retro') {
      // Invert freshness: older songs get higher score
      if (year < 2000) {
        freshnessScore = 100;
      } else if (year < 2010) {
        freshnessScore = 70;
      } else {
        freshnessScore = 30;
      }
    } else {
      if (year >= 2024) {
        freshnessScore = 100;
      } else if (year >= 2020) {
        freshnessScore = 90;
      } else if (year >= 2010) {
        freshnessScore = 80;
      } else if (year >= 2000) {
        freshnessScore = 70;
      } else {
        freshnessScore = 50;
      }
    }
  }

  // G. Calculate Overall Confidence
  // overallConfidence = (exactScore * 0.3) + (fuzzyScore * 0.3) + (semanticScore * 0.15) + (popularityScore * 0.1) + (officialScore * 0.15)
  let overallConfidence =
    exactScore * 0.3 +
    fuzzyScore * 0.3 +
    semanticScore * 0.15 +
    popularityScore * 0.1 +
    officialScore * 0.15;

  // Add retro boost if appropriate
  if (semanticIntent.intent === 'retro' && releaseDate && parseInt(releaseDate.substring(0,4)) < 2000) {
    overallConfidence += 10;
  }

  overallConfidence = Math.min(100, Math.max(0, Math.round(overallConfidence)));

  return {
    exactScore: Math.round(exactScore),
    fuzzyScore: Math.round(fuzzyScore),
    semanticScore: Math.round(semanticScore),
    popularityScore: Math.round(popularityScore),
    officialScore: Math.round(officialScore),
    freshnessScore: Math.round(freshnessScore),
    overallConfidence
  };
}

// 7. Deduplication function
export function deduplicateTracks<T extends { title: string; artist: { name: string } }>(tracks: T[]): T[] {
  const seen = new Set<string>();
  return tracks.filter(track => {
    const key = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export interface MatchDetails {
  reason: string;
  matchedArtist: string | null;
  matchedMood: string | null;
  matchedGenre: string | null;
  matchedActivity: string | null;
  matchedLanguage: string | null;
  matchedLyrics: string | null;
}

export function getMatchDetails(
  track: {
    title: string;
    artist: { name: string };
    genres?: string[];
  },
  query: string,
  semanticIntent: SemanticIntent
): MatchDetails {
  const normQuery = query.toLowerCase();
  const normTitle = track.title.toLowerCase();
  const normArtist = track.artist.name.toLowerCase();
  
  let matchedArtist = null;
  if (normArtist.includes(normQuery) || normQuery.includes(normArtist)) {
    matchedArtist = track.artist.name;
  }
  
  let matchedMood = null;
  if (semanticIntent.intent === 'mood' && semanticIntent.vibe) {
    matchedMood = semanticIntent.vibe;
  } else if (normTitle.includes('sad') || normTitle.includes('pain') || normTitle.includes('broken')) {
    matchedMood = 'sad';
  } else if (normTitle.includes('love') || normTitle.includes('romantic') || normTitle.includes('dil')) {
    matchedMood = 'romantic';
  }
  
  let matchedGenre = null;
  if (track.genres && track.genres.length > 0) {
    matchedGenre = track.genres[0];
  } else if (normTitle.includes('lofi') || normTitle.includes('chill')) {
    matchedGenre = 'Lo-Fi';
  } else if (normTitle.includes('remix') || normTitle.includes('edm') || normTitle.includes('club')) {
    matchedGenre = 'Electronic / EDM';
  } else if (normTitle.includes('bengali') || normArtist.includes('arijit') || normArtist.includes('shreya')) {
    matchedGenre = 'Bollywood / Indian Pop';
  } else {
    matchedGenre = 'Pop';
  }

  let matchedActivity = null;
  if (normQuery.includes('gym') || normQuery.includes('workout') || normTitle.includes('workout') || normTitle.includes('gym')) {
    matchedActivity = 'Workout';
  } else if (normQuery.includes('coding') || normQuery.includes('code') || normQuery.includes('study')) {
    matchedActivity = 'Focus / Coding';
  } else if (normQuery.includes('sleep') || normQuery.includes('night') || normTitle.includes('sleep') || normTitle.includes('night')) {
    matchedActivity = 'Sleeping';
  }
  
  let matchedLanguage = 'English';
  if (normTitle.includes('bengali') || normArtist.includes('arijit') || normArtist.includes('pritam') || normArtist.includes('shreya') || /[\u0980-\u09FF]/.test(track.title)) {
    matchedLanguage = 'Bengali';
  } else if (normTitle.includes('hindi') || /[\u0900-\u097F]/.test(track.title) || normTitle.includes('tum') || normTitle.includes('apna') || normTitle.includes('kesariya')) {
    matchedLanguage = 'Hindi';
  }

  // Generate a mock lyric snippet related to the track or query
  let matchedLyrics = null;
  if (normArtist.includes('arijit') && normTitle.includes('kesariya')) {
    matchedLyrics = "...Kesariya tera ishq hai piya, rang jaaun jo main haath lagaaun...";
  } else if (normArtist.includes('arijit') && normTitle.includes('tum hi ho')) {
    matchedLyrics = "...Kyuki tum hi ho, ab tum hi ho, zindagi ab tum hi ho...";
  } else if (normTitle.includes('bose bose')) {
    matchedLyrics = "...Bose bose vabi ami ki pabo tor mon, tui chara jibon amar shob e toh eka...";
  } else if (normTitle.includes('bandhu')) {
    matchedLyrics = "...Bandhu tui koi geli re, tor bine mon je amar kande re...";
  } else {
    // Generate a default snippet that sounds like song lyrics based on the query or title
    matchedLyrics = `...Vibing to ${track.title} under search filters...`;
  }

  const reasons = [];
  if (matchedArtist) reasons.push(`artist match ("${matchedArtist}")`);
  if (matchedMood) reasons.push(`mood vibes identify as "${matchedMood}"`);
  if (matchedGenre) reasons.push(`genre classified as "${matchedGenre}"`);
  if (matchedLanguage) reasons.push(`language detected is "${matchedLanguage}"`);
  
  const reason = reasons.length > 0 
    ? `Matched because ${reasons.join(', ')}.`
    : `Matched metadata attributes with overall confidence score.`;

  return {
    reason,
    matchedArtist,
    matchedMood,
    matchedGenre,
    matchedActivity,
    matchedLanguage,
    matchedLyrics
  };
}
