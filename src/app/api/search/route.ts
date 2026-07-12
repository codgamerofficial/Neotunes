import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getSpotifyAccessToken } from '@/services/spotify';
import { sql } from '@/lib/db';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface SearchTrack {
  id: string;
  title: string;
  artist: {
    id?: string;
    name: string;
  };
  album?: {
    id?: string;
    name: string;
    coverUrl?: string;
  };
  durationMs: number;
  popularity: number;
  previewUrl: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
  coverUrl: string;
  score?: number;
}

// Normalize strings for matching/deduplication
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
  const cacheKey = `hybrid_search:${normalizedQuery}`;

  // 1. Try checking Redis Cache
  try {
    const cachedResults = await redis.get<SearchTrack[]>(cacheKey);
    if (cachedResults) {
      return NextResponse.json({ tracks: cachedResults, cached: true });
    }
  } catch (err) {
    console.warn('Redis read error in hybrid search:', err);
  }

  try {
    // 2. Run searches in parallel
    let [spotifyResults, localResults] = await Promise.all([
      searchSpotify(query),
      searchLocalDatabase(query),
    ]);

    if (spotifyResults.length === 0 && localResults.length < 5) {
      console.log('Spotify search returned zero results. Running YouTube fallback...');
      const fallbackResults = await searchYouTubeFallback(query);
      spotifyResults = fallbackResults;
    }

    // 3. Merge and Deduplicate results
    const mergedMap = new Map<string, SearchTrack>();

    // Add local results first (user uploads or already saved tracks)
    localResults.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      mergedMap.set(dedupKey, track);
    });

    // Add Spotify results (merging if duplicate matches)
    spotifyResults.forEach((track) => {
      const dedupKey = `${normalizeString(track.title)}::${normalizeString(track.artist.name)}`;
      if (mergedMap.has(dedupKey)) {
        const existing = mergedMap.get(dedupKey)!;
        // Merge metadata: keep local source (youtube/cloud) but update description/popularity from Spotify
        mergedMap.set(dedupKey, {
          ...track,
          id: existing.id || track.id,
          sourceType: existing.sourceType || track.sourceType,
          sourceId: existing.sourceId || track.sourceId,
          popularity: Math.max(existing.popularity || 0, track.popularity || 0),
        });
      } else {
        mergedMap.set(dedupKey, track);
      }
    });

    const mergedList = Array.from(mergedMap.values());

    // 4. Rank results
    const rankedList = mergedList.map((track) => {
      let score = (track.popularity || 0) * 0.15; // base score from popularity

      const normTitle = normalizeString(track.title);
      const normArtist = normalizeString(track.artist.name);

      if (normTitle === normalizedQuery) {
        score += 100; // exact title match
      } else if (normTitle.startsWith(normalizedQuery)) {
        score += 50; // starts with title match
      } else if (normTitle.includes(normalizedQuery)) {
        score += 20; // contains title match
      }

      if (normArtist === normalizedQuery) {
        score += 80; // exact artist match
      } else if (normArtist.startsWith(normalizedQuery)) {
        score += 40;
      }

      return {
        ...track,
        score,
      };
    });

    // Sort by score descending
    rankedList.sort((a, b) => b.score! - a.score!);

    // Remove temporary scoring fields before returning/caching
    const finalTracks = rankedList.map(({ score, ...track }) => track);

    // 5. Cache result in Redis for 10 minutes (600s)
    try {
      await redis.set(cacheKey, finalTracks, { ex: 600 });
    } catch (err) {
      console.warn('Redis write error in hybrid search:', err);
    }

    return NextResponse.json({ tracks: finalTracks, cached: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to query Spotify Search API
async function searchSpotify(query: string): Promise<SearchTrack[]> {
  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=25`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Spotify API failed in hybrid search:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.tracks?.items?.map((item: any) => ({
      id: item.id,
      title: item.name,
      artist: {
        id: item.artists[0]?.id,
        name: item.artists[0]?.name,
      },
      album: {
        id: item.album?.id,
        name: item.album?.name,
        coverUrl: item.album?.images?.[0]?.url || '',
      },
      durationMs: item.duration_ms,
      popularity: item.popularity || 0,
      previewUrl: item.preview_url || '',
      sourceType: 'youtube',
      coverUrl: item.album?.images?.[0]?.url || '',
    })) || [];
  } catch (error) {
    console.error('Error searching Spotify:', error);
    return [];
  }
}

// Helper to query local database with Trigram fuzzy match
async function searchLocalDatabase(query: string): Promise<SearchTrack[]> {
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
        al.id as album_id,
        al.name as album_name,
        al.images as album_images,
        ts.source_type as "sourceType",
        ts.source_id as "sourceId"
      FROM public.tracks t
      JOIN public.artists a ON t.artist_id = a.id
      LEFT JOIN public.albums al ON t.album_id = al.id
      LEFT JOIN public.track_sources ts ON t.id = ts.track_id
      WHERE similarity(t.title, ${query}) > 0.15 
         OR similarity(a.name, ${query}) > 0.15
      ORDER BY similarity(t.title, ${query}) DESC
      LIMIT 15
    `;

    return results.map((row: any) => {
      let coverUrl = '';
      if (row.album_images) {
        try {
          const imgs = typeof row.album_images === 'string' ? JSON.parse(row.album_images) : row.album_images;
          coverUrl = imgs?.[0]?.url || '';
        } catch {
          // ignore parsing error
        }
      }

      return {
        id: row.id,
        title: row.title,
        artist: {
          id: row.artist_id,
          name: row.artist_name,
        },
        album: {
          id: row.album_id,
          name: row.album_name,
          coverUrl,
        },
        durationMs: row.durationMs || 0,
        popularity: row.popularity || 0,
        previewUrl: row.previewUrl || '',
        sourceType: (row.sourceType as 'youtube' | 'cloud') || 'youtube',
        sourceId: row.sourceId || undefined,
        coverUrl,
      };
    });
  } catch (error) {
    console.error('Error searching local database:', error);
    return [];
  }
}

// Helper to search YouTube API directly as a fallback if Spotify fails
async function searchYouTubeFallback(query: string): Promise<SearchTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('YouTube API Key missing, cannot run fallback search.');
    return [];
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=15&videoCategoryId=10`;
    let response = await fetch(url);
    if (!response.ok) {
      // Try search query without category restriction (CategoryId 10 is music)
      const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}&maxResults=15`;
      response = await fetch(fallbackUrl);
      if (!response.ok) {
        console.error('YouTube search fallback API failed:', response.statusText);
        return [];
      }
    }

    const data = await response.json();
    return data.items?.map((item: any) => ({
      id: item.id?.videoId || `yt_${Date.now()}_${Math.random()}`,
      title: item.snippet?.title || 'Unknown Video',
      artist: {
        name: item.snippet?.channelTitle || 'Unknown Artist',
      },
      album: {
        name: 'YouTube Video',
        coverUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
      },
      durationMs: 180000,
      popularity: 50,
      previewUrl: '',
      sourceType: 'youtube' as const,
      sourceId: item.id?.videoId,
      coverUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
    })) || [];
  } catch (error) {
    console.error('YouTube search fallback error:', error);
    return [];
  }
}
