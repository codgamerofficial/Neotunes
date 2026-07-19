import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getSpotifyAccessToken } from '@/services/spotify';
import { sql } from '@/lib/db';
import {
  normalizeString,
  correctSpelling,
  transliterateQuery,
  expandSynonyms,
  classifySemanticIntent,
  calculateConfidenceScore,
  deduplicateTracks,
  getSimilarity,
  getMatchDetails,
} from '@/lib/searchEngine';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface UnifiedSearchTrack {
  id: string; // Spotify ID, Deezer ID, or local UUID
  title: string;
  artist: {
    id?: string;
    name: string;
    avatarUrl?: string; // Official Artist Image
  };
  album?: {
    id?: string;
    name: string;
    coverUrl?: string;
    releaseDate?: string;
  };
  durationMs: number;
  popularity: number;
  previewUrl: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string; // Cached YouTube Video ID
  coverUrl: string;
  explicit?: boolean;
  genres?: string[];
  score?: number;
  isHQ?: boolean;
  copyright?: string;
  confidence?: any;
}

interface TopArtist {
  id: string;
  name: string;
  coverUrl: string;
  followers: number;
  popularity: number;
  genres: string[];
  verified: boolean;
  country?: string;
  monthlyListeners?: number;
}

interface GroupedSearchResults {
  topArtist: TopArtist | null;
  artists: any[];
  songs: UnifiedSearchTrack[];
  albums: any[];
  playlists: any[];
  videos: UnifiedSearchTrack[];
  podcasts: UnifiedSearchTrack[];
  covers: UnifiedSearchTrack[];
  live: UnifiedSearchTrack[];
  aiMix: any | null;
  cached: boolean;
  didYouMean: boolean;
  originalQuery: string;
  correctedQuery: string;
  suggestedArtists?: any[];
  suggestedSongs?: UnifiedSearchTrack[];
  popularBengaliSongs?: UnifiedSearchTrack[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const force = searchParams.get('force') === 'true';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required.' }, { status: 400 });
  }

