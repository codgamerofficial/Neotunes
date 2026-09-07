import { NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/services/spotify';
import { sql } from '@/lib/db';
import {
  normalizeString,
  correctSpelling,
  transliterateQuery,
  getSimilarity,
  parseSearchQuery,
} from '@/lib/searchEngine';

// In-memory LRU prefix cache for fast sub-50ms suggestions
const SUGGESTIONS_CACHE = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || !query.trim()) {
    return NextResponse.json({
      query: '',
      didYouMean: false,
      songs: [],
      artists: [],
      albums: [],
      playlists: [],
      genres: [],
      aiSuggestions: [],
    });
  }

  const normalized = normalizeString(query);
  const cacheKey = `sug_${normalized}`;

  // Check in-memory cache
  const cached = SUGGESTIONS_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const spellCheck = correctSpelling(normalized);
  const spellChecked = spellCheck.corrected;
  const didYouMean = spellCheck.changed;
  const searchTerms = transliterateQuery(spellChecked);
  const parsed = parseSearchQuery(spellChecked);

  let songs: any[] = [];
  let artists: any[] = [];
  let albums: any[] = [];
  let playlists: any[] = [];
  const genresSet = new Set<string>();

  // 1. Try Spotify API
  let spotifySuccess = false;
  try {
    const token = await getSpotifyAccessToken();
    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(spellChecked)}&type=track,artist,album,playlist&limit=5`;
    const spotifyRes = await fetch(spotifyUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (spotifyRes.ok) {
      const data = await spotifyRes.json();
      spotifySuccess = true;

      songs = (data.tracks?.items || []).filter(Boolean).map((t: any) => ({
        id: t.id,
        title: t.name,
        artist: t.artists?.[0]?.name || 'Unknown Artist',
        coverUrl: t.album?.images?.[0]?.url || '',
        type: 'song',
      }));

      artists = (data.artists?.items || []).filter(Boolean).map((a: any) => {
        a.genres?.slice(0, 2).forEach((g: string) => genresSet.add(g));
        return {
          id: a.id,
          name: a.name,
          coverUrl: a.images?.[0]?.url || '',
          type: 'artist',
        };
      });

      albums = (data.albums?.items || []).filter(Boolean).map((a: any) => ({
        id: a.id,
        name: a.name,
        artist: a.artists?.[0]?.name || 'Unknown Artist',
        coverUrl: a.images?.[0]?.url || '',
        type: 'album',
      }));

      playlists = (data.playlists?.items || []).filter(Boolean).map((p: any) => ({
        id: p.id,
        name: p.name,
        coverUrl: p.images?.[0]?.url || '',
        type: 'playlist',
      }));
    }
  } catch {
    spotifySuccess = false;
  }

  // 2. If Spotify failed (or returned 0 results), fallback to iTunes Search API for instantaneous suggestions
  if (!spotifySuccess || (songs.length === 0 && artists.length === 0)) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(spellChecked)}&media=music&entity=song,musicArtist&limit=6`
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        const results = itunesData.results || [];

        results.forEach((item: any) => {
          if (item.wrapperType === 'track') {
            const cover = (item.artworkUrl100 || item.artworkUrl60 || '').replace('100x100bb', '300x300bb');
            songs.push({
              id: `itunes_${item.trackId}`,
              title: item.trackName,
              artist: item.artistName,
              coverUrl: cover,
              type: 'song',
            });
            if (item.primaryGenreName) genresSet.add(item.primaryGenreName);
          } else if (item.wrapperType === 'artist') {
            artists.push({
              id: `itunes_${item.artistId}`,
              name: item.artistName,
              coverUrl: '',
              type: 'artist',
            });
          }
        });
      }
    } catch (itunesErr) {
      console.warn('iTunes suggestions fallback error:', itunesErr);
    }
  }

  // 3. Query Local Database for Trigram / Script Matches
  try {
    const localMatches = await sql`
      SELECT t.id, t.title, a.name as artist_name, al.images as album_images
      FROM public.tracks t
      JOIN public.artists a ON t.artist_id = a.id
      LEFT JOIN public.albums al ON t.album_id = al.id
      WHERE similarity(t.title, ${spellChecked}) > 0.12
         OR similarity(a.name, ${spellChecked}) > 0.12
      LIMIT 4
    `;
    localMatches.forEach((row: any) => {
      let coverUrl = '';
      if (row.album_images) {
        try {
          const imgs = typeof row.album_images === 'string' ? JSON.parse(row.album_images) : row.album_images;
          coverUrl = imgs?.[0]?.url || '';
        } catch {}
      }
      const isDuplicate = songs.some(s => s.title.toLowerCase() === row.title.toLowerCase());
      if (!isDuplicate) {
        songs.push({
          id: row.id,
          title: row.title,
          artist: row.artist_name,
          coverUrl,
          type: 'song',
        });
      }
    });
  } catch {
    // Graceful fallback
  }

  // Filter genres matching query
  const genresList = Array.from(genresSet).filter(g => g.toLowerCase().includes(normalized));
  if (genresList.length === 0 && genresSet.size > 0) {
    genresList.push(...Array.from(genresSet).slice(0, 3));
  }

  // AI & Semantic Suggestions
  const aiSuggestions: string[] = [];
  if (didYouMean) {
    aiSuggestions.push(`Did you mean "${spellChecked}"?`);
  }
  if (parsed.entities.artist) {
    aiSuggestions.push(`Top hits by ${parsed.entities.artist}`);
  }
  if (songs.length > 0) {
    aiSuggestions.push(`Songs like ${songs[0].title}`);
  }

  const payload = {
    query,
    normalized,
    correctedQuery: spellChecked,
    didYouMean,
    songs: songs.slice(0, 5),
    artists: artists.slice(0, 3),
    albums: albums.slice(0, 3),
    playlists: playlists.slice(0, 3),
    genres: genresList.slice(0, 3),
    aiSuggestions: aiSuggestions.slice(0, 3),
  };

  // Cache in LRU map (cap at 100 entries)
  if (SUGGESTIONS_CACHE.size > 100) {
    const oldestKey = SUGGESTIONS_CACHE.keys().next().value;
    if (oldestKey) SUGGESTIONS_CACHE.delete(oldestKey);
  }
  SUGGESTIONS_CACHE.set(cacheKey, { timestamp: Date.now(), data: payload });

  return NextResponse.json(payload);
}
