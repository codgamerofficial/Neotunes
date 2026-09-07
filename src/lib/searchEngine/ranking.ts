import { ConfidenceMetrics, DEFAULT_SEARCH_WEIGHTS, MatchDetails, SearchQuery, SearchWeights } from './types';
import { cleanTitle, normalizeString } from './normalizer';
import { getSimilarity } from './typoTolerance';
import { parseSearchQuery } from './intentParser';

export interface ScorableTrack {
  id: string;
  title: string;
  artist: { name: string; id?: string };
  album?: { name?: string; releaseDate?: string; id?: string };
  popularity?: number;
  sourceType?: string;
  genres?: string[];
  durationMs?: number;
  previewUrl?: string;
}

/**
 * Calculates a comprehensive confidence score and ranking metrics for a track against a parsed query.
 */
export function calculateConfidenceScore(
  track: ScorableTrack,
  rawQuery: string,
  parsedQuery: SearchQuery | any,
  searchTerms: string[] = [],
  weights: SearchWeights = DEFAULT_SEARCH_WEIGHTS,
  sessionFavorites: Set<string> = new Set()
): ConfidenceMetrics {
  const normQuery = normalizeString(rawQuery);
  const normTitle = normalizeString(track.title);
  const cleanedTitle = cleanTitle(track.title);
  const normCleanTitle = normalizeString(cleanedTitle);
  const normArtist = normalizeString(track.artist.name);
  const normAlbum = normalizeString(track.album?.name || '');
  const normCombined = `${normTitle} ${normArtist}`.trim();
  const normCombinedRev = `${normArtist} ${normTitle}`.trim();

  // 1. Exact Match Score
  let exactScore = 0;
  if (
    normTitle === normQuery ||
    normCleanTitle === normQuery ||
    normArtist === normQuery ||
    normCombined === normQuery ||
    normCombinedRev === normQuery
  ) {
    exactScore = 100;
  } else if (
    searchTerms.some(term => {
      const normTerm = normalizeString(term);
      return (
        normTerm &&
        (normTitle === normTerm ||
          normCleanTitle === normTerm ||
          normArtist === normTerm ||
          normCombined === normTerm ||
          normCombinedRev === normTerm)
      );
    })
  ) {
    exactScore = 95;
  }

  // Resolve parsed query and entities safely (supports both SearchQuery and legacy SemanticIntent)
  const safeParsed: SearchQuery =
    (parsedQuery as SearchQuery)?.entities
      ? (parsedQuery as SearchQuery)
      : (parseSearchQuery ? parseSearchQuery(rawQuery) : {
          rawQuery,
          normalizedQuery: normQuery,
          language: 'en',
          transliteratedQueries: [],
          tokens: [],
          intent: 'general',
          entities: {},
          confidence: 1.0,
        });

  // 2. Combined Artist + Title Match Score (e.g. "Arijit Singh Channa Mereya" or "Karan Aujla Wavy")
  let combinedScore = 0;
  if (safeParsed.entities?.artist && safeParsed.entities?.track) {
    const normTargetArtist = normalizeString(safeParsed.entities.artist);
    const normTargetTrack = normalizeString(safeParsed.entities.track);
    const artistMatches = normArtist.includes(normTargetArtist) || normTargetArtist.includes(normArtist);
    const trackMatches =
      normTitle.includes(normTargetTrack) ||
      normCleanTitle.includes(normTargetTrack) ||
      normTargetTrack.includes(normCleanTitle);

    if (artistMatches && trackMatches) {
      combinedScore = weights.combinedArtistTitle;
    } else if (trackMatches) {
      combinedScore = 80;
    } else if (artistMatches) {
      combinedScore = 65;
    }
  }

  // 3. Version Match Score (e.g., "acoustic", "live", "remix", "female version")
  let versionScore = 0;
  const targetVersion = safeParsed.entities?.versionModifier;
  const titleLower = track.title.toLowerCase();

  if (targetVersion) {
    const hasVersionInTitle = titleLower.includes(targetVersion);
    if (hasVersionInTitle) {
      versionScore = weights.versionMatch;
    } else {
      // Requested specific version but this track does not have it
      versionScore = -15;
    }
  } else {
    // No specific version requested; prioritize original studio recording over covers/live
    if (titleLower.includes('cover') || titleLower.includes('tribute')) {
      versionScore = -weights.coverPenalty;
    } else if (titleLower.includes('live') || titleLower.includes('concert')) {
      versionScore = -10;
    }
  }

  // 4. Fuzzy & Substring Score
  let fuzzyScore = exactScore === 100 ? 100 : 0;
  const termsToCheck = [rawQuery, ...searchTerms].filter(Boolean);

  for (const term of termsToCheck) {
    const normTerm = normalizeString(term);
    if (!normTerm) continue;

    const titleSim = Math.max(getSimilarity(normTerm, normTitle), getSimilarity(normTerm, normCleanTitle)) * 100;
    const artistSim = getSimilarity(normTerm, normArtist) * 100;

    let partialBoost = 0;
    if (normTitle.startsWith(normTerm) || normCleanTitle.startsWith(normTerm) || normArtist.startsWith(normTerm)) {
      partialBoost = 92;
    } else if (
      normTitle.includes(normTerm) ||
      normCleanTitle.includes(normTerm) ||
      normArtist.includes(normTerm) ||
      normCombined.includes(normTerm)
    ) {
      partialBoost = 85;
    }

    // Token intersection ratio
    const termWords = normTerm.split(' ');
    const titleWords = `${normTitle} ${normCleanTitle} ${normArtist}`.split(' ');
    const commonWords = termWords.filter(w => titleWords.includes(w));
    const tokenOverlap = termWords.length > 0 ? (commonWords.length / termWords.length) * 85 : 0;

    fuzzyScore = Math.max(fuzzyScore, titleSim, artistSim, partialBoost, tokenOverlap);
  }

  // 5. Semantic / Mood Score
  let semanticScore = 0;
  if (safeParsed.intent === 'discovery_mood' && safeParsed.entities?.mood) {
    const moodWord = safeParsed.entities.mood.toLowerCase();
    if (normTitle.includes(moodWord) || normArtist.includes(moodWord) || (track.genres && track.genres.some(g => g.toLowerCase().includes(moodWord)))) {
      semanticScore = 100;
    } else {
      semanticScore = 60;
    }
  } else if (safeParsed.intent === 'discovery_era') {
    semanticScore = 75;
  }

  // 6. Popularity Score (clamped 0-100, used as subtle tiebreaker)
  const rawPop = track.popularity || 0;
  const popularityScore = Math.min(100, Math.max(0, rawPop));

  // 7. Official Catalog Score
  let officialScore = 50;
  const isOfficial =
    !track.id.startsWith('yt_') &&
    !track.id.startsWith('pod-') &&
    !track.id.startsWith('mood-');

  if (isOfficial) {
    officialScore = 90;
  } else {
    if (titleLower.includes('official audio') || titleLower.includes('official music video')) {
      officialScore = 75;
    } else if (titleLower.includes('live')) {
      officialScore = 40;
    } else if (titleLower.includes('cover')) {
      officialScore = 20;
    }
  }

  // 8. Freshness Score
  let freshnessScore = 50;
  const releaseDate = track.album?.releaseDate || '';
  const matchYear = releaseDate.match(/\b(19\d\d|20\d\d)\b/);
  if (matchYear) {
    const year = parseInt(matchYear[1], 10);
    if (parsedQuery.intent === 'discovery_era') {
      if (year < 2000) freshnessScore = 100;
      else if (year < 2010) freshnessScore = 70;
      else freshnessScore = 40;
    } else {
      if (year >= 2024) freshnessScore = 100;
      else if (year >= 2020) freshnessScore = 85;
      else if (year >= 2010) freshnessScore = 75;
      else freshnessScore = 50;
    }
  }

  // 9. Session Personalization Boost
  let personalizationScore = 0;
  if (sessionFavorites.has(normArtist)) {
    personalizationScore = weights.personalization;
  }

  // Weighted aggregation
  let totalScore = 0;

  if (exactScore >= 95) {
    // Exact match guarantees top tier ranking (never overridden by generic popularity)
    totalScore = 100 + (popularityScore * 0.05) + versionScore;
  } else if (combinedScore >= 90) {
    totalScore = 95 + (popularityScore * 0.05) + versionScore;
  } else {
    totalScore =
      (fuzzyScore * 0.45) +
      (semanticScore * 0.2) +
      (officialScore * 0.15) +
      (popularityScore * 0.1) +
      (freshnessScore * 0.1) +
      versionScore +
      personalizationScore;
  }

  const overallConfidence = Math.min(100, Math.max(0, Math.round(totalScore)));

  return {
    exactScore: Math.round(exactScore),
    fuzzyScore: Math.round(fuzzyScore),
    semanticScore: Math.round(semanticScore),
    popularityScore: Math.round(popularityScore),
    officialScore: Math.round(officialScore),
    freshnessScore: Math.round(freshnessScore),
    versionScore: Math.round(versionScore),
    overallConfidence,
  };
}

