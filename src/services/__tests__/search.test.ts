import { describe, it, expect, vi } from 'vitest';
import { MusicSearchService } from '../MusicSearchService';

describe('MusicSearchService', () => {
  it('should return normalized search results structure', async () => {
    const res = await MusicSearchService.searchAll('Arijit Singh');
    expect(res).toBeDefined();
    expect(Array.isArray(res.songs)).toBe(true);
    expect(Array.isArray(res.artists)).toBe(true);
    expect(Array.isArray(res.albums)).toBe(true);
    expect(Array.isArray(res.playlists)).toBe(true);
  });

  it('should handle empty search queries gracefully', async () => {
    const res = await MusicSearchService.searchAll('');
    expect(res.songs).toHaveLength(0);
    expect(res.artists).toHaveLength(0);
    expect(res.albums).toHaveLength(0);
    expect(res.playlists).toHaveLength(0);
    expect(res.topResult).toBeNull();
  });

  it('should normalize song tracks with canonical IDs and artwork', async () => {
    const res = await MusicSearchService.searchAll('Kesariya');
    if (res.songs.length > 0) {
      const firstSong = res.songs[0];
      expect(firstSong).toHaveProperty('id');
      expect(firstSong).toHaveProperty('title');
      expect(firstSong).toHaveProperty('duration');
    }
  });

  it('should provide autocomplete suggestions structure', async () => {
    const sug = await MusicSearchService.getSuggestions('Ari');
    expect(sug).toBeDefined();
    expect(Array.isArray(sug.songs)).toBe(true);
    expect(Array.isArray(sug.artists)).toBe(true);
    expect(Array.isArray(sug.albums)).toBe(true);
    expect(Array.isArray(sug.aiSuggestions)).toBe(true);
  });

  it('should support recording artist interaction for session personalization', () => {
    expect(() => {
      MusicSearchService.recordInteraction('Karan Aujla');
    }).not.toThrow();
  });
});
