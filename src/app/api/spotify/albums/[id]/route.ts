import { NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/services/spotify';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Support both Promise and plain object formats for Next.js 15
  const resolvedParams = params && typeof (params as any).then === 'function'
    ? await params
    : (params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return NextResponse.json({ error: 'Album ID is required.' }, { status: 400 });
  }

  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Spotify API returned ${response.status}: ${errText}` },
        { status: response.status }
      );
    }

    const albumData = await response.json();
    const coverUrl = albumData.images?.[0]?.url || '';

    // Normalize tracks inside the album
    const tracks = albumData.tracks?.items?.map((item: any) => ({
      id: item.id,
      title: item.name,
      artist: {
        id: item.artists[0]?.id || '',
        name: item.artists[0]?.name || 'Unknown Artist',
      },
      album: {
        id: albumData.id,
        name: albumData.name,
        coverUrl,
      },
      durationMs: item.duration_ms,
      popularity: albumData.popularity || 50,
      previewUrl: item.preview_url || '',
      sourceType: 'youtube',
      coverUrl,
    })) || [];

    const normalizedAlbum = {
      id: albumData.id,
      name: albumData.name,
      coverUrl,
      releaseDate: albumData.release_date || '',
      label: albumData.label || 'Unknown Label',
      artists: albumData.artists?.map((a: any) => ({ id: a.id, name: a.name })) || [],
      tracks,
    };

    return NextResponse.json({ album: normalizedAlbum });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