  // Stage 1: Normalize Input
  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) {
    return NextResponse.json({ error: 'Query parameter "q" is empty.' }, { status: 400 });
  }

  // Stage 2: Spell Correction
  let correctedQuery = query;
  let didYouMean = false;
  
  if (!force) {
    const spellCheck = correctSpelling(normalizedQuery);
    if (spellCheck.changed) {
      correctedQuery = spellCheck.corrected;
      didYouMean = true;
    }
  }

  // Stage 3: Transliteration
  const searchTerms = transliterateQuery(correctedQuery);

  // Stage 4: Synonym Expansion
  const expandedSynonyms = expandSynonyms(correctedQuery);

  // Stage 5 & 6: Semantic Intent Classification
  const semanticIntent = classifySemanticIntent(correctedQuery);

  const cacheKey = `ai_search_v4:${force ? 'f_' : ''}${normalizeString(correctedQuery)}`;

  // Try checking Redis Cache
  try {
    const cachedData = await redis.get<GroupedSearchResults>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true });
    }
  } catch (err) {
    console.warn('Redis read error in hybrid search:', err);
  }

  try {
    // Run multi-source searches in parallel (Spotify, YouTube, Local DB)
    const [spotifyResults, youtubeResults, dbResults] = await Promise.allSettled([
      searchSpotify(correctedQuery),
      searchYouTube(correctedQuery),
      searchLocalDatabase(correctedQuery, searchTerms, expandedSynonyms),
    ]);

    let spotifyTracks: UnifiedSearchTrack[] = [];
    let spotifyTopArtist: TopArtist | null = null;
    let rawAlbums: any[] = [];
    let rawPlaylists: any[] = [];
    let artistsList: any[] = [];

    if (spotifyResults.status === 'fulfilled' && spotifyResults.value) {
      spotifyTracks = spotifyResults.value.tracks;
      spotifyTopArtist = spotifyResults.value.topArtist;
      rawAlbums = spotifyResults.value.albums || [];
      rawPlaylists = spotifyResults.value.playlists || [];
      artistsList = spotifyResults.value.artists || [];
    }

    let youtubeTracks: UnifiedSearchTrack[] = [];
    if (youtubeResults.status === 'fulfilled' && youtubeResults.value) {
      youtubeTracks = youtubeResults.value;
    }

    let localTracks: UnifiedSearchTrack[] = [];
    if (dbResults.status === 'fulfilled' && dbResults.value) {
      localTracks = dbResults.value;
    }

    // Fallback if Spotify is down/unsubscribed
    if (spotifyTracks.length === 0 && localTracks.length < 5) {
      console.log('Spotify search returned zero results. Running Deezer fallback...');
      const fallback = await searchDeezerFallback(correctedQuery);
      spotifyTracks = fallback.tracks;
      spotifyTopArtist = spotifyTopArtist || fallback.topArtist;
      artistsList = artistsList.length === 0 ? (fallback.artists || []) : artistsList;
      rawAlbums = rawAlbums.length === 0 ? (fallback.albums || []) : rawAlbums;
      rawPlaylists = rawPlaylists.length === 0 ? (fallback.playlists || []) : rawPlaylists;
    }

    // Merge and Deduplicate results
    const mergedTracksMap = new Map<string, UnifiedSearchTrack>();

    // Add local database results first (high priority caching)
    localTracks.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      mergedTracksMap.set(dedupKey, track);
    });

    // Add Spotify results, merging duplicate tracks
    spotifyTracks.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      if (mergedTracksMap.has(dedupKey)) {
        const existing = mergedTracksMap.get(dedupKey)!;
        mergedTracksMap.set(dedupKey, {
          ...track,
          id: existing.id || track.id,
          sourceType: existing.sourceType || track.sourceType,
          sourceId: existing.sourceId || track.sourceId,
          popularity: Math.max(existing.popularity || 0, track.popularity || 0),
          artist: {
            ...track.artist,
            avatarUrl: existing.artist.avatarUrl || track.artist.avatarUrl,
          },
        });
      } else {
        mergedTracksMap.set(dedupKey, track);
      }
    });

    // Add YouTube search results to find video matches
    youtubeTracks.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      if (mergedTracksMap.has(dedupKey)) {
        const existing = mergedTracksMap.get(dedupKey)!;
        mergedTracksMap.set(dedupKey, {
          ...existing,
          sourceId: existing.sourceId || track.sourceId,
          sourceType: existing.sourceType || track.sourceType,
        });
      } else {
        mergedTracksMap.set(dedupKey, track);
      }
    });

    // Batch query local DB cache for resolved YouTube video IDs for Spotify tracks
    const mergedList = Array.from(mergedTracksMap.values());
    const spotifyIds = mergedList.map(t => t.id).filter(id => !id.startsWith('yt_') && !id.startsWith('dz_') && id.length > 5);

    if (spotifyIds.length > 0) {
      try {
        const resolvedSources = await sql`
          SELECT track_id, source_id 
          FROM public.track_sources 
          WHERE track_id = ANY(${spotifyIds})
            AND source_type = 'youtube'
        `;

        const sourceMap = new Map<string, string>();
        resolvedSources.forEach((row: any) => {
          sourceMap.set(row.track_id, row.source_id);
        });

        // Inject cached YouTube IDs directly
        mergedList.forEach(t => {
          if (sourceMap.has(t.id)) {
            t.sourceId = sourceMap.get(t.id);
          }
        });
      } catch (dbErr) {
        console.warn('Failed to query batch track sources:', dbErr);
      }
    }

    // Rank and Score all tracks with detailed Confidence Metrics
    const rankedTracks = mergedList.map((track) => {
      const confidence = calculateConfidenceScore(
        track,
        correctedQuery,
        semanticIntent,
        searchTerms
      );

      const matchDetails = getMatchDetails(
        track,
        correctedQuery,
        semanticIntent
      );

      // Extract/simulate metadata parameters
      const language = matchDetails.matchedLanguage || 'English';
      const mood = matchDetails.matchedMood || 'neutral';
      const genre = matchDetails.matchedGenre || 'Pop';
      const activity = matchDetails.matchedActivity || 'chill';
      const viewsCount = (Math.floor(Math.random() * 45) + 5) + '.' + Math.floor(Math.random() * 9 + 1) + 'M';

      return {
        ...track,
        score: confidence.overallConfidence, // for sorting & backward compatibility
        confidence,
        isHQ: confidence.overallConfidence > 65,
        language,
        genre,
        mood,
        activity,
        views: viewsCount,
        matchDetails,
      };
    });

    // Sort by Quality Score desc
    rankedTracks.sort((a, b) => b.score! - a.score!);

    // Classify and Group results into Sections
    const songs: UnifiedSearchTrack[] = [];
    const videos: UnifiedSearchTrack[] = [];
    const podcasts: UnifiedSearchTrack[] = [];
    const covers: UnifiedSearchTrack[] = [];
    const live: UnifiedSearchTrack[] = [];

    rankedTracks.forEach((track) => {
      const normTitle = normalizeString(track.title);
      const durationSec = track.durationMs / 1000;

      if (track.id.startsWith('pod-') || normTitle.includes('podcast') || durationSec > 900) {
        podcasts.push(track);
      } else if (normTitle.includes('cover') || normTitle.includes('tribute') || normTitle.includes('remix') || normTitle.includes('mashup')) {
        covers.push(track);
      } else if (normTitle.includes('live') || normTitle.includes('concert') || normTitle.includes('session')) {
        live.push(track);
      } else if (normTitle.includes('music video') || normTitle.includes('official video') || normTitle.includes('visualizer')) {
        videos.push(track);
      } else {
        songs.push(track);
      }
    });

    // Format Top Artist details
    let topArtist: TopArtist | null = spotifyTopArtist;
    if (topArtist) {
      topArtist.country = topArtist.country || 'IN';
      topArtist.monthlyListeners = topArtist.monthlyListeners || (topArtist.followers * 1.6 > 100000 ? Math.round(topArtist.followers * 1.6) : 2450893);
    } else if (artistsList.length > 0) {
      // Promoted top artist if query matches name closely
      const bestArtist = artistsList[0];
      if (getSimilarity(correctedQuery, bestArtist.name) > 0.6) {
        topArtist = {
          id: bestArtist.id,
          name: bestArtist.name,
          coverUrl: bestArtist.coverUrl || bestArtist.images?.[0]?.url || '',
          followers: bestArtist.followers || 150000,
          popularity: bestArtist.popularity || 70,
          genres: bestArtist.genres || [],
          verified: true,
        };
      }
    }

    // Support AI queries (generate dynamic playlist metadata on the fly if query matches mood/intent)
    let aiMix = null;
    if (semanticIntent.intent !== 'general') {
      let emoji = '🤖';
      let gradient = 'from-cyan-500 via-purple-600 to-indigo-500';
      
      if (semanticIntent.intent === 'mood') {
        if (semanticIntent.vibe === 'sleep') { emoji = '☁️'; gradient = 'from-slate-800 via-slate-900 to-neutral-900'; }
        if (semanticIntent.vibe === 'gym' || semanticIntent.vibe === 'workout') { emoji = '⚡'; gradient = 'from-red-500 via-orange-600 to-amber-500'; }
        if (semanticIntent.vibe === 'study' || semanticIntent.vibe === 'coding') { emoji = '📚'; gradient = 'from-blue-600 via-cyan-600 to-emerald-500'; }
        if (semanticIntent.vibe === 'rain') { emoji = '🌧️'; gradient = 'from-sky-700 via-teal-800 to-indigo-900'; }
        if (semanticIntent.vibe === 'sad') { emoji = '🖤'; gradient = 'from-neutral-700 via-zinc-800 to-slate-900'; }
        if (semanticIntent.vibe === 'romantic') { emoji = '💖'; gradient = 'from-rose-500 via-pink-600 to-purple-500'; }
      } else if (semanticIntent.intent === 'similarity') {
        emoji = '🎵';
        gradient = 'from-indigo-500 via-purple-600 to-pink-500';
      }

      aiMix = {
        title: `AI ${correctedQuery.charAt(0).toUpperCase() + correctedQuery.slice(1)} Mix`,
        description: `A custom generated station optimized for your search: "${correctedQuery}"`,
        tracks: songs.slice(0, 8),
        icon: emoji,
        gradient: gradient
      };
    }

    // Check if the results list is completely empty or low-confidence
    const totalResults = songs.length + videos.length + covers.length + live.length + artistsList.length + rawAlbums.length;
    const hasLowConfidence = rankedTracks.length > 0 && rankedTracks[0].score! < 30;

    let suggestedArtists: any[] = [];
    let suggestedSongs: UnifiedSearchTrack[] = [];
    let popularBengaliSongs: UnifiedSearchTrack[] = [];

    if (totalResults === 0 || hasLowConfidence) {
      console.log('Low confidence or no results found. Fetching rich fallback suggestions...');
      
      // 1. Fetch Suggested Artists from local database
      try {
        const topLocalArtists = await sql`
          SELECT id, name, genres, popularity, images
          FROM public.artists
          ORDER BY popularity DESC
          LIMIT 6
        `;
        suggestedArtists = topLocalArtists.map((a: any) => {
          let coverUrl = '';
          if (a.images) {
            try {
              const imgs = typeof a.images === 'string' ? JSON.parse(a.images) : a.images;
              coverUrl = imgs?.[0]?.url || '';
            } catch {}
          }
          return {
            id: a.id,
            name: a.name,
            coverUrl,
            followers: 124058,
            popularity: a.popularity || 60,
            genres: a.genres || [],
            verified: true,
          };
        });
      } catch (err) {
        console.warn('Fallback artist lookup failed:', err);
      }

      // 2. Fetch Suggested Songs (trending tracks in local database)
      try {
        const topLocalTracks = await sql`
          SELECT 
            t.id, t.title, t.duration_ms as "durationMs", t.popularity, t.preview_url as "previewUrl",
            a.id as artist_id, a.name as artist_name,
            al.id as album_id, al.name as album_name, al.images as album_images
          FROM public.tracks t
          JOIN public.artists a ON t.artist_id = a.id
          LEFT JOIN public.albums al ON t.album_id = al.id
          ORDER BY t.popularity DESC
          LIMIT 10
        `;
        suggestedSongs = topLocalTracks.map((row: any) => {
          let coverUrl = '';
          if (row.album_images) {
            try {
              const imgs = typeof row.album_images === 'string' ? JSON.parse(row.album_images) : row.album_images;
              coverUrl = imgs?.[0]?.url || '';
            } catch {}
          }
          return {
            id: row.id,
            title: row.title,
            artist: { id: row.artist_id, name: row.artist_name },
            album: { id: row.album_id, name: row.album_name, coverUrl },
            durationMs: row.durationMs || 180000,
            popularity: row.popularity || 50,
            previewUrl: row.previewUrl || '',
            sourceType: 'youtube',
            coverUrl,
          };
        });
      } catch (err) {
        console.warn('Fallback songs lookup failed:', err);
      }

      // 3. Dynamic Spotify Search for Popular Bengali Songs
      try {
        const bengaliSearch = await searchSpotify('Popular Bengali Songs');
        popularBengaliSongs = bengaliSearch.tracks.slice(0, 6);
      } catch (err) {
        console.warn('Failed to resolve popular Bengali songs fallback:', err);
      }
    }

    const responsePayload: GroupedSearchResults = {
      topArtist,
      artists: artistsList.slice(0, 6),
      songs: songs.slice(0, 15),
      albums: rawAlbums.slice(0, 6),
      playlists: rawPlaylists.slice(0, 6),
      videos: videos.slice(0, 6),
      podcasts: podcasts.slice(0, 6),
      covers: covers.slice(0, 6),
      live: live.slice(0, 6),
      aiMix,
      cached: false,
      didYouMean,
      originalQuery: query,
      correctedQuery,
      suggestedArtists,
      suggestedSongs,
      popularBengaliSongs,
    };

    // Cache result in Redis for 10 minutes (exclude empty queries/errors)
    if (totalResults > 0) {
      try {
        await redis.set(cacheKey, responsePayload, { ex: 600 });
      } catch (err) {
        console.warn('Redis write error in hybrid search:', err);
      }
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Grouped search route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to query YouTube Search API directly
async function searchYouTube(query: string): Promise<UnifiedSearchTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&key=${apiKey}&maxResults=8&videoCategoryId=10`;
    
    let res = await fetch(url);
    if (!res.ok) {
      // retry without video category
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&key=${apiKey}&maxResults=8`;
      res = await fetch(fallbackUrl);
    }

    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || [];

    return items.map((item: any) => {
      const coverUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '';
      return {
        id: `yt_${item.id.videoId}`,
        title: item.snippet?.title || 'Unknown Video',
        artist: {
          name: item.snippet?.channelTitle || 'Unknown Creator',
        },
        album: {
          name: 'YouTube',
          coverUrl,
        },
        durationMs: 240000, // standard default
        popularity: 50,
        previewUrl: '',
        sourceType: 'youtube' as const,
        sourceId: item.id.videoId,
        coverUrl,
        genres: [],
      };
    });
  } catch (err) {
    console.warn('YouTube search API request failed:', err);
    return [];
  }
}

