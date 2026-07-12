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
    // List playlists owned by user, or public playlists
    const playlists = await sql`
      SELECT 
        p.*, 
        COUNT(pt.track_id)::integer as "trackCount"
      FROM public.playlists p
      LEFT JOIN public.playlist_tracks pt ON p.id = pt.playlist_id
      WHERE p.user_id = ${user.id} OR p.is_public = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    return NextResponse.json({ playlists });
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
    const { name, description, isPublic, isCollaborative } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Playlist name is required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO public.playlists (name, description, is_public, is_collaborative, user_id)
      VALUES (${name}, ${description || ''}, ${isPublic ?? true}, ${isCollaborative ?? false}, ${user.id})
      RETURNING *
    `;

    return NextResponse.json({ playlist: result[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
