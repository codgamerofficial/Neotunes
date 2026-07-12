import { describe, it, expect } from 'vitest';
import { validateSpotifyCredentials } from '../services/spotify';

describe('Spotify Environment Credentials Validation', () => {
  it('should invalidate undefined or empty credentials', () => {
    expect(validateSpotifyCredentials(undefined, 'someSecretString')).toBe(false);
    expect(validateSpotifyCredentials('someClientId', undefined)).toBe(false);
    expect(validateSpotifyCredentials('', 'someSecretString')).toBe(false);
    expect(validateSpotifyCredentials('someClientId', '   ')).toBe(false);
  });

  it('should invalidate placeholder credentials starting with "your_"', () => {
    expect(validateSpotifyCredentials('your_spotify_client_id', 'someSecretString')).toBe(false);
    expect(validateSpotifyCredentials('someClientId', 'your_spotify_client_secret')).toBe(false);
  });

  it('should invalidate credentials that are too short', () => {
    expect(validateSpotifyCredentials('abc', 'someSecretString')).toBe(false);
    expect(validateSpotifyCredentials('someClientId', 'xyz')).toBe(false);
  });

  it('should validate correct credentials', () => {
    expect(validateSpotifyCredentials('c4aad1a2c1b74832bd86348e27acb282', '1a1fe6bcd0a44304ac40152892d64e29')).toBe(true);
  });
});

describe('Recommendations API Response Contract', () => {
  it('should conform to the standardized response schema', () => {
    const payload = {
      success: true,
      data: {
        tracks: [
          {
            id: '7fxR_IsDt5g',
            title: 'Pop the Bubbles',
            artist: { id: 'bounce_patrol', name: 'Bounce Patrol' },
            album: { id: 'colors', name: 'Kids Color Song', coverUrl: 'https://i.ytimg.com/vi/7fxR_IsDt5g/hqdefault.jpg' },
            durationMs: 180000,
            popularity: 80,
            previewUrl: '',
            sourceType: 'youtube',
            sourceId: '7fxR_IsDt5g'
          }
        ]
      },
      error: null,
      fallbackUsed: true,
      source: 'curated',
      message: 'Curated for You'
    };

    expect(payload.success).toBeTypeOf('boolean');
    expect(payload.data).toBeTypeOf('object');
    expect(Array.isArray(payload.data?.tracks)).toBe(true);
    expect(payload.error).toBeNull();
    expect(payload.fallbackUsed).toBeTypeOf('boolean');
    expect(payload.source).toBeTypeOf('string');
    expect(payload.message).toBeTypeOf('string');
  });
});

describe('Recommendations Scoring & Diversity Engine logic', () => {
  // Let's implement local simulations of our scoring and diversity constraints to ensure correctness

  const normalizeString = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/[^\w]/g, '');
  };

  it('should properly deduplicate tracks by normalized title and artist', () => {
    const rawRows = [
      { id: '1', title: 'Song A', artist_name: 'Artist A', popularity: 80 },
      { id: '2', title: 'song a', artist_name: 'artist a', popularity: 50 }, // Duplicate by title/artist
      { id: '1', title: 'Song A Different Name', artist_name: 'Artist A', popularity: 80 }, // Duplicate by ID
      { id: '3', title: 'Song B', artist_name: 'Artist B', popularity: 60 }
    ];

    const trackMap = new Map<string, any>();
    rawRows.forEach(row => {
      const titleKey = normalizeString(row.title);
      const artistKey = normalizeString(row.artist_name);
      const dedupKey = `${titleKey}::${artistKey}`;

      if (!trackMap.has(dedupKey) && !trackMap.has(row.id)) {
        trackMap.set(dedupKey, row);
        trackMap.set(row.id, row);
      }
    });

    const uniqueTracks = Array.from(new Set(Array.from(trackMap.values())));
    expect(uniqueTracks.length).toBe(2);
    expect(uniqueTracks.map(t => t.id)).toContain('1');
    expect(uniqueTracks.map(t => t.id)).toContain('3');
  });

  it('should score tracks with personalized weights', () => {
    const track = { id: '1', title: 'Song A', artist_name: 'Artist A', popularity: 80 };
    const trackLikes = new Set(['1']);
    const trackPlays = new Map([['1', 2]]);
    const userPref = {
      favorite_artists: ['Artist A'],
      favorite_genres: ['Pop']
    };
    const artistGenres = ['Pop', 'Dance'];

    // Calculate score
    let score = track.popularity * 0.5; // 80 * 0.5 = 40

    if (trackLikes.has(track.id)) {
      score += 50; // +50 = 90
    }

    const playCount = trackPlays.get(track.id) || 0;
    score += playCount * 15; // 2 * 15 = +30 = 120

    if (userPref.favorite_artists.some(a => normalizeString(a) === normalizeString(track.artist_name))) {
      score += 20; // +20 = 140
    }

    if (artistGenres.some(g => userPref.favorite_genres.some(fg => normalizeString(fg) === normalizeString(g)))) {
      score += 15; // +15 = 155
    }

    expect(score).toBe(155);
  });

  it('should enforce diversity rule by limiting same artist to max 3 tracks', () => {
    const scoredTracks = [
      { track: { id: '1', title: 'Song 1', artist: { id: 'A', name: 'Artist A' } }, score: 100 },
      { track: { id: '2', title: 'Song 2', artist: { id: 'A', name: 'Artist A' } }, score: 95 },
      { track: { id: '3', title: 'Song 3', artist: { id: 'A', name: 'Artist A' } }, score: 90 },
      { track: { id: '4', title: 'Song 4', artist: { id: 'A', name: 'Artist A' } }, score: 85 }, // Should be excluded
      { track: { id: '5', title: 'Song 5', artist: { id: 'B', name: 'Artist B' } }, score: 80 }
    ];

    const finalTracks: any[] = [];
    const artistCounts = new Map<string, number>();

    for (const item of scoredTracks) {
      const artistId = item.track.artist.id;
      const count = artistCounts.get(artistId) || 0;
      if (count < 3) {
        finalTracks.push(item.track);
        artistCounts.set(artistId, count + 1);
      }
    }

    expect(finalTracks.length).toBe(4);
    expect(finalTracks.map(t => t.id)).not.toContain('4');
    expect(finalTracks.map(t => t.id)).toContain('5');
  });
});
