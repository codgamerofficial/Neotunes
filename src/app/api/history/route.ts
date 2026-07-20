import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { sql, ensureDbUser } from '@/lib/db';

export async function GET(request: Request) {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    const history = await sql`
      SELECT 
        lh.id as history_id,
        lh.played_at as "playedAt",
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
      FROM public.listening_history lh
      JOIN public.tracks t ON lh.track_id = t.id
      JOIN public.artists a ON t.artist_id = a.id
      LEFT JOIN public.albums al ON t.album_id = al.id
      LEFT JOIN public.track_sources ts ON t.id = ts.track_id
      WHERE lh.user_id = ${user.id}
      ORDER BY lh.played_at DESC
      LIMIT 50
    `;

    const formattedTracks = history.map((row: any) => {
      let coverUrl = '';
      if (row.album_images) {
        try {
          const imgs = typeof row.album_images === 'string' ? JSON.parse(row.album_images) : row.album_images;
          coverUrl = imgs?.[0]?.url || '';
        } catch {
          // ignore
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
        playedAt: row.playedAt,
      };
    });

    return NextResponse.json({ history: formattedTracks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    const { trackId, track } = await request.json();
    if (!trackId || !track) {
      return NextResponse.json({ error: 'Missing trackDetails' }, { status: 400 });
    }

    const artistId = track.artist.id || `local_${normalizeName(track.artist.name)}`;
    // Avoid pooling all YouTube tracks into one shared album (e.g. "YouTube Video").
    // Generic album names get a per-track unique ID so each track keeps its own cover art.
    const GENERIC_ALBUM_NAMES = ['youtube video', 'unknown album', 'single', ''];
    const rawAlbumName = track.album?.name || '';
    const isGenericAlbum = GENERIC_ALBUM_NAMES.includes(rawAlbumName.toLowerCase().trim());
    const albumId = track.album?.id || (rawAlbumName && !isGenericAlbum ? `local_${normalizeName(rawAlbumName)}` : null);

    // 1. Ensure artist exists
    await sql`
      INSERT INTO public.artists (id, name)
      VALUES (${artistId}, ${track.artist.name})
      ON CONFLICT (id) DO NOTHING
    `;

    // 2. Ensure album exists
    if (albumId && track.album?.name) {
      const albumImages = track.album.coverUrl ? [{ url: track.album.coverUrl }] : [];
      await sql`
        INSERT INTO public.albums (id, name, artist_id, images)
        VALUES (${albumId}, ${track.album.name}, ${artistId}, ${JSON.stringify(albumImages)})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // 3. Ensure track exists
    await sql`
      INSERT INTO public.tracks (id, title, artist_id, album_id, duration_ms, popularity, preview_url)
      VALUES (
        ${track.id}, 
        ${track.title}, 
        ${artistId}, 
        ${albumId}, 
        ${track.durationMs || 0}, 
        ${track.popularity || 0}, 
        ${track.previewUrl || ''}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    // 4. Ensure track source exists
    if (track.sourceId) {
      await sql`
        INSERT INTO public.track_sources (track_id, source_type, source_id)
        VALUES (${track.id}, ${track.sourceType || 'youtube'}, ${track.sourceId})
        ON CONFLICT (track_id, source_type) DO UPDATE
        SET source_id = EXCLUDED.source_id
      `;
    }

    // 5. Insert history record
    await sql`
      INSERT INTO public.listening_history (user_id, track_id)
      VALUES (${user.id}, ${track.id})
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^\w]/g, '');
}
