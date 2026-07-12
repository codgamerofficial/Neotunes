export interface TrackArtwork {
  artworkUrl: string;
  artworkSource: 'spotify' | 'youtube' | 'fallback';
}

/**
 * Resolves the artwork URL and source according to priority rules:
 * 1. Spotify/Album Artwork
 * 2. YouTube Thumbnail
 * 3. Fallback Placeholder
 */
export function getTrackArtwork(row: {
  album_images?: any;
  sourceType?: string;
  sourceId?: string;
  id?: string;
}): TrackArtwork {
  let coverUrl = '';
  let artworkSource: 'spotify' | 'youtube' | 'fallback' = 'fallback';

  // 1. Priority 1: Spotify/Album Artwork
  if (row.album_images) {
    try {
      const imgs = typeof row.album_images === 'string' 
        ? JSON.parse(row.album_images) 
        : row.album_images;
      if (Array.isArray(imgs) && imgs.length > 0) {
        const url = imgs[0]?.url;
        // Ignore the corrupted kids song fallback url
        if (url && !url.includes('7fxR_IsDt5g')) {
          coverUrl = url;
          artworkSource = 'spotify';
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Priority 2: YouTube Thumbnail Fallback
  if (!coverUrl) {
    const videoId = row.sourceId || (row.sourceType === 'youtube' ? row.id : null);
    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      coverUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      artworkSource = 'youtube';
    }
  }

  // 3. Priority 3: Fallback Placeholder
  if (!coverUrl) {
    coverUrl = '/images/default-cover.png';
    artworkSource = 'fallback';
  }

  return { artworkUrl: coverUrl, artworkSource };
}

/**
 * Standard formatter to normalize a database track row into the standard track DTO.
 */
export function formatDbTrack(row: any) {
  const { artworkUrl, artworkSource } = getTrackArtwork(row);

  return {
    id: row.id,
    title: row.title,
    artist: {
      id: row.artist_id || '',
      name: row.artist_name || 'Unknown Artist',
    },
    album: {
      id: row.album_id || '',
      name: row.album_name || 'Unknown Album',
      coverUrl: artworkUrl,
    },
    durationMs: row.durationMs || row.duration_ms || 0,
    popularity: row.popularity || 0,
    previewUrl: row.preview_url || row.previewUrl || '',
    sourceType: (row.sourceType || row.source_type || 'youtube') as 'youtube' | 'cloud',
    sourceId: row.sourceId || row.source_id || undefined,
    coverUrl: artworkUrl,
    artworkUrl,
    artworkSource,
    playedAt: row.playedAt || row.played_at || undefined,
  };
}
