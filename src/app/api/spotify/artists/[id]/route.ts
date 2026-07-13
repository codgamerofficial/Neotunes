import { NextResponse } from 'next/server';
import { getSpotifyAccessToken } from '@/services/spotify';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = params && typeof (params as any).then === 'function'
    ? await params
    : (params as any);
  const id = resolvedParams?.id;

  if (!id) {
    return NextResponse.json({ error: 'Artist ID is required.' }, { status: 400 });
  }

  try {
    const token = await getSpotifyAccessToken();

    // Fetch Artist Info, Top Tracks and Albums in parallel
    const [artistRes, topTracksRes, albumsRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=IN`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&limit=18`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!artistRes.ok) {
      const errText = await artistRes.text();
      return NextResponse.json(
        { error: `Spotify Artist API returned ${artistRes.status}: ${errText}` },
        { status: artistRes.status }
      );
    }

    const artistData = await artistRes.json();
    
    // Top Tracks normalization
    let topTracks = [];
    if (topTracksRes.ok) {
      const topTracksData = await topTracksRes.json();
      topTracks = topTracksData.tracks?.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: {
          id: item.artists[0]?.id || '',
          name: item.artists[0]?.name || 'Unknown Artist',
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
    }

    // Albums normalization
    let albums = [];
    if (albumsRes.ok) {
      const albumsData = await albumsRes.json();
      // Deduplicate albums by name to avoid duplicate deluxe/standard/clean versions
      const seenNames = new Set<string>();
      albums = albumsData.items?.filter((item: any) => {
        const name = item.name.toLowerCase();
        if (seenNames.has(name)) return false;
        seenNames.add(name);
        return true;
      }).map((item: any) => ({
        id: item.id,
        name: item.name,
        coverUrl: item.images?.[0]?.url || '',
        releaseDate: item.release_date || '',
        totalTracks: item.total_tracks || 0,
        type: item.album_type || 'album',
      })) || [];
    }

    const normalizedArtist = {
      id: artistData.id,
      name: artistData.name,
      images: artistData.images || [],
      coverUrl: artistData.images?.[0]?.url || '',
      followers: artistData.followers?.total || 0,
      popularity: artistData.popularity || 0,
      genres: artistData.genres || [],
      topTracks,
      albums,
    };

    return NextResponse.json({ artist: normalizedArtist });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
