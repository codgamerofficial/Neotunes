import { NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/services/spotify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required.' }, { status: 400 });
  }

  try {
    const token = await getSpotifyAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spotify API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const tracks = data.tracks?.items?.map((item: any) => ({
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
      popularity: item.popularity,
      previewUrl: item.preview_url || '',
      sourceType: 'youtube',
      coverUrl: item.album?.images?.[0]?.url || '',
    })) || [];

    return NextResponse.json({ tracks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
