import { Track, Artist, Album, Playlist, getCanonicalId } from '@/types';
import { spotifyProvider } from './providers';
import { normalizeString } from '@/lib/searchEngine';

export interface NormalizedSearchResult {
  topResult: {
    type: 'artist' | 'song' | 'album' | 'playlist';
    data: Track | Artist | Album | Playlist;
  } | null;
  songs: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  didYouMean?: boolean;
  originalQuery?: string;
  correctedQuery?: string;
  intent?: string;
  language?: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  market?: string;
  type?: ('track' | 'artist' | 'album' | 'playlist')[];
  signal?: AbortSignal;
}

export interface AutocompleteSuggestion {
  id: string;
  title?: string;
  name?: string;
  artist?: string;
  coverUrl?: string;
  type: 'song' | 'artist' | 'album' | 'playlist';
}

export interface AutocompleteResult {
  query: string;
  correctedQuery: string;
  didYouMean: boolean;
  songs: AutocompleteSuggestion[];
  artists: AutocompleteSuggestion[];
  albums: AutocompleteSuggestion[];
  playlists: AutocompleteSuggestion[];
  genres: string[];
  aiSuggestions: string[];
}

// Client-side cache for instant autocomplete responses (<100ms)
const CLIENT_SUGGESTIONS_CACHE = new Map<string, { timestamp: number; data: AutocompleteResult }>();
const CLIENT_CACHE_TTL = 3 * 60 * 1000;

// Session-based personalization memory
class SearchSessionManager {
  private static sessionArtists = new Set<string>();

  public static recordArtist(artistName?: string) {
    if (artistName && artistName.trim()) {
      this.sessionArtists.add(normalizeString(artistName));
    }
  }

  public static getSessionFavorites(): Set<string> {
    return this.sessionArtists;
  }
}

// Direct iTunes Search API helper
async function searchITunesDirect(
  query: string,
  limit = 25
): Promise<{ songs: Track[]; artists: Artist[]; albums: Album[] }> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
    );
    if (!res.ok) return { songs: [], artists: [], albums: [] };
    const data = await res.json();
    const results = data.results || [];

    const songs: Track[] = results.map((item: any) => {
      const highResCover = (item.artworkUrl100 || item.artworkUrl60 || '')
        .replace('100x100bb', '600x600bb')
        .replace('60x60bb', '600x600bb');
      const canonicalId = `itunes_${item.trackId}`;
      const artistName = item.artistName || 'Unknown Artist';
      return {
        id: canonicalId,
        canonicalId,
        source: 'itunes',
        sourceId: String(item.trackId),
        title: item.trackName || 'Unknown Track',
        artist: artistName,
        artists: [artistName],
        album: item.collectionName || 'Single',
        albumId: item.collectionId ? `itunes_alb_${item.collectionId}` : undefined,
        artworkUrl: highResCover,
        coverUrl: highResCover,
        duration: Math.floor((item.trackTimeMillis || 200000) / 1000),
        durationMs: item.trackTimeMillis || 200000,
        popularity: 75,
        previewUrl: item.previewUrl || '',
        playable: true,
        sourceType: 'stream',
      } as Track;
    });

    const artists: Artist[] = results.slice(0, 6).map((item: any) => {
      const highResCover = (item.artworkUrl100 || item.artworkUrl60 || '').replace('100x100bb', '600x600bb');
      return {
        id: `itunes_art_${item.artistId}`,
        canonicalId: `itunes_art_${item.artistId}`,
        source: 'itunes',
        sourceId: String(item.artistId),
        name: item.artistName || 'Unknown Artist',
        imageUrl: highResCover,
        avatarUrl: highResCover,
        genres: [item.primaryGenreName || 'Pop'],
        followers: 100000,
        popularity: 75,
      } as Artist;
    });

    return { songs, artists, albums: [] };
  } catch {
    return { songs: [], artists: [], albums: [] };
  }
}

