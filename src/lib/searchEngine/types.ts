export type QueryIntent =
  | 'artist'
  | 'track'
  | 'track_artist'
  | 'album'
  | 'playlist'
  | 'discovery_mood'
  | 'discovery_genre'
  | 'discovery_era'
  | 'version'
  | 'general';

export interface QueryEntities {
  artist?: string;
  track?: string;
  album?: string;
  year?: number;
  era?: string;
  mood?: string;
  genre?: string;
  language?: string;
  versionModifier?: string;
}

export interface SearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  language: string;
  transliteratedQueries: string[];
  tokens: string[];
  intent: QueryIntent;
  entities: QueryEntities;
  filters?: {
    version?: string;
    language?: string;
    genre?: string;
    year?: number;
  };
  confidence: number;
}

export interface SearchWeights {
  exactTitle: number;
  exactArtist: number;
  exactAlbum: number;
  combinedArtistTitle: number;
  phraseMatch: number;
  tokenMatch: number;
  transliterationMatch: number;
  fuzzyMatch: number;
  versionMatch: number;
  languageMatch: number;
  popularityTieBreaker: number;
  officialCatalog: number;
  freshness: number;
  personalization: number;
  duplicatePenalty: number;
  excessiveFuzzyPenalty: number;
  coverPenalty: number;
}

export const DEFAULT_SEARCH_WEIGHTS: SearchWeights = {
  exactTitle: 100,
  exactArtist: 95,
  exactAlbum: 85,
  combinedArtistTitle: 98,
  phraseMatch: 80,
  tokenMatch: 70,
  transliterationMatch: 90,
  fuzzyMatch: 65,
  versionMatch: 88,
  languageMatch: 20,
  popularityTieBreaker: 15,
  officialCatalog: 30,
  freshness: 10,
  personalization: 15,
  duplicatePenalty: 30,
  excessiveFuzzyPenalty: 40,
  coverPenalty: 25,
};

export interface ConfidenceMetrics {
  exactScore: number;
  fuzzyScore: number;
  semanticScore: number;
  popularityScore: number;
  officialScore: number;
  freshnessScore: number;
  versionScore: number;
  overallConfidence: number;
}

export interface MatchDetails {
  reason: string;
  matchedArtist: string | null;
  matchedMood: string | null;
  matchedGenre: string | null;
  matchedActivity: string | null;
  matchedLanguage: string | null;
  matchedVersion: string | null;
  matchedLyrics: string | null;
}
