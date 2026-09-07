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
  decodeHTMLEntities,
  parseQueryTokens,
  cleanSearchNoise,
  detectLanguage,
  parseSearchQuery,
} from '@/lib/searchEngine';

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

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
  topResult?: { type: 'artist' | 'song' | 'album' | 'playlist'; data: any } | null;
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
  originalQuery?: string;
  correctedQuery?: string;
  intent?: string;
  language?: string;
  suggestedArtists?: any[];
  suggestedSongs?: UnifiedSearchTrack[];
  popularBengaliSongs?: UnifiedSearchTrack[];
  diagnostics?: {
    originalQuery: string;
    correctedQuery: string;
    pipelineSteps: Array<{ name: string; status: 'passed' | 'failed' | 'skipped'; details?: string }>;
    providerStats: { local: number; spotify: number; youtube: number; deezer: number };
    isBroadened: boolean;
  };
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

  // Stage 3: Language & Script Detection
  const detectedLang = detectLanguage(correctedQuery);

  // Stage 4: Transliteration
  const searchTerms = transliterateQuery(correctedQuery);

  // Stage 5: Synonym Expansion
  const expandedSynonyms = expandSynonyms(correctedQuery);

  // Stage 6: Intent & Entity Parsing
  const parsedSearch = parseSearchQuery(correctedQuery);
  const semanticIntent = classifySemanticIntent(correctedQuery);

  const cleanedQuery = cleanSearchNoise(correctedQuery) || correctedQuery;
  const cacheKey = `ai_search_v12:${force ? 'f_' : ''}${normalizeString(cleanedQuery)}`;

  // Try checking Redis Cache (only serve if cached results contain playable tracks)
  if (redis) {
    try {
      const cachedData = await redis.get<GroupedSearchResults>(cacheKey);
      if (cachedData && cachedData.songs && cachedData.songs.length > 0) {
        return NextResponse.json({ ...cachedData, cached: true });
      }
    } catch (err) {
      console.warn('Redis read error in hybrid search:', err);
    }
  }

  try {
    // Run multi-source searches in parallel (Spotify, YouTube, Local DB, iTunes API)
    const [spotifyResults, youtubeResults, dbResults, iTunesResults] = await Promise.allSettled([
      searchSpotify(cleanedQuery),
      searchYouTube(cleanedQuery),
      searchLocalDatabase(cleanedQuery, searchTerms, expandedSynonyms),
      searchITunes(cleanedQuery),
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

    let iTunesTracks: UnifiedSearchTrack[] = [];
    let iTunesTopArtist: TopArtist | null = null;
    let iTunesArtists: any[] = [];
    let iTunesAlbums: any[] = [];
    if (iTunesResults.status === 'fulfilled' && iTunesResults.value) {
      iTunesTracks = iTunesResults.value.tracks;
      iTunesTopArtist = iTunesResults.value.topArtist;
      iTunesArtists = iTunesResults.value.artists || [];
      iTunesAlbums = iTunesResults.value.albums || [];
    }

    if (artistsList.length === 0 && iTunesArtists.length > 0) {
      artistsList = iTunesArtists;
    }
    if (rawAlbums.length === 0 && iTunesAlbums.length > 0) {
      rawAlbums = iTunesAlbums;
    }

    // Fallback to Deezer if Spotify returns zero results or artists/albums are missing
    if (spotifyTracks.length === 0 || artistsList.length === 0 || rawAlbums.length === 0) {
      const fallback = await searchDeezerFallback(cleanedQuery);
      if (spotifyTracks.length === 0) {
        spotifyTracks = fallback.tracks;
      }
      spotifyTopArtist = spotifyTopArtist || fallback.topArtist;
      if (artistsList.length === 0) {
        artistsList = fallback.artists || [];
      }
      if (rawAlbums.length === 0) {
        rawAlbums = fallback.albums || [];
      }
      if (rawPlaylists.length === 0) {
        rawPlaylists = fallback.playlists || [];
      }
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

    // Add iTunes results (high reliability global metadata fallback)
    iTunesTracks.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      if (!mergedTracksMap.has(dedupKey)) {
        mergedTracksMap.set(dedupKey, track);
      }
    });

    if (!spotifyTopArtist && iTunesTopArtist) {
      spotifyTopArtist = iTunesTopArtist;
    }

    // Query Broadening Cascade if initial multi-source search yielded zero tracks
    let isBroadened = false;
    if (mergedTracksMap.size === 0) {
      console.log(`[NeoTunes Search Pipeline] Zero initial tracks for "${correctedQuery}". Running Broadened Cascade...`);
      isBroadened = true;
      const parsed = parseQueryTokens(correctedQuery);
      const subQueries: string[] = [];

      if (parsed.artistName && parsed.songTitle) {
        subQueries.push(parsed.songTitle, parsed.artistName);
      } else {
        parsed.cleanTokens.forEach((t) => {
          if (t.length > 2) subQueries.push(t);
        });
      }

      for (const subQ of subQueries) {
        if (mergedTracksMap.size >= 12) break;
        const [subSpot, subYt, subITunes] = await Promise.allSettled([
          searchSpotify(subQ),
          searchYouTube(subQ),
          searchITunes(subQ),
        ]);
        if (subSpot.status === 'fulfilled' && subSpot.value) {
          subSpot.value.tracks.forEach((t) => {
            const key = `${normalizeString(t.title)}::${normalizeString(t.artist.name)}`;
            if (!mergedTracksMap.has(key)) mergedTracksMap.set(key, t);
          });
        }
        if (subYt.status === 'fulfilled' && subYt.value) {
          subYt.value.forEach((t) => {
            const key = `${normalizeString(t.title)}::${normalizeString(t.artist.name)}`;
            if (!mergedTracksMap.has(key)) mergedTracksMap.set(key, t);
          });
        }
        if (subITunes.status === 'fulfilled' && subITunes.value) {
          subITunes.value.tracks.forEach((t) => {
            const key = `${normalizeString(t.title)}::${normalizeString(t.artist.name)}`;
            if (!mergedTracksMap.has(key)) mergedTracksMap.set(key, t);
          });
        }
      }
    }

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
        parsedSearch,
        searchTerms
      );

      const matchDetails = getMatchDetails(
        track,
        correctedQuery,
        parsedSearch
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

    // Format Top Artist details (only if query is an actual artist search)
    let topArtist: TopArtist | null = spotifyTopArtist;

    if (topArtist) {
      const normQ = normalizeString(correctedQuery);
      const normA = normalizeString(topArtist.name);
      const isArtistMatch =
        normQ === normA ||
        normQ.includes(normA) ||
        normA.includes(normQ) ||
        getSimilarity(normQ, normA) >= 0.6;

      if (!isArtistMatch) {
        topArtist = null;
      } else {
        topArtist.country = topArtist.country || 'IN';
        topArtist.monthlyListeners =
          topArtist.monthlyListeners ||
          (topArtist.followers * 1.6 > 100000
            ? Math.round(topArtist.followers * 1.6)
            : 2450893);
      }
    }

    if (!topArtist && artistsList.length > 0) {
      const normQ = normalizeString(correctedQuery);
      const matchedArtist = artistsList.find((a: any) => {
        const normA = normalizeString(a.name || '');
        return normQ === normA || normQ.includes(normA) || normA.includes(normQ) || getSimilarity(normQ, normA) >= 0.6;
      }) || (parsedSearch.intent === 'artist' ? artistsList[0] : null);

      if (matchedArtist) {
        topArtist = {
          id: matchedArtist.id,
          name: matchedArtist.name,
          coverUrl: matchedArtist.coverUrl || matchedArtist.images?.[0]?.url || matchedArtist.avatarUrl || '',
          followers: matchedArtist.followers || 150000,
          popularity: matchedArtist.popularity || 75,
          genres: matchedArtist.genres || ['Artist'],
          verified: true,
        };
      }
    }

    if (topArtist && !artistsList.some((a: any) => normalizeString(a.name) === normalizeString(topArtist!.name))) {
      artistsList.unshift({
        id: topArtist.id,
        name: topArtist.name,
        coverUrl: topArtist.coverUrl,
        followers: topArtist.followers,
        popularity: topArtist.popularity,
        genres: topArtist.genres,
        verified: true,
      });
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

    if (totalResults === 0) {
      console.log('No search results found from providers. Fetching fallback suggestions...');
      
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

    // Determine Top Result with Exact Match Prioritization
    let topResult: { type: 'artist' | 'song' | 'album' | 'playlist'; data: any } | null = null;
    const normQ = normalizeString(correctedQuery);

    const isArtistIntent = parsedSearch.intent === 'artist';
    if (
      topArtist &&
      (normalizeString(topArtist.name) === normQ ||
        normQ.includes(normalizeString(topArtist.name)) ||
        normalizeString(topArtist.name).includes(normQ) ||
        isArtistIntent)
    ) {
      topResult = { type: 'artist', data: topArtist };
    } else if (songs.length > 0) {
      topResult = { type: 'song', data: songs[0] };
    } else if (topArtist) {
      topResult = { type: 'artist', data: topArtist };
    } else if (rawAlbums.length > 0) {
      topResult = { type: 'album', data: rawAlbums[0] };
    } else if (rawPlaylists.length > 0) {
      topResult = { type: 'playlist', data: rawPlaylists[0] };
    }

    const responsePayload: GroupedSearchResults = {
      topResult,
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
      intent: parsedSearch.intent,
      language: detectedLang.language,
      suggestedArtists,
      suggestedSongs,
      popularBengaliSongs,
      diagnostics: {
        originalQuery: query,
        correctedQuery,
        pipelineSteps: [
          { name: 'Spell Correction', status: didYouMean ? 'passed' : 'skipped', details: didYouMean ? `Corrected to "${correctedQuery}"` : 'Exact query' },
          { name: 'Phonetic & Transliteration', status: searchTerms.length > 1 ? 'passed' : 'skipped', details: `${searchTerms.length} search variations` },
          { name: 'Multi-Provider Search', status: mergedTracksMap.size > 0 ? 'passed' : 'failed', details: `Found ${mergedTracksMap.size} tracks` },
          { name: 'Query Broadening Cascade', status: isBroadened ? (mergedTracksMap.size > 0 ? 'passed' : 'failed') : 'skipped', details: isBroadened ? `Broadened tokens parsed` : 'Not required' },
          { name: 'Metadata & Source Resolution', status: songs.length > 0 ? 'passed' : 'failed', details: `${songs.length} playable tracks` }
        ],
        providerStats: {
          local: localTracks.length,
          spotify: spotifyTracks.length,
          youtube: youtubeTracks.length,
          deezer: 0
        },
        isBroadened
      }
    };

    // Cache result in Redis for 10 minutes (exclude empty queries/errors)
    if (redis && totalResults > 0) {
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
    )}&type=video&key=${apiKey}&maxResults=8`;
    
    let res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const items = data.items || [];

    return items.map((item: any) => {
      const coverUrl = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '';
      return {
        id: `yt_${item.id.videoId}`,
        title: decodeHTMLEntities(item.snippet?.title || 'Unknown Video'),
        artist: {
          name: decodeHTMLEntities(item.snippet?.channelTitle || 'Unknown Creator'),
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
    const [res, artistRes] = await Promise.allSettled([
      fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=30`),
      fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=5`),
    ]);

    const data = res.status === 'fulfilled' && res.value.ok ? await res.value.json() : { data: [] };
    const items = data.data || [];

    const artistData = artistRes.status === 'fulfilled' && artistRes.value.ok ? await artistRes.value.json() : { data: [] };
    const deezerArtists = artistData.data || [];

    let topArtist: TopArtist | null = null;
    const normQ = normalizeString(query);

    // 1. Check direct Deezer artist endpoint for exact/close artist match
    if (deezerArtists.length > 0) {
      const matched = deezerArtists.find((a: any) => {
        const normA = normalizeString(a.name || '');
        return normQ === normA || normQ.includes(normA) || normA.includes(normQ) || getSimilarity(normQ, normA) >= 0.6;
      }) || deezerArtists[0];

      if (matched) {
        topArtist = {
          id: `dz_${matched.id}`,
          name: matched.name,
          coverUrl: matched.picture_xl || matched.picture_big || matched.picture_medium || '',
          followers: matched.nb_fan || 500000,
          popularity: 88,
          genres: ['Pop', 'Hits'],
          verified: true,
        };
      }
    }

    // 2. Fallback check tracks first artist if direct artist match wasn't found
    if (!topArtist && items.length > 0) {
      const best = items[0];
      const artistName = best.artist?.name || '';
      const normA = normalizeString(artistName);
      if (normQ && normA && (normQ === normA || normQ.includes(normA) || normA.includes(normQ) || getSimilarity(normQ, normA) >= 0.6)) {
        topArtist = {
          id: `dz_${best.artist?.id || 'artist'}`,
          name: artistName,
          coverUrl: best.artist?.picture_xl || best.artist?.picture_medium || '',
          followers: 1250000,
          popularity: 85,
          genres: ['Pop', 'Hits'],
          verified: true,
        };
      }
    }

    const artistsMap = new Map();
    if (topArtist) {
      artistsMap.set(topArtist.id, {
        id: topArtist.id,
        name: topArtist.name,
        coverUrl: topArtist.coverUrl,
        followers: topArtist.followers,
        popularity: topArtist.popularity,
        genres: topArtist.genres,
        verified: true,
      });
    }

    deezerArtists.forEach((a: any) => {
      const artId = `dz_${a.id}`;
      if (!artistsMap.has(artId)) {
        artistsMap.set(artId, {
          id: artId,
          name: a.name,
          coverUrl: a.picture_xl || a.picture_big || a.picture_medium || '',
          followers: a.nb_fan || 300000,
          popularity: 80,
          genres: ['Music'],
          verified: true,
        });
      }
    });

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

    const spotifyTracks = (data.tracks?.items || []).filter((item: any) => item && item.id);

    const artistIds = Array.from(new Set<string>(
      spotifyTracks.map((item: any) => item.artists?.[0]?.id).filter(Boolean)
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
      const artId = item.artists?.[0]?.id;
      const details = artId ? artistDetailsMap.get(artId) : undefined;

      return {
        id: item.id,
        title: item.name,
        artist: {
          id: artId,
          name: item.artists?.[0]?.name || 'Unknown Artist',
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

    const parsedArtists = (spotifyArtists || []).filter((a: any) => a && a.id).map((a: any) => ({
      id: a.id,
      name: a.name,
      coverUrl: a.images?.[0]?.url || '',
      followers: a.followers?.total || 0,
      popularity: a.popularity || 0,
      genres: a.genres || [],
      verified: true
    }));

    const parsedAlbums = (data.albums?.items || []).filter((a: any) => a && a.id).map((a: any) => ({
      id: a.id,
      name: a.name,
      coverUrl: a.images?.[0]?.url || '',
      releaseDate: a.release_date || '',
      type: a.album_type || 'album',
      artist: { name: a.artists?.[0]?.name || 'Unknown Artist' }
    }));

    const parsedPlaylists = (data.playlists?.items || []).filter((p: any) => p && p.id).map((p: any) => ({
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

// Helper to query iTunes Search API directly (Free, highly reliable global music metadata)
async function searchITunes(query: string): Promise<{ tracks: UnifiedSearchTrack[]; topArtist: TopArtist | null; artists?: any[]; albums?: any[] }> {
  try {
    const [songsRes, artistsRes] = await Promise.allSettled([
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`),
      fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=musicArtist&limit=5`),
    ]);

    const data = songsRes.status === 'fulfilled' && songsRes.value.ok ? await songsRes.value.json() : { results: [] };
    const results = data.results || [];

    const artistData = artistsRes.status === 'fulfilled' && artistsRes.value.ok ? await artistsRes.value.json() : { results: [] };
    const artistResults = artistData.results || [];

    let topArtist: TopArtist | null = null;
    const normQ = normalizeString(query);

    // 1. Check direct iTunes musicArtist entity results
    if (artistResults.length > 0) {
      const bestArtist = artistResults.find((a: any) => {
        const normA = normalizeString(a.artistName || '');
        return normQ === normA || normQ.includes(normA) || normA.includes(normQ) || getSimilarity(normQ, normA) >= 0.6;
      }) || artistResults[0];

      if (bestArtist) {
        // Find high-res image from song results if available
        const matchingSong = results.find((s: any) => s.artistId === bestArtist.artistId);
        const artCover = matchingSong ? (matchingSong.artworkUrl100 || '').replace('100x100bb', '600x600bb') : '';

        topArtist = {
          id: `itunes_${bestArtist.artistId || 'artist'}`,
          name: bestArtist.artistName || 'Unknown Artist',
          coverUrl: artCover,
          followers: 850000,
          popularity: 85,
          genres: [bestArtist.primaryGenreName || 'Pop'],
          verified: true,
        };
      }
    }

    // 2. Fallback check first song's artist if artist search wasn't conclusive
    if (!topArtist && results.length > 0) {
      const best = results[0];
      const normA = normalizeString(best.artistName || '');
      if (normQ === normA || normQ.includes(normA) || normA.includes(normQ) || getSimilarity(normQ, normA) >= 0.6) {
        topArtist = {
          id: `itunes_${best.artistId || 'artist'}`,
          name: best.artistName || 'Unknown Artist',
          coverUrl: (best.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
          followers: 850000,
          popularity: 80,
          genres: [best.primaryGenreName || 'Pop'],
          verified: true,
        };
      }
    }

    const artistsMap = new Map();
    if (topArtist) {
      artistsMap.set(topArtist.id, {
        id: topArtist.id,
        name: topArtist.name,
        coverUrl: topArtist.coverUrl,
        followers: topArtist.followers,
        popularity: topArtist.popularity,
        genres: topArtist.genres,
        verified: true,
      });
    }

    artistResults.forEach((a: any) => {
      const artId = `itunes_${a.artistId}`;
      if (!artistsMap.has(artId)) {
        const matchingSong = results.find((s: any) => s.artistId === a.artistId);
        const artCover = matchingSong ? (matchingSong.artworkUrl100 || '').replace('100x100bb', '600x600bb') : '';
        artistsMap.set(artId, {
          id: artId,
          name: a.artistName,
          coverUrl: artCover,
          followers: 500000,
          popularity: 75,
          genres: [a.primaryGenreName || 'Pop'],
          verified: true,
        });
      }
    });

    const albumsMap = new Map();

    const tracks: UnifiedSearchTrack[] = results.map((item: any) => {
      const highResCover = (item.artworkUrl100 || item.artworkUrl60 || '').replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
      const artId = `itunes_${item.artistId}`;

      if (!artistsMap.has(artId)) {
        artistsMap.set(artId, {
          id: artId,
          name: item.artistName || 'Unknown Artist',
          coverUrl: highResCover,
          followers: 350000,
          popularity: 70,
          genres: [item.primaryGenreName || 'Pop'],
          verified: true,
        });
      }

      if (item.collectionId && !albumsMap.has(item.collectionId)) {
        albumsMap.set(item.collectionId, {
          id: `itunes_alb_${item.collectionId}`,
          name: item.collectionName || 'Unknown Album',
          coverUrl: highResCover,
          releaseDate: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
          type: 'album',
          artist: { name: item.artistName || 'Unknown Artist' },
        });
      }

      return {
        id: `itunes_${item.trackId}`,
        title: item.trackName || 'Unknown Track',
        artist: {
          id: artId,
          name: item.artistName || 'Unknown Artist',
          avatarUrl: highResCover,
        },
        album: {
          id: `itunes_alb_${item.collectionId}`,
          name: item.collectionName || 'Unknown Album',
          coverUrl: highResCover,
          releaseDate: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
        },
        durationMs: item.trackTimeMillis || 200000,
        popularity: 75,
        previewUrl: item.previewUrl || '',
        sourceType: 'youtube' as const,
        coverUrl: highResCover,
        explicit: item.trackExpliciteness === 'explicit',
        genres: item.primaryGenreName ? [item.primaryGenreName] : [],
      };
    });

    return { 
      tracks, 
      topArtist, 
      artists: Array.from(artistsMap.values()), 
      albums: Array.from(albumsMap.values()) 
    };
  } catch (err) {
    console.warn('iTunes Search API failed:', err);
    return { tracks: [], topArtist: null, artists: [], albums: [] };
  }
}