// Direct Deezer Search API helper
async function searchDeezerDirect(query: string, limit = 25): Promise<{ songs: Track[] }> {
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) return { songs: [] };
    const data = await res.json();
    const items = data.data || [];

    const songs: Track[] = items.map((item: any) => {
      const coverUrl = item.album?.cover_big || item.album?.cover_medium || item.album?.cover || '';
      const canonicalId = `dz_${item.id}`;
      const artistName = item.artist?.name || 'Unknown Artist';
      return {
        id: canonicalId,
        canonicalId,
        source: 'deezer',
        sourceId: String(item.id),
        title: item.title || item.title_short || 'Unknown Track',
        artist: artistName,
        artists: [artistName],
        album: item.album?.title || 'Single',
        albumId: item.album?.id ? `dz_alb_${item.album.id}` : undefined,
        artworkUrl: coverUrl,
        coverUrl,
        duration: item.duration || 180,
        durationMs: (item.duration || 180) * 1000,
        popularity: item.rank ? Math.min(100, Math.floor(item.rank / 10000)) : 70,
        previewUrl: item.preview || '',
        playable: true,
        sourceType: 'stream',
      } as Track;
    });

    return { songs };
  } catch {
    return { songs: [] };
  }
}

// Client-side exact-match-first relevance scoring
function calculateClientRelevanceScore(
  itemTitle: string,
  itemArtist: string = '',
  itemAlbum: string = '',
  query: string
): number {
  const q = normalizeString(query);
  const title = normalizeString(itemTitle);
  const artist = normalizeString(itemArtist);
  const album = normalizeString(itemAlbum);
  const combined = `${title} ${artist}`.trim();
  const combinedRev = `${artist} ${title}`.trim();

  if (!q || !title) return 0;

  // Exact Match Boost
  if (title === q) return 100;
  if (combined === q || combinedRev === q) return 98;
  if (artist === q) return 95;
  if (album === q) return 85;

  // Prefix Match
  if (title.startsWith(q)) return 80;
  if (artist.startsWith(q)) return 75;

  // Token Overlap
  const queryTokens = q.split(/\s+/).filter(Boolean);
  const titleTokens = title.split(/\s+/).filter(Boolean);
  const artistTokens = artist.split(/\s+/).filter(Boolean);

  const matchedTitleTokens = queryTokens.filter(tok => titleTokens.some(t => t.includes(tok) || tok.includes(t)));
  const matchedArtistTokens = queryTokens.filter(tok => artistTokens.some(a => a.includes(tok) || tok.includes(a)));

  if (matchedTitleTokens.length === queryTokens.length) return 75;
  if (matchedArtistTokens.length === queryTokens.length) return 70;
  if (matchedTitleTokens.length > 0 && matchedArtistTokens.length > 0) return 72;

  // Substring Match
  if (title.includes(q)) return 60;
  if (artist.includes(q)) return 55;
  if (album.includes(q)) return 50;

  if (matchedTitleTokens.length > 0) return 40;
  if (matchedArtistTokens.length > 0) return 35;

  return 0;
}

