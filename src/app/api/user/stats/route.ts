import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { sql, ensureDbUser } from '@/lib/db';

export async function GET() {
  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    // 1. Get total likes count
    const likesCountResult = await sql`
      SELECT COUNT(*)::integer as count 
      FROM public.liked_tracks 
      WHERE user_id = ${user.id}
    `;
    const totalLikes = likesCountResult[0]?.count || 0;

    // 2. Get total plays count
    const playsCountResult = await sql`
      SELECT COUNT(*)::integer as count 
      FROM public.listening_history 
      WHERE user_id = ${user.id}
    `;
    const totalPlays = playsCountResult[0]?.count || 0;

    // 3. Get top 5 played tracks
    const topTracks = await sql`
      SELECT 
        t.id, 
        t.title, 
        t.duration_ms as "durationMs",
        a.name as artist_name,
        COUNT(lh.track_id)::integer as play_count,
        al.images as album_images
      FROM public.listening_history lh
      JOIN public.tracks t ON lh.track_id = t.id
      JOIN public.artists a ON t.artist_id = a.id
      LEFT JOIN public.albums al ON t.album_id = al.id
      WHERE lh.user_id = ${user.id}
      GROUP BY t.id, t.title, t.duration_ms, a.name, al.images
      ORDER BY play_count DESC
      LIMIT 5
    `;

    const formattedTracks = topTracks.map((row: any) => {
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
        artist: { name: row.artist_name },
        durationMs: row.durationMs || 0,
        coverUrl,
        playCount: row.play_count,
      };
    });

    // 4. Determine favorite genre (based on artist genre counts in tracks/liked)
    const genresResult = await sql`
      SELECT unnest(a.genres) as genre, COUNT(*)::integer as count
      FROM public.liked_tracks lt
      JOIN public.tracks t ON lt.track_id = t.id
      JOIN public.artists a ON t.artist_id = a.id
      WHERE lt.user_id = ${user.id}
      GROUP BY genre
      ORDER BY count DESC
      LIMIT 1
    `;
    const favoriteGenre = genresResult[0]?.genre || 'Eclectic';

    return NextResponse.json({
      totalLikes,
      totalPlays,
      topTracks: formattedTracks,
      favoriteGenre,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
