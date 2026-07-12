import { describe, it, expect } from 'vitest';

// Mock score calculation matching the search route algorithm
function scoreTrack(
  track: { title: string; artist: string; popularity: number }, 
  query: string
): number {
  let score = track.popularity * 0.15;
  const normalizedQuery = query.toLowerCase().trim();
  const title = track.title.toLowerCase().trim();
  const artist = track.artist.toLowerCase().trim();

  if (title === normalizedQuery) {
    score += 100;
  } else if (title.startsWith(normalizedQuery)) {
    score += 50;
  } else if (title.includes(normalizedQuery)) {
    score += 20;
  }

  if (artist === normalizedQuery) {
    score += 80;
  } else if (artist.startsWith(normalizedQuery)) {
    score += 40;
  }

  return score;
}

describe('Search Engine Ranking', () => {
  it('should rank exact title match higher than popular partial match', () => {
    const query = 'Blinding Lights';
    
    const exactMatch = {
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      popularity: 90,
    };
    
    const partialMatch = {
      title: 'Blinding Lights - Instrumental',
      artist: 'The Weeknd',
      popularity: 100,
    };

    const exactScore = scoreTrack(exactMatch, query);
    const partialScore = scoreTrack(partialMatch, query);

    expect(exactScore).toBeGreaterThan(partialScore);
  });

  it('should boost exact artist match', () => {
    const query = 'Drake';
    
    const artistMatch = {
      title: 'One Dance',
      artist: 'Drake',
      popularity: 85,
    };

    const unrelatedTrack = {
      title: 'Drake Passage',
      artist: 'Ocean Sounds',
      popularity: 50,
    };

    const matchScore = scoreTrack(artistMatch, query);
    const unrelatedScore = scoreTrack(unrelatedTrack, query);

    expect(matchScore).toBeGreaterThan(unrelatedScore);
  });
});
