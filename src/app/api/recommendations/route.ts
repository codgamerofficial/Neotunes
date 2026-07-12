import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getSpotifyAccessToken } from '@/services/spotify';
import { sql, ensureDbUser } from '@/lib/db';

import { formatDbTrack } from '@/lib/metadata';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'discover-weekly'; 
  const seedTrackId = searchParams.get('seedTrackId'); 

  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      success: false,
      data: null,
      error: { message: 'Unauthorized access', type: 'AUTH_ERROR' },
      fallbackUsed: false,
      source: 'spotify',
      message: 'You must be logged in to view recommendations.',
    }, { status: 401 });
  }

  await ensureDbUser(user);

  let tracks: any[] = [];
  let source = 'spotify';
  let fallbackUsed = false;
  let spotifyError: string | null = null;

  try {
    const spotifyToken = await getSpotifyAccessToken();
    let seedTracks: string[] = [];

    if (seedTrackId) {
      seedTracks = [seedTrackId];
    } else {
      const historySeeds = await sql`
        SELECT track_id, COUNT(track_id) as play_count
        FROM public.listening_history
        WHERE user_id = ${user.id}
        GROUP BY track_id
        ORDER BY play_count DESC
        LIMIT 3
      `;

      if (historySeeds.length > 0) {
        seedTracks = historySeeds.map((row: any) => row.track_id);
      }

      if (seedTracks.length === 0) {
        const likedSeeds = await sql`
          SELECT track_id FROM public.liked_tracks
          WHERE user_id = ${user.id}
          ORDER BY created_at DESC
          LIMIT 3
        `;
        if (likedSeeds.length > 0) {
          seedTracks = likedSeeds.map((row: any) => row.track_id);
        }
      }
    }

    if (seedTracks.length === 0) {
      seedTracks = ['0VjIjW4GlUZAMYd2vXMi3b', '0yM44uiNyyAevm27y5uO0s', '4D7tIB1C03sfw5k049URrw'];
    }

    const spotifySeedTracks = seedTracks.filter(id => /^[a-zA-Z0-9]{22}$/.test(id));

    if (spotifySeedTracks.length > 0) {
      const seedParams = `seed_tracks=${spotifySeedTracks.slice(0, 5).join(',')}`;
      const spotifyUrl = `https://api.spotify.com/v1/recommendations?${seedParams}&limit=20`;
      
      const response = await fetch(spotifyUrl, {
        headers: {
          Authorization: `Bearer ${spotifyToken}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Spotify Recommendations API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      tracks = data.tracks?.map((item: any) => ({
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
    } else {
      throw new Error('No valid Spotify track seeds available.');
    }
  } catch (error: any) {
    spotifyError = error.message;
    console.warn('Spotify recommendation flow failed. Falling back to local database cascade. Error:', error.message);
  }

  // Fallback Pipeline: cache -> Personalized & Diverse Recommendation Generator
  if (tracks.length === 0) {
    fallbackUsed = true;

    // 1. Try recommendations cache
    try {
      const cacheResult = await sql`
        SELECT recommended_tracks
        FROM public.recommendations_cache
        WHERE user_id = ${user.id}
      `;
      if (cacheResult.length > 0 && Array.isArray(cacheResult[0].recommended_tracks) && cacheResult[0].recommended_tracks.length > 0) {
        tracks = cacheResult[0].recommended_tracks;
        source = 'cache';
        console.log('Recommendation Fallback: Loaded from cache.');
      }
    } catch (cacheErr: any) {
      console.warn('Failed to load from recommendations_cache:', cacheErr.message);
    }

    // 2. Optimized Personalized Recommendation Generator (History + Likes + Preferences + Diversity + Deduplication)
    if (tracks.length === 0) {
      let userPref = { favorite_genres: [] as string[], favorite_artists: [] as string[] };
      try {
        const prefResult = await sql`
          SELECT favorite_genres, favorite_artists
          FROM public.user_preferences
          WHERE user_id = ${user.id}
          LIMIT 1
        `;
        if (prefResult.length > 0) {
          userPref = {
            favorite_genres: prefResult[0].favorite_genres || [],
            favorite_artists: prefResult[0].favorite_artists || [],
          };
        }
      } catch (err: any) {
        console.warn('Failed to load user preferences:', err.message);
      }

      let historyRows: any[] = [];
      let likedRows: any[] = [];
      let catalogRows: any[] = [];

      try {
        historyRows = await sql`
          SELECT 
            t.id, t.title, t.duration_ms as "durationMs", t.popularity, t.preview_url as "previewUrl",
            a.id as artist_id, a.name as artist_name, a.genres as artist_genres,
            al.id as album_id, al.name as album_name, al.images as album_images,
            ts.source_type as "sourceType", ts.source_id as "sourceId",
            COUNT(lh.played_at) as play_count
          FROM public.listening_history lh
          JOIN public.tracks t ON lh.track_id = t.id
          JOIN public.artists a ON t.artist_id = a.id
          LEFT JOIN public.albums al ON t.album_id = al.id
          LEFT JOIN public.track_sources ts ON t.id = ts.track_id
          WHERE lh.user_id = ${user.id}
          GROUP BY t.id, t.title, t.duration_ms, t.popularity, t.preview_url, a.id, a.name, a.genres, al.id, al.name, al.images, ts.source_type, ts.source_id
          LIMIT 50
        `;
      } catch (err: any) {
        console.warn('Failed to fetch history rows for cascade:', err.message);
      }

      try {
        likedRows = await sql`
          SELECT 
            t.id, t.title, t.duration_ms as "durationMs", t.popularity, t.preview_url as "previewUrl",
            a.id as artist_id, a.name as artist_name, a.genres as artist_genres,
            al.id as album_id, al.name as album_name, al.images as album_images,
            ts.source_type as "sourceType", ts.source_id as "sourceId"
          FROM public.liked_tracks lt
          JOIN public.tracks t ON lt.track_id = t.id
          JOIN public.artists a ON t.artist_id = a.id
          LEFT JOIN public.albums al ON t.album_id = al.id
          LEFT JOIN public.track_sources ts ON t.id = ts.track_id
          WHERE lt.user_id = ${user.id}
          LIMIT 50
        `;
      } catch (err: any) {
        console.warn('Failed to fetch liked rows for cascade:', err.message);
      }

      try {
        catalogRows = await sql`
          SELECT 
            t.id, t.title, t.duration_ms as "durationMs", t.popularity, t.preview_url as "previewUrl",
            a.id as artist_id, a.name as artist_name, a.genres as artist_genres,
            al.id as album_id, al.name as album_name, al.images as album_images,
            ts.source_type as "sourceType", ts.source_id as "sourceId"
          FROM public.tracks t
          JOIN public.artists a ON t.artist_id = a.id
          LEFT JOIN public.albums al ON t.album_id = al.id
          LEFT JOIN public.track_sources ts ON t.id = ts.track_id
          ORDER BY t.popularity DESC
          LIMIT 50
        `;
      } catch (err: any) {
        console.warn('Failed to fetch catalog rows for cascade:', err.message);
      }

      const trackMap = new Map<string, any>();
      const trackLikes = new Set(likedRows.map(r => r.id));
      const trackPlays = new Map<string, number>();
      historyRows.forEach(r => {
        trackPlays.set(r.id, parseInt(r.play_count || '1', 10));
      });

      const normalizeString = (str: string) => {
        if (!str) return '';
        return str.toLowerCase().replace(/[^\w]/g, '');
      };

      const allRows = [...historyRows, ...likedRows, ...catalogRows];
      
      allRows.forEach(row => {
        const formatted = formatDbTrack(row);
        const titleKey = normalizeString(formatted.title);
        const artistKey = normalizeString(formatted.artist.name);
        const dedupKey = `${titleKey}::${artistKey}`;

        if (!trackMap.has(dedupKey) && !trackMap.has(formatted.id)) {
          trackMap.set(dedupKey, { formatted, raw: row });
          trackMap.set(formatted.id, { formatted, raw: row });
        }
      });

      const uniqueTracks = Array.from(new Set(Array.from(trackMap.values())));

      const scoredTracks = uniqueTracks.map(({ formatted, raw }) => {
        let score = (formatted.popularity || 0) * 0.5;

        if (trackLikes.has(formatted.id)) {
          score += 50;
        }

        const playCount = trackPlays.get(formatted.id) || 0;
        score += playCount * 15;

        const artistName = formatted.artist.name;
        if (userPref.favorite_artists.some((a: string) => normalizeString(a) === normalizeString(artistName))) {
          score += 20;
        }

        let artistGenres: string[] = [];
        if (raw.artist_genres) {
          try {
            artistGenres = typeof raw.artist_genres === 'string' ? JSON.parse(raw.artist_genres) : raw.artist_genres;
          } catch {
            // ignore
          }
        }
        
        if (Array.isArray(artistGenres) && artistGenres.some((g: string) => 
          userPref.favorite_genres.some((fg: string) => normalizeString(fg) === normalizeString(g))
        )) {
          score += 15;
        }

        return { track: formatted, score };
      });

      // Sort by score DESC
      scoredTracks.sort((a, b) => b.score - a.score);

      // Apply diversity constraint (max 3 tracks per artist/channel)
      const finalTracks: any[] = [];
      const artistCounts = new Map<string, number>();

      for (const item of scoredTracks) {
        const artistId = item.track.artist.id || item.track.artist.name;
        const count = artistCounts.get(artistId) || 0;
        if (count < 3) {
          finalTracks.push(item.track);
          artistCounts.set(artistId, count + 1);
        }
        if (finalTracks.length >= 20) {
          break;
        }
      }

      if (finalTracks.length > 0) {
        tracks = finalTracks;
        source = 'curated';
      }
    }
  } else {
    // Cache the recommended list if it came from Spotify successfully
    if (!seedTrackId && type === 'discover-weekly' && source === 'spotify') {
      try {
        await sql`
          INSERT INTO public.recommendations_cache (user_id, recommended_tracks, updated_at)
          VALUES (${user.id}, ${JSON.stringify(tracks)}::jsonb, NOW())
          ON CONFLICT (user_id) DO UPDATE
          SET recommended_tracks = EXCLUDED.recommended_tracks, updated_at = NOW()
        `;
      } catch (cacheWriteErr: any) {
        console.warn('Failed to write recommendations to cache:', cacheWriteErr.message);
      }
    }
  }

  const safeMessage = fallbackUsed
    ? 'Picked for Your Vibe'
    : 'Discover Weekly Mix';

  return NextResponse.json({
    success: true,
    data: {
      tracks,
    },
    tracks, // backward compatibility
    error: spotifyError ? { message: spotifyError, type: 'SPOTIFY_API_ERROR' } : null,
    fallbackUsed,
    source,
    message: safeMessage,
  });
}
