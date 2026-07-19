import { NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/services/spotify';
import { sql } from '@/lib/db';
import { normalizeString, correctSpelling, transliterateQuery, getSimilarity } from '@/lib/searchEngine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query || !query.trim()) {
    return NextResponse.json({
      songs: [],
      artists: [],
      albums: [],
      playlists: [],
      genres: [],
      aiSuggestions: []
    });
  }

  const normalized = normalizeString(query);
  const spellChecked = correctSpelling(normalized).corrected;
  const searchTerms = transliterateQuery(spellChecked);

  try {
    const token = await getSpotifyAccessToken();
    
    // Quick Spotify search for suggestion candidates
    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(spellChecked)}&type=track,artist,album,playlist&limit=4`;
    const spotifyRes = await fetch(spotifyUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let songs: any[] = [];
    let artists: any[] = [];
    let albums: any[] = [];
    let playlists: any[] = [];
    let genresSet = new Set<string>();

    if (spotifyRes.ok) {
      const data = await spotifyRes.json();
      
      songs = data.tracks?.items?.map((t: any) => ({
        id: t.id,
        title: t.name,
        artist: t.artists?.[0]?.name || 'Unknown Artist',
        coverUrl: t.album?.images?.[0]?.url || '',
        type: 'song'
      })) || [];

      artists = data.artists?.items?.map((a: any) => {
        a.genres?.slice(0, 2).forEach((g: string) => genresSet.add(g));
        return {
          id: a.id,
          name: a.name,
          coverUrl: a.images?.[0]?.url || '',
          type: 'artist'
        };
      }) || [];

      albums = data.albums?.items?.map((a: any) => ({
        id: a.id,
        name: a.name,
        artist: a.artists?.[0]?.name || 'Unknown Artist',
        coverUrl: a.images?.[0]?.url || '',
        type: 'album'
      })) || [];

      playlists = data.playlists?.items?.map((p: any) => ({
        id: p.id,
        name: p.name,
        coverUrl: p.images?.[0]?.url || '',
        type: 'playlist'
      })) || [];
    }

    // Query local DB for additional matches
    try {
      const localMatches = await sql`
        SELECT t.id, t.title, a.name as artist_name, al.images as album_images
        FROM public.tracks t
        JOIN public.artists a ON t.artist_id = a.id
        LEFT JOIN public.albums al ON t.album_id = al.id
        WHERE similarity(t.title, ${spellChecked}) > 0.12
           OR similarity(a.name, ${spellChecked}) > 0.12
        LIMIT 3
      `;
      localMatches.forEach((row: any) => {
        let coverUrl = '';
        if (row.album_images) {
          try {
            const imgs = typeof row.album_images === 'string' ? JSON.parse(row.album_images) : row.album_images;
            coverUrl = imgs?.[0]?.url || '';
          } catch {}
        }
        // Deduplicate songs by title
        const isDuplicate = songs.some(s => s.title.toLowerCase() === row.title.toLowerCase());
        if (!isDuplicate) {
          songs.push({
            id: row.id,
            title: row.title,
            artist: row.artist_name,
            coverUrl,
            type: 'song'
          });
        }
      });
    } catch (err) {
      console.warn('DB suggestions match failed:', err);
    }

    // Filter genres matching query
    const genresList = Array.from(genresSet).filter(g => g.toLowerCase().includes(normalized));
    if (genresList.length === 0 && genresSet.size > 0) {
      genresList.push(...Array.from(genresSet).slice(0, 3));
    }

    // AI Suggestions
    const aiSuggestions: string[] = [];
    if (songs.length > 0) {
      aiSuggestions.push(`songs like ${songs[0].title}`);
      aiSuggestions.push(`${songs[0].artist} focus mix`);
    } else {
      aiSuggestions.push(`similar to ${spellChecked}`);
      aiSuggestions.push(`${spellChecked} party mix`);
    }
    
    const moods = ['sad', 'romantic', 'gym', 'workout', 'rain', 'study', 'sleep', 'relax', 'party', 'edm'];
    const matchedMood = moods.find(m => normalized.includes(m));
    if (matchedMood) {
      aiSuggestions.push(`Generate AI DJ mix for ${matchedMood}`);
    }

    return NextResponse.json({
      songs: songs.slice(0, 5),
      artists: artists.slice(0, 3),
      albums: albums.slice(0, 3),
      playlists: playlists.slice(0, 3),
      genres: genresList.slice(0, 3),
      aiSuggestions: aiSuggestions.slice(0, 3)
    });
  } catch (err: any) {
    console.error('Suggestions endpoint error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
