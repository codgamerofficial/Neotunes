import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { ensureDbUser } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('filePath');

  if (!filePath) {
    return NextResponse.json({ error: 'filePath parameter is required.' }, { status: 400 });
  }

  const supabase = await createClientServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDbUser(user);

  try {
    // Generate secure URL with 1-hour expiration
    const { data, error } = await supabase.storage
      .from('cloud_songs')
      .createSignedUrl(filePath, 3600);

    if (error) {
      throw error;
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