// Helper to query Deezer Search API as fallback for Spotify 403/errors
async function searchDeezerFallback(query: string): Promise<{ tracks: UnifiedSearchTrack[]; topArtist: TopArtist | null; artists?: any[]; albums?: any[]; playlists?: any[] }> {
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=30`);
    if (!res.ok) {
      throw new Error(`Deezer search API returned status ${res.status}`);
    }

    const data = await res.json();
    const items = data.data || [];

    let topArtist: TopArtist | null = null;
    if (items.length > 0) {
      const best = items[0];
      topArtist = {
        id: `dz_${best.artist?.id || 'artist'}`,
        name: best.artist?.name || 'Unknown Artist',
        coverUrl: best.artist?.picture_xl || best.artist?.picture_medium || '',
        followers: 1250000,
        popularity: 85,
        genres: ['Pop', 'Hits'],
        verified: true,
      };
    }

    const artistsMap = new Map();
    const albumsMap = new Map();

    const tracks: UnifiedSearchTrack[] = items.map((item: any) => {
      const artId = `dz_${item.artist?.id || 'artist'}`;
      const cover = item.album?.cover_xl || item.album?.cover_big || item.album?.cover_medium || '';
      
      if (item.artist && !artistsMap.has(artId)) {
        artistsMap.set(artId, {
          id: artId,
          name: item.artist.name,
          coverUrl: item.artist.picture_medium || '',
          followers: 500000,
          popularity: 75,
          genres: [],
          verified: true
        });
      }

      const albId = String(item.album?.id || 'album');
      if (item.album && !albumsMap.has(albId)) {
        albumsMap.set(albId, {
          id: albId,
          name: item.album.title,
          coverUrl: cover,
          releaseDate: new Date().getFullYear().toString(),
          type: 'album',
          artist: { name: item.artist?.name || 'Unknown Artist' }
        });
      }

      return {
        id: `dz_${item.id}`,
        title: item.title,
        artist: {
          id: artId,
          name: item.artist?.name || 'Unknown Artist',
          avatarUrl: item.artist?.picture_medium || '',
        },
        album: {
          id: albId,
          name: item.album?.title || 'Unknown Album',
          coverUrl: cover,
          releaseDate: new Date().getFullYear().toString(),
        },
        durationMs: (item.duration || 180) * 1000,
        popularity: 70,
        previewUrl: item.preview || '',
        sourceType: 'youtube' as const,
        coverUrl: cover,
        explicit: item.explicit_lyrics || false,
        genres: [],
      };
    });

    return { 
      tracks, 
      topArtist,
      artists: Array.from(artistsMap.values()),
      albums: Array.from(albumsMap.values()),
      playlists: []
    };
  } catch (err) {
    console.error('Deezer search fallback failed:', err);
    return { tracks: [], topArtist: null, artists: [], albums: [], playlists: [] };
  }
}

// Helper to query Spotify Search
async function searchSpotify(query: string): Promise<{ tracks: UnifiedSearchTrack[]; topArtist: TopArtist | null; artists?: any[]; albums?: any[]; playlists?: any[] }> {
  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist,album,playlist&limit=25`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.warn('Spotify API failed in hybrid search, falling back to Deezer. Status:', response.statusText);
      return searchDeezerFallback(query);
    }

    const data = await response.json();
    
    let topArtist: TopArtist | null = null;
    const spotifyArtists = data.artists?.items || [];
    if (spotifyArtists.length > 0) {
      const bestArtist = spotifyArtists[0];
      if (normalizeString(bestArtist.name).includes(normalizeString(query)) || normalizeString(query).includes(normalizeString(bestArtist.name))) {
        topArtist = {
          id: bestArtist.id,
          name: bestArtist.name,
          coverUrl: bestArtist.images?.[0]?.url || '',
          followers: bestArtist.followers?.total || 0,
          popularity: bestArtist.popularity || 0,
          genres: bestArtist.genres || [],
          verified: true,
        };
      }
    }

    const spotifyTracks = data.tracks?.items || [];

    const artistIds = Array.from(new Set<string>(
      spotifyTracks.map((item: any) => item.artists[0]?.id).filter(Boolean)
    ));

    const artistDetailsMap = new Map<string, { avatarUrl: string; genres: string[] }>();
    if (artistIds.length > 0) {
      try {
        const batchArtistsRes = await fetch(
          `https://api.spotify.com/v1/artists?ids=${artistIds.slice(0, 50).join(',')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (batchArtistsRes.ok) {
          const batchData = await batchArtistsRes.json();
          batchData.artists?.forEach((art: any) => {
            if (art) {
              artistDetailsMap.set(art.id, {
                avatarUrl: art.images?.[0]?.url || '',
                genres: art.genres || [],
              });
            }
          });
        }
      } catch (batchErr) {
        console.warn('Failed to batch resolve Spotify artists details:', batchErr);
      }
    }

    const tracks: UnifiedSearchTrack[] = spotifyTracks.map((item: any) => {
      const artId = item.artists[0]?.id;
      const details = artistDetailsMap.get(artId);

      return {
        id: item.id,
        title: item.name,
        artist: {
          id: artId,
          name: item.artists[0]?.name,
          avatarUrl: details?.avatarUrl || '',
        },
        album: {
          id: item.album?.id,
          name: item.album?.name,
          coverUrl: item.album?.images?.[0]?.url || '',
          releaseDate: item.album?.release_date || '',
        },
        durationMs: item.duration_ms,
        popularity: item.popularity || 0,
        previewUrl: item.preview_url || '',
        sourceType: 'youtube',
        coverUrl: item.album?.images?.[0]?.url || '',
        explicit: item.explicit || false,
        genres: details?.genres || [],
      };
    });

    const parsedArtists = spotifyArtists.map((a: any) => ({
      id: a.id,
      name: a.name,
      coverUrl: a.images?.[0]?.url || '',
      followers: a.followers?.total || 0,
      popularity: a.popularity || 0,
      genres: a.genres || [],
      verified: true
    }));

    const parsedAlbums = (data.albums?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      coverUrl: a.images?.[0]?.url || '',
      releaseDate: a.release_date || '',
      type: a.album_type || 'album',
      artist: { name: a.artists?.[0]?.name || 'Unknown Artist' }
    }));

    const parsedPlaylists = (data.playlists?.items || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      coverUrl: p.images?.[0]?.url || '',
      owner: p.owner?.display_name || 'Spotify',
      trackCount: p.tracks?.total || 0
    }));

    return { 
      tracks, 
      topArtist,
      artists: parsedArtists,
      albums: parsedAlbums,
      playlists: parsedPlaylists
    };
  } catch (error) {
    console.warn('Error searching Spotify, falling back to Deezer:', error);
    return searchDeezerFallback(query);
  }
}

// Helper to query local database with Trigram fuzzy match & script matches
async function searchLocalDatabase(
  query: string, 
  searchTerms: string[], 
  expandedSynonyms: string[]
): Promise<UnifiedSearchTrack[]> {
  try {
    const termsCondition = searchTerms.map(t => `%${t.toLowerCase()}%`);
    const synonymsCondition = expandedSynonyms.map(t => `%${t.toLowerCase()}%`);

    const results = await sql`
      SELECT 
        t.id, 
        t.title, 
        t.duration_ms as "durationMs", 
        t.popularity, 
        t.preview_url as "previewUrl",
        a.id as artist_id,
        a.name as artist_name,
        a.images as artist_images,
        a.genres as artist_genres,
        al.id as album_id,
        al.name as album_name,
        al.images as album_images,
        al.release_date as album_release,
        ts.source_type as "sourceType",
        ts.source_id as "sourceId"
      FROM public.tracks t
      JOIN public.artists a ON t.artist_id = a.id
      LEFT JOIN public.albums al ON t.album_id = al.id
      LEFT JOIN public.track_sources ts ON t.id = ts.track_id
      WHERE similarity(t.title, ${query}) > 0.12 
         OR similarity(a.name, ${query}) > 0.12
         ${termsCondition.length > 0 ? sql`OR LOWER(t.title) LIKE ANY(${termsCondition}) OR LOWER(a.name) LIKE ANY(${termsCondition})` : sql``}
         ${synonymsCondition.length > 0 ? sql`OR LOWER(t.title) LIKE ANY(${synonymsCondition}) OR LOWER(a.name) LIKE ANY(${synonymsCondition}) OR a.genres::text LIKE ANY(${synonymsCondition})` : sql``}
      ORDER BY similarity(t.title, ${query}) DESC
      LIMIT 20
    `;

    return results.map((row: any) => {
      let coverUrl = '';
      if (row.album_images) {
        try {
          const imgs = typeof row.album_images === 'string' ? JSON.parse(row.album_images) : row.album_images;
          coverUrl = imgs?.[0]?.url || '';
        } catch {}
      }

      let avatarUrl = '';
      if (row.artist_images) {
        try {
          const imgs = typeof row.artist_images === 'string' ? JSON.parse(row.artist_images) : row.artist_images;
          avatarUrl = imgs?.[0]?.url || '';
        } catch {}
      }

      return {
        id: row.id,
        title: row.title,
        artist: {
          id: row.artist_id,
          name: row.artist_name,
          avatarUrl,
        },
        album: {
          id: row.album_id,
          name: row.album_name,
          coverUrl,
          releaseDate: row.album_release,
        },
        durationMs: row.durationMs || 0,
        popularity: row.popularity || 0,
        previewUrl: row.previewUrl || '',
        sourceType: (row.sourceType as 'youtube' | 'cloud') || 'youtube',
        sourceId: row.sourceId || undefined,
        coverUrl,
        genres: row.artist_genres || [],
      };
    });
  } catch (error) {
    console.error('Error searching local database:', error);
    return [];
  }
}
