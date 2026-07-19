import { describe, it, expect } from 'vitest';
import {
  correctSpelling,
  transliterateQuery,
  classifySemanticIntent,
  calculateConfidenceScore,
  normalizeString,
  getSimilarity,
} from '../lib/searchEngine';

describe('Search Engine Core Utilities', () => {
  it('should correct misspelled queries', () => {
    expect(correctSpelling('arjit').corrected).toBe('Arijit');
    expect(correctSpelling('boose boose vabi').corrected).toBe('Bose Bose Bhabi');
    expect(correctSpelling('hanumankindd').corrected).toBe('Hanumankind');
    expect(correctSpelling('cold play').corrected).toBe('Coldplay');
  });

  it('should support transliteration mappings', () => {
    const boseBose = transliterateQuery('Bose Bose Bhabi');
    expect(boseBose).toContain('বসে বসে ভাবি');

    const tumHiHo = transliterateQuery('Tum Hi Ho');
    expect(tumHiHo).toContain('तुम ही हो');
  });

  it('should classify semantic query intents', () => {
    const gymIntent = classifySemanticIntent('gym music');
    expect(gymIntent.intent).toBe('mood');
    expect(gymIntent.vibe).toBe('gym');

    const similarIntent = classifySemanticIntent('songs like chaleya');
    expect(similarIntent.intent).toBe('similarity');
    expect(similarIntent.targetSong).toBe('chaleya');

    const collabIntent = classifySemanticIntent('Arijit + EDM');
    expect(collabIntent.intent).toBe('collab_mix');
    expect(collabIntent.artistName).toBe('arijit');
  });

  it('should calculate confidence scores correctly', () => {
    const query = 'Kesariya';
    const semanticIntent = classifySemanticIntent(query);
    const searchTerms = transliterateQuery(query);

    const exactMatch = {
      id: 'track123',
      title: 'Kesariya',
      artist: { name: 'Arijit Singh' },
      popularity: 80,
      album: { releaseDate: '2022' }
    };

    const coverMatch = {
      id: 'yt_cover123',
      title: 'Kesariya Cover',
      artist: { name: 'Acoustic Cover Artist' },
      popularity: 30,
      album: { releaseDate: '2023' }
    };

    const exactScores = calculateConfidenceScore(exactMatch, query, semanticIntent, searchTerms);
    const coverScores = calculateConfidenceScore(coverMatch, query, semanticIntent, searchTerms);

    expect(exactScores.overallConfidence).toBeGreaterThan(coverScores.overallConfidence);
    expect(exactScores.exactScore).toBe(100);
    expect(coverScores.exactScore).toBe(0);
    expect(coverScores.officialScore).toBe(20); // Cover score is lower
  });
});