export class MusicSearchService {
  /**
   * Fast autocomplete suggestions with client-side LRU prefix cache.
   */
  public static async getSuggestions(
    query: string,
    signal?: AbortSignal
  ): Promise<AutocompleteResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        query: '',
        correctedQuery: '',
        didYouMean: false,
        songs: [],
        artists: [],
        albums: [],
        playlists: [],
        genres: [],
        aiSuggestions: [],
      };
    }

    const norm = normalizeString(trimmed);
    const cached = CLIENT_SUGGESTIONS_CACHE.get(norm);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }

    try {
      const baseUrl = typeof window !== 'undefined' ? '' : `http://localhost:${process.env.PORT || '3002'}`;
      const res = await fetch(`${baseUrl}/api/search/suggestions?q=${encodeURIComponent(trimmed)}`, {
        signal,
      });

      if (!res.ok) throw new Error(`Suggestions returned ${res.status}`);
      const data: AutocompleteResult = await res.json();

      CLIENT_SUGGESTIONS_CACHE.set(norm, { timestamp: Date.now(), data });
      return data;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      return {
        query: trimmed,
        correctedQuery: trimmed,
        didYouMean: false,
        songs: [],
        artists: [],
        albums: [],
        playlists: [],
        genres: [],
        aiSuggestions: [],
      };
    }
  }

  /**
   * Records user interaction with an artist to subtly personalize search relevance during session.
   */
  public static recordInteraction(artistName?: string) {
    SearchSessionManager.recordArtist(artistName);
  }

  /**
   * Main unified search executing multi-source retrieval with exact-match boost and deduplication.
   */
  public static async searchAll(
    query: string,
    options?: SearchOptions
  ): Promise<NormalizedSearchResult> {
    const q = query.trim();
    if (!q) {
      return {
        topResult: null,
        songs: [],
        artists: [],
        albums: [],
        playlists: [],
      };
    }

    try {
      const params = new URLSearchParams({ q });
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.offset) params.set('offset', String(options.offset));

      let res: Response | null = null;
      try {
        const baseUrl = typeof window !== 'undefined' ? '' : `http://localhost:${process.env.PORT || '3002'}`;
        res = await fetch(`${baseUrl}/api/search?${params.toString()}`, {
          signal: options?.signal,
        });
      } catch (e) {
        if ((e as any)?.name === 'AbortError') throw e;
      }

      let songs: Track[] = [];
      let artists: Artist[] = [];
      let albums: Album[] = [];
      let playlists: Playlist[] = [];
      let serverTopResult: NormalizedSearchResult['topResult'] = null;
      let didYouMean = false;
      let originalQuery = q;
      let correctedQuery = q;
      let intent: string | undefined = undefined;
      let language: string | undefined = undefined;

      if (res && res.ok) {
        try {
          const data = await res.json();
          didYouMean = !!data.didYouMean;
          originalQuery = data.originalQuery || q;
          correctedQuery = data.correctedQuery || q;
          intent = data.intent;
          language = data.language;

          if (data.topResult && data.topResult.data) {
            serverTopResult = data.topResult;
          }

          songs = (data.songs || []).map((s: any) => {
            const canonicalId = s.canonicalId || s.id || getCanonicalId(s.source || 'spotify', s.sourceId || s.id, 'track');
            const artistName = typeof s.artist === 'string' ? s.artist : (s.artist?.name || s.artists?.join(', ') || 'Unknown Artist');
            const artistArr = Array.isArray(s.artists) ? s.artists : [artistName];
            const artworkUrl = s.artworkUrl || s.coverUrl || s.album?.coverUrl || '';

            return {
              id: canonicalId,
              canonicalId,
              source: s.source || 'spotify',
              sourceId: s.sourceId || s.id,
              title: s.title,
              artists: artistArr,
              artist: artistName,
              album: typeof s.album === 'string' ? s.album : (s.album?.name || 'Single'),
              albumId: s.album?.id,
              artworkUrl,
              coverUrl: artworkUrl,
              duration: s.duration || Math.floor((s.durationMs || 180000) / 1000),
              durationMs: s.durationMs || (s.duration ? s.duration * 1000 : 180000),
              releaseDate: s.releaseDate,
              popularity: s.popularity || 50,
              playable: true,
              sourceType: s.sourceType || 'stream',
            } as Track;
          });

          artists = (data.artists || []).map((a: any) => {
            const canonicalId = a.canonicalId || a.id || getCanonicalId(a.source || 'spotify', a.sourceId || a.id, 'artist');
            const imageUrl = a.imageUrl || a.avatarUrl || a.coverUrl || '';
            return {
              id: canonicalId,
              canonicalId,
              source: a.source || 'spotify',
              sourceId: a.sourceId || a.id,
              name: a.name,
              imageUrl,
              avatarUrl: imageUrl,
              genres: a.genres || [],
              followers: a.followers || 0,
              popularity: a.popularity || 0,
            } as Artist;
          });

          albums = (data.albums || []).map((al: any) => {
            const canonicalId = al.canonicalId || al.id || getCanonicalId(al.source || 'spotify', al.sourceId || al.id, 'album');
            const artworkUrl = al.artworkUrl || al.coverUrl || '';
            return {
              id: canonicalId,
              canonicalId,
              source: al.source || 'spotify',
              sourceId: al.sourceId || al.id,
              title: al.title || al.name,
              name: al.title || al.name,
              artists: Array.isArray(al.artists) ? al.artists : [al.artistName || al.artist?.name || 'Artist'],
              artistName: al.artistName || al.artist?.name,
              artworkUrl,
              coverUrl: artworkUrl,
              releaseDate: al.releaseDate,
            } as Album;
          });

          playlists = (data.playlists || []).map((p: any) => {
            const canonicalId = p.canonicalId || p.id || getCanonicalId(p.source || 'spotify', p.sourceId || p.id, 'playlist');
            const artworkUrl = p.artworkUrl || p.coverUrl || '';
            return {
              id: canonicalId,
              canonicalId,
              source: p.source || 'spotify',
              sourceId: p.sourceId || p.id,
              name: p.name,
              description: p.description || '',
              owner: p.owner || 'Spotify',
              artworkUrl,
              coverUrl: artworkUrl,
              totalTracks: p.totalTracks || p.trackCount || 0,
            } as Playlist;
          });
        } catch (jsonErr) {
          console.warn('[MusicSearchService] Failed to parse /api/search response JSON:', jsonErr);
        }
      }

      // If /api/search yielded 0 songs or failed, execute multi-source provider fallback
      if (songs.length === 0) {
        const [itunesRes, deezerRes, spotifyRes] = await Promise.allSettled([
          searchITunesDirect(q, options?.limit || 25),
          searchDeezerDirect(q, options?.limit || 25),
          spotifyProvider.isConfigured
            ? spotifyProvider.search(q, {
                limit: options?.limit || 20,
                offset: options?.offset || 0,
                market: options?.market || 'IN',
              })
            : Promise.resolve({ songs: [], artists: [], albums: [], playlists: [] }),
        ]);

        if (itunesRes.status === 'fulfilled' && itunesRes.value) {
          songs.push(...itunesRes.value.songs);
          if (artists.length === 0) artists.push(...itunesRes.value.artists);
        }

        if (deezerRes.status === 'fulfilled' && deezerRes.value) {
          deezerRes.value.songs.forEach((dzSong) => {
            const key = `${normalizeString(dzSong.title)}::${normalizeString(typeof dzSong.artist === 'string' ? dzSong.artist : dzSong.artist?.name || '')}`;
            if (!songs.some((s) => `${normalizeString(s.title)}::${normalizeString(typeof s.artist === 'string' ? s.artist : s.artist?.name || '')}` === key)) {
              songs.push(dzSong);
            }
          });
        }

        if (spotifyRes.status === 'fulfilled' && spotifyRes.value) {
          spotifyRes.value.songs.forEach((spotSong) => {
            const key = `${normalizeString(spotSong.title)}::${normalizeString(typeof spotSong.artist === 'string' ? spotSong.artist : spotSong.artist?.name || '')}`;
            if (!songs.some((s) => `${normalizeString(s.title)}::${normalizeString(typeof s.artist === 'string' ? s.artist : s.artist?.name || '')}` === key)) {
              songs.push(spotSong);
            }
          });
          if (artists.length === 0) artists = spotifyRes.value.artists;
          if (albums.length === 0) albums = spotifyRes.value.albums;
          if (playlists.length === 0) playlists = spotifyRes.value.playlists;
        }
      }

      // Filter and Rank Songs (Exact Match Boost First)
      let rankedSongs = songs
        .map((song) => {
          const artistName = Array.isArray(song.artists)
            ? song.artists.map((a) => (typeof a === 'string' ? a : (a as any)?.name || '')).join(', ')
            : (song.artist as any)?.name || (typeof song.artist === 'string' ? song.artist : '');
          const albumName = typeof song.album === 'string' ? song.album : (song.album as any)?.name || '';
          const score = calculateClientRelevanceScore(song.title, artistName, albumName, q);
          return { song, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || (b.song.popularity || 0) - (a.song.popularity || 0))
        .map((item) => item.song);

      if (rankedSongs.length === 0 && songs.length > 0) {
        rankedSongs = songs;
      }

      // Filter and Rank Artists strictly
      const rankedArtists = artists
        .map((artist) => {
          const score = calculateClientRelevanceScore(artist.name, '', '', q);
          return { artist, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score || (b.artist.popularity || 0) - (a.artist.popularity || 0))
        .map((item) => item.artist);

      // Filter and Rank Albums strictly
      const rankedAlbums = albums
        .map((album) => {
          const artistName = Array.isArray(album.artists) ? album.artists.join(', ') : album.artistName || '';
          const score = calculateClientRelevanceScore(album.title || album.name || '', artistName, '', q);
          return { album, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.album);

      // Filter and Rank Playlists strictly
      const rankedPlaylists = playlists
        .map((playlist) => {
          const score = calculateClientRelevanceScore(playlist.name, playlist.description || '', '', q);
          return { playlist, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.playlist);

      // Calculate Top Result
      let topResult: NormalizedSearchResult['topResult'] = serverTopResult;
      if (!topResult) {
        const normQ = normalizeString(q);
        if (rankedArtists.length > 0 && normalizeString(rankedArtists[0].name) === normQ) {
          topResult = { type: 'artist', data: rankedArtists[0] };
        } else if (rankedSongs.length > 0) {
          topResult = { type: 'song', data: rankedSongs[0] };
        } else if (rankedArtists.length > 0) {
          topResult = { type: 'artist', data: rankedArtists[0] };
        } else if (rankedAlbums.length > 0) {
          topResult = { type: 'album', data: rankedAlbums[0] };
        } else if (rankedPlaylists.length > 0) {
          topResult = { type: 'playlist', data: rankedPlaylists[0] };
        }
      }

      return {
        topResult,
        songs: rankedSongs,
        artists: rankedArtists,
        albums: rankedAlbums,
        playlists: rankedPlaylists,
        didYouMean,
        originalQuery,
        correctedQuery,
        intent,
        language,
      };
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        throw err;
      }
      console.warn('[MusicSearchService] Search failed:', err);
      return {
        topResult: null,
        songs: [],
        artists: [],
        albums: [],
        playlists: [],
      };
    }
  }

  public static async search(
    query: string,
    options?: SearchOptions
  ): Promise<NormalizedSearchResult> {
    return this.searchAll(query, options);
  }

  public static async searchTracks(
    query: string,
    options?: SearchOptions
  ): Promise<Track[]> {
    const res = await this.searchAll(query, { ...options, type: ['track'] });
    return res.songs;
  }

  public static async searchArtists(
    query: string,
    options?: SearchOptions
  ): Promise<Artist[]> {
    const res = await this.searchAll(query, { ...options, type: ['artist'] });
    return res.artists;
  }

  public static async searchAlbums(
    query: string,
    options?: SearchOptions
  ): Promise<Album[]> {
    const res = await this.searchAll(query, { ...options, type: ['album'] });
    return res.albums;
  }

  public static async searchPlaylists(
    query: string,
    options?: SearchOptions
  ): Promise<Playlist[]> {
    const res = await this.searchAll(query, { ...options, type: ['playlist'] });
    return res.playlists;
  }
}
