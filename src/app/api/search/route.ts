import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getSpotifyAccessToken } from '@/services/spotify';
import { sql } from '@/lib/db';
import { getBestYouTubeThumbnail } from '@/utils/getYouTubeThumbnail';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface UnifiedSearchTrack {
  id: string; // Spotify ID or local UUID
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
}

interface TopArtist {
  id: string;
  name: string;
  coverUrl: string;
  followers: number;
  popularity: number;
  genres: string[];
  verified: boolean;
}

// Normalize strings for matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required.' }, { status: 400 });
  }

  const normalizedQuery = normalizeString(query);
  const cacheKey = `hybrid_search_v2:${normalizedQuery}`;

  // 1. Try checking Redis Cache
  try {
    const cachedData = await redis.get<{ tracks: UnifiedSearchTrack[]; topArtist: TopArtist | null }>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ ...cachedData, cached: true });
    }
  } catch (err) {
    console.warn('Redis read error in hybrid search:', err);
  }

  try {
    // 2. Fetch Spotify track/artist details and local db matches in parallel
    const [spotifyResults, localResults] = await Promise.all([
      searchSpotify(query),
      searchLocalDatabase(query),
    ]);

    let tracks = spotifyResults.tracks;
    let topArtist = spotifyResults.topArtist;

    // Fallback if Spotify is down/unsubscribed and returns nothing
    if (tracks.length === 0 && localResults.length < 5) {
      console.log('Spotify search returned zero results. Running YouTube fallback...');
      const fallbackTracks = await searchYouTubeFallback(query);
      tracks = fallbackTracks;
    }

    // 3. Merge and Deduplicate results
    const mergedMap = new Map<string, UnifiedSearchTrack>();

    // Add local results first
    localResults.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      mergedMap.set(dedupKey, track);
    });

    // Add Spotify results, merging duplicate tracks
    tracks.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      if (mergedMap.has(dedupKey)) {
        const existing = mergedMap.get(dedupKey)!;
        mergedMap.set(dedupKey, {
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
        mergedMap.set(dedupKey, track);
      }
    });

    // 4. Batch query local DB cache for resolved YouTube video IDs
    const mergedList = Array.from(mergedMap.values());
    const spotifyIds = mergedList.map(t => t.id).filter(id => !id.startsWith('yt_') && id.length > 5);

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

    // 5. Rank results
    const rankedList = mergedList.map((track) => {
      let score = (track.popularity || 0) * 0.15;
      const normTitle = normalizeString(track.title);
      const normArtist = normalizeString(track.artist.name);

      if (normTitle === normalizedQuery) {
        score += 100;
      } else if (normTitle.startsWith(normalizedQuery)) {
        score += 50;
      } else if (normTitle.includes(normalizedQuery)) {
        score += 20;
      }

      if (normArtist === normalizedQuery) {
        score += 80;
      } else if (normArtist.startsWith(normalizedQuery)) {
        score += 40;
      }

      return {
        ...track,
        score,
      };
    });

    rankedList.sort((a, b) => b.score! - a.score!);
    const finalTracks = rankedList.map(({ score, ...track }) => track);

    const responsePayload = { tracks: finalTracks, topArtist, cached: false };

    // 6. Cache result in Redis for 10 minutes
    try {
      await redis.set(cacheKey, responsePayload, { ex: 600 });
    } catch (err) {
      console.warn('Redis write error in hybrid search:', err);
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to query Spotify Search (tracks + artists)
async function searchSpotify(query: string): Promise<{ tracks: UnifiedSearchTrack[]; topArtist: TopArtist | null }> {
  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,artist&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Spotify API failed in hybrid search:', response.statusText);
      return { tracks: [], topArtist: null };
    }

    const data = await response.json();
    
    // Parse Top Artist Match
    let topArtist: TopArtist | null = null;
    const spotifyArtists = data.artists?.items || [];
    if (spotifyArtists.length > 0) {
      const bestArtist = spotifyArtists[0];
      // If the artist name is highly similar to the query, promote it
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

    // Optimization: Batch fetch artist avatars/images to avoid N requests
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

    return { tracks, topArtist };
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return { tracks: [], topArtist: null };
  }
}

// Helper to query local database with Trigram fuzzy match
async function searchLocalDatabase(query: string): Promise<UnifiedSearchTrack[]> {
  try {
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
      WHERE similarity(t.title, ${query}) > 0.15 
         OR similarity(a.name, ${query}) > 0.15
      ORDER BY similarity(t.title, ${query}) DESC
      LIMIT 10
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

// Fallback search to YouTube directly if Spotify is down
async function searchYouTubeFallback(query: string): Promise<UnifiedSearchTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=10&videoCategoryId=10`;
    let response = await fetch(url);
    if (!response.ok) {
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=10`;
      response = await fetch(fallbackUrl);
    }

    const data = await response.json();
    return data.items?.map((item: any) => {
      const bestThumbnail = getBestYouTubeThumbnail(item.snippet?.thumbnails);
      return {
        id: item.id?.videoId || '',
        title: item.snippet?.title || 'Unknown Video',
        artist: {
          name: item.snippet?.channelTitle || 'Unknown Artist',
          avatarUrl: '',
        },
        album: {
          name: 'YouTube Vibe',
          coverUrl: bestThumbnail,
        },
        durationMs: 180000,
        popularity: 50,
        previewUrl: '',
        sourceType: 'youtube' as const,
        sourceId: item.id?.videoId,
        coverUrl: bestThumbnail,
        genres: [],
      };
    }) || [];
  } catch (error) {
    console.error('YouTube search fallback error:', error);
    return [];
  }
}
