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
    const uploads = await sql`
      SELECT * FROM public.cloud_uploads
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ uploads });
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
    const { title, artist, album, durationMs, filePath } = await request.json();

    if (!title || !filePath) {
      return NextResponse.json({ error: 'Title and file path are required.' }, { status: 400 });
    }

    const trackId = `cloud_${Date.now()}`;
    const artistId = artist ? `local_${normalizeName(artist)}` : 'cloud_artist';
    const albumId = album ? `local_${normalizeName(album)}` : null;

    // 1. Ensure artist exists
    await sql`
      INSERT INTO public.artists (id, name)
      VALUES (${artistId}, ${artist || 'Cloud Uploads'})
      ON CONFLICT (id) DO NOTHING
    `;

    // 2. Ensure album exists
    if (albumId && album) {
      await sql`
        INSERT INTO public.albums (id, name, artist_id)
        VALUES (${albumId}, ${album}, ${artistId})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // 3. Insert track
    await sql`
      INSERT INTO public.tracks (id, title, artist_id, album_id, duration_ms, popularity)
      VALUES (${trackId}, ${title}, ${artistId}, ${albumId}, ${durationMs || 0}, 0)
      ON CONFLICT (id) DO NOTHING
    `;

    // 4. Insert track source
    await sql`
      INSERT INTO public.track_sources (track_id, source_type, source_id)
      VALUES (${trackId}, 'cloud', ${filePath})
      ON CONFLICT (track_id, source_type) DO UPDATE
      SET source_id = EXCLUDED.source_id
    `;

    // 5. Create upload record
    const result = await sql`
      INSERT INTO public.cloud_uploads (user_id, title, artist, album, duration_ms, file_path, status)
      VALUES (
        ${user.id}, 
        ${title}, 
        ${artist || 'Cloud Uploads'}, 
        ${album || 'Single'}, 
        ${durationMs || 0}, 
        ${filePath}, 
        'processed'
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, upload: result[0], trackId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function normalizeName(str: string): string {
  return str.toLowerCase().replace(/[^\w]/g, '');
}
