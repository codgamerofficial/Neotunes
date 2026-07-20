import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { sql, ensureDbUser } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    // 1. Fetch Playlist Info
    const playlistResult = await sql`
      SELECT * FROM public.playlists
      WHERE id = ${id} AND (is_public = true OR user_id = ${user.id})
    `;

    if (playlistResult.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const playlist = playlistResult[0];

    // 2. Fetch Playlist Tracks
    const playlistTracks = await sql`
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
        ts.source_id as "sourceId",
        pt.position
      FROM public.playlist_tracks pt
      JOIN public.tracks t ON pt.track_id = t.id
      JOIN public.artists a ON t.artist_id = a.id
      LEFT JOIN public.albums al ON t.album_id = al.id
      LEFT JOIN public.track_sources ts ON t.id = ts.track_id
      WHERE pt.playlist_id = ${id}
      ORDER BY pt.position ASC
    `;

    const formattedTracks = playlistTracks.map((row: any) => {
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
      };
    });

    return NextResponse.json({
      ...playlist,
      tracks: formattedTracks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    const playlistResult = await sql`
      SELECT * FROM public.playlists
      WHERE id = ${id}
    `;

    if (playlistResult.length === 0) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const playlist = playlistResult[0];

    // Authorization: owner or collaborative flag
    if (playlist.user_id !== user.id && !playlist.is_collaborative) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, ...body } = await request.json();

    if (action === 'update_metadata') {
      const { name, description, isPublic, isCollaborative, coverUrl } = body;
      const updated = await sql`
        UPDATE public.playlists
        SET 
          name = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          is_public = COALESCE(${isPublic}, is_public),
          is_collaborative = COALESCE(${isCollaborative}, is_collaborative),
          cover_url = COALESCE(${coverUrl}, cover_url),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      return NextResponse.json({ playlist: updated[0] });
    }

    if (action === 'add_track') {
      const { track } = body;
      if (!track || !track.id) {
        return NextResponse.json({ error: 'Missing track data' }, { status: 400 });
      }

      const artistId = track.artist.id || `local_${normalizeName(track.artist.name)}`;
      const GENERIC_ALBUM_NAMES = ['youtube video', 'unknown album', 'single', ''];
      const rawAlbumName = track.album?.name || '';
      const isGenericAlbum = GENERIC_ALBUM_NAMES.includes(rawAlbumName.toLowerCase().trim());
      const albumId = track.album?.id || (rawAlbumName && !isGenericAlbum ? `local_${normalizeName(rawAlbumName)}` : null);

      // 1. Ensure artist
      await sql`
        INSERT INTO public.artists (id, name)
        VALUES (${artistId}, ${track.artist.name})
        ON CONFLICT (id) DO NOTHING
      `;

      // 2. Ensure album
      if (albumId && track.album?.name) {
        const albumImages = track.album.coverUrl ? [{ url: track.album.coverUrl }] : [];
        await sql`
          INSERT INTO public.albums (id, name, artist_id, images)
          VALUES (${albumId}, ${track.album.name}, ${artistId}, ${JSON.stringify(albumImages)})
          ON CONFLICT (id) DO NOTHING
        `;
      }

      // 3. Ensure track
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

      // 4. Ensure track source
      if (track.sourceId) {
        await sql`
          INSERT INTO public.track_sources (track_id, source_type, source_id)
          VALUES (${track.id}, ${track.sourceType || 'youtube'}, ${track.sourceId})
          ON CONFLICT (track_id, source_type) DO UPDATE
          SET source_id = EXCLUDED.source_id
        `;
      }

      // 5. Get next position index
      const positionResult = await sql`
        SELECT COALESCE(MAX(position) + 1, 0) as next_pos 
        FROM public.playlist_tracks 
        WHERE playlist_id = ${id}
      `;
      const nextPos = positionResult[0].next_pos;

      // 6. Link to Playlist
      await sql`
        INSERT INTO public.playlist_tracks (playlist_id, track_id, added_by, position)
        VALUES (${id}, ${track.id}, ${user.id}, ${nextPos})
        ON CONFLICT (playlist_id, track_id) DO NOTHING
      `;

      return NextResponse.json({ success: true });
    }

    if (action === 'remove_track') {
      const { trackId } = body;
      if (!trackId) {
        return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
      }

      await sql`
        DELETE FROM public.playlist_tracks
        WHERE playlist_id = ${id} AND track_id = ${trackId}
      `;

      return NextResponse.json({ success: true });
    }

    if (action === 'reorder') {
      const { orderedTrackIds } = body; // Array of track IDs in order
      if (!Array.isArray(orderedTrackIds)) {
        return NextResponse.json({ error: 'orderedTrackIds must be an array' }, { status: 400 });
      }

      // Perform reorders in sequence
      for (let i = 0; i < orderedTrackIds.length; i++) {
        await sql`
          UPDATE public.playlist_tracks
          SET position = ${i}
          WHERE playlist_id = ${id} AND track_id = ${orderedTrackIds[i]}
        `;
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    const playlistResult = await sql`
      SELECT * FROM public.playlists
      WHERE id = ${id} AND user_id = ${user.id}
    `;

    if (playlistResult.length === 0) {
      return NextResponse.json({ error: 'Playlist not found or forbidden' }, { status: 404 });
    }

    await sql`
      DELETE FROM public.playlists
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^\w]/g, '');
}
