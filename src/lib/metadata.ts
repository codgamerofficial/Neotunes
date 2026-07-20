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

  const trackVideoId = row.sourceId || (row.sourceType === 'youtube' ? row.id : null);

  // 1. Priority 1: Spotify/Album Artwork (but reject corrupted shared YouTube thumbnails)
  if (row.album_images) {
    try {
      const imgs = typeof row.album_images === 'string' 
        ? JSON.parse(row.album_images) 
        : row.album_images;
      if (Array.isArray(imgs) && imgs.length > 0) {
        const url = imgs[0]?.url;
        if (url) {
          // Check if this album image is a YouTube thumbnail
          const ytThumbMatch = url.match(/i\.ytimg\.com\/vi\/([^/]+)\//);
          if (ytThumbMatch) {
            // It's a YouTube thumbnail — only use it if it matches THIS track's video ID.
            // This prevents the shared "local_youtubevideo" album from poisoning all tracks
            // with one video's thumbnail.
            if (trackVideoId && ytThumbMatch[1] === trackVideoId) {
              coverUrl = url;
              artworkSource = 'youtube';
            }
            // Otherwise skip it — let the fallback below generate the correct thumbnail.
          } else {
            // Not a YouTube thumbnail (Spotify, Deezer, iTunes, etc.) — always trust it
            coverUrl = url;
            artworkSource = 'spotify';
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  // 2. Priority 2: YouTube Thumbnail from the track's own sourceId
  if (!coverUrl) {
    if (trackVideoId && /^[a-zA-Z0-9_-]{11}$/.test(trackVideoId)) {
      coverUrl = `https://i.ytimg.com/vi/${trackVideoId}/hqdefault.jpg`;
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