/**
 * Explains match reasoning for UI presentation ("Showing results for...", "Exact artist match", etc.)
 */
export function getMatchDetails(
  track: ScorableTrack,
  query: string,
  parsedQuery: SearchQuery
): MatchDetails {
  const normQuery = query.toLowerCase();
  const normTitle = track.title.toLowerCase();
  const normArtist = track.artist.name.toLowerCase();

  let matchedArtist = null;
  if (normArtist.includes(normQuery) || normQuery.includes(normArtist)) {
    matchedArtist = track.artist.name;
  }

  let matchedVersion = null;
  if (parsedQuery.entities.versionModifier && normTitle.includes(parsedQuery.entities.versionModifier)) {
    matchedVersion = parsedQuery.entities.versionModifier;
  }

  let matchedMood = parsedQuery.entities.mood || null;

  let matchedGenre = track.genres && track.genres.length > 0 ? track.genres[0] : null;

  let matchedLanguage = parsedQuery.language || 'English';

  const reasons: string[] = [];
  if (matchedVersion) reasons.push(`${matchedVersion} recording`);
  if (matchedArtist) reasons.push(`artist match ("${matchedArtist}")`);
  if (matchedMood) reasons.push(`mood vibes (${matchedMood})`);
  if (matchedGenre) reasons.push(`genre (${matchedGenre})`);

  const reason =
    reasons.length > 0
      ? `Matched ${reasons.join(', ')}`
      : 'Matched catalog relevance ranking';

  return {
    reason,
    matchedArtist,
    matchedMood,
    matchedGenre,
    matchedActivity: null,
    matchedLanguage,
    matchedVersion,
    matchedLyrics: null,
  };
}

/**
 * Deduplicates tracks by canonical key while maintaining distinct recordings (e.g. Acoustic vs Original).
 */
export function deduplicateTracks<T extends { title: string; artist: { name: string } }>(tracks: T[]): T[] {
  const seen = new Set<string>();
  return tracks.filter(track => {
    const titleLower = track.title.toLowerCase();
    // Preserve distinction between Acoustic/Live/Remix versions
    let versionSuffix = '';
    if (titleLower.includes('acoustic')) versionSuffix = '::acoustic';
    else if (titleLower.includes('live')) versionSuffix = '::live';
    else if (titleLower.includes('remix')) versionSuffix = '::remix';

    const key = `${normalizeString(cleanTitle(track.title))}::${normalizeString(track.artist.name)}${versionSuffix}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
