import { sql } from '@/lib/db';
import { getSpotifyAccessToken } from '@/services/spotify';

export interface UnifiedTrack {
  id: string; // Spotify Track ID
  title: string;
  artist: {
    id: string;
    name: string;
  };
  album: {
    id: string;
    name: string;
    coverUrl: string;
    releaseDate: string;
    label?: string;
  };
  artistImage: string;
  durationMs: number;
  explicit: boolean;
  genres: string[];
  popularity: number;
  sourceType: 'youtube' | 'cloud';
  sourceId: string; // Linked YouTube Video ID
  copyright?: string;
  spotifyUri?: string;
  youtubeChannel?: string;
}

// Helper to normalize strings for matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Parse ISO 8601 duration (PT3M45S) into milliseconds
function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 180000;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

// Calculate confidence score for YouTube matching
export function calculateYoutubeConfidence(
  track: { title: string; artist: string; durationMs: number },
  ytVideo: { title: string; channelTitle: string; durationMs: number }
): number {
  const normTrackTitle = normalizeString(track.title);
  const normTrackArtist = normalizeString(track.artist);
  const normYtTitle = normalizeString(ytVideo.title);
  const normYtChannel = normalizeString(ytVideo.channelTitle);

  // Reject bad uploads immediately (covers, reactions, mashups, speedups)
  const excludeKeywords = ['lyric', 'fan', 'reaction', 'shorts', 'mashup', '8d', 'boosted', 'nightcore', 'reverb', 'slowed', 'compilation', 'cover'];
  const hasExcludeKeyword = excludeKeywords.some(
    keyword => normYtTitle.includes(keyword) && !normTrackTitle.includes(keyword)
  );
  if (hasExcludeKeyword) return 0;

  let score = 0;

  // 1. Artist Match (up to 30 points)
  const channelContainsArtist = normYtChannel.includes(normTrackArtist);
  const titleContainsArtist = normYtTitle.includes(normTrackArtist);
  if (channelContainsArtist) {
    score += 30;
  } else if (titleContainsArtist) {
    score += 20;
  }

  // 2. Title Match (up to 35 points)
  if (normYtTitle.includes(normTrackTitle)) {
    // Exact or near-exact match
    const titleWithoutArtist = normYtTitle.replace(normTrackArtist, '').trim();
    if (titleWithoutArtist === normTrackTitle || normYtTitle === normTrackTitle) {
      score += 35;
    } else {
      score += 28;
    }
  } else {
    // Word overlap match
    const trackWords = normTrackTitle.split(/\s+/);
    const matchedWords = trackWords.filter(word => normYtTitle.includes(word));
    const overlapRatio = matchedWords.length / trackWords.length;
    score += overlapRatio * 20;
  }

  // 3. Duration Match (up to 25 points)
  const durationDiff = Math.abs(track.durationMs - ytVideo.durationMs);
  if (durationDiff <= 2000) {
    score += 25;
  } else if (durationDiff <= 5000) {
    score += 20;
  } else if (durationDiff <= 10000) {
    score += 12;
  } else if (durationDiff <= 20000) {
    score += 5;
  } else {
    score -= 15; // heavily penalize major duration mismatch
  }

  // 4. Channel Vibe and Verification (up to 10 points)
  const isOfficialVibe =
    normYtChannel.includes('topic') ||
    normYtChannel.includes('vevo') ||
    normYtChannel.includes('official') ||
    ytVideo.channelTitle.endsWith(' - Topic');
  if (isOfficialVibe) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

// iTunes/Apple Music, Deezer, and MusicBrainz Artwork fallback resolver
export async function fetchFallbackArtwork(title: string, artist: string): Promise<string | null> {
  const query = `${artist} ${title}`;

  // 1. iTunes/Apple Music Search
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1&entity=song`);
    if (res.ok) {
      const data = await res.json();
      const art = data.results?.[0]?.artworkUrl100;
      if (art) {
        return art.replace('100x100bb.jpg', '600x600bb.jpg');
      }
    }
  } catch (err) {
    console.warn('iTunes artwork fallback failed:', err);
  }

  // 2. Deezer Search
  try {
    const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const art = data.data?.[0]?.album?.cover_xl || data.data?.[0]?.album?.cover_big;
      if (art) return art;
    }
  } catch (err) {
    console.warn('Deezer artwork fallback failed:', err);
  }

  // 3. MusicBrainz + CoverArtArchive
  try {
    const mbRes = await fetch(
      `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(title + ' AND artist:' + artist)}&fmt=json`,
      { headers: { 'User-Agent': 'NeoTunes/1.0.0 (saswa@example.com)' } }
    );
    if (mbRes.ok) {
      const mbData = await mbRes.json();
      const releaseId = mbData.releases?.[0]?.id;
      if (releaseId) {
        return `https://coverartarchive.org/release/${releaseId}/front`;
      }
    }
  } catch (err) {
    console.warn('MusicBrainz/CAA artwork fallback failed:', err);
  }

  return null;
}

// Master resolution function
export async function resolveTrack(spotifyId: string): Promise<UnifiedTrack> {
  // 1. Check metadata_cache table in Supabase (valid for 30 days)
  try {
    const cached = await sql`
      SELECT * FROM public.metadata_cache 
      WHERE spotify_id = ${spotifyId} 
        AND last_updated > NOW() - INTERVAL '30 days'
      LIMIT 1
    `;
    
    if (cached.length > 0) {
      const row = cached[0];
      // Fetch tracks metadata from the database
      const dbTrack = await sql`
        SELECT 
          t.title, t.duration_ms, t.popularity,
          a.id as artist_id, a.name as artist_name,
          al.id as album_id, al.name as album_name
        FROM public.tracks t
        JOIN public.artists a ON t.artist_id = a.id
        JOIN public.albums al ON t.album_id = al.id
        WHERE t.id = ${spotifyId}
        LIMIT 1
      `;

      if (dbTrack.length > 0) {
        const track = dbTrack[0];
        return {
          id: spotifyId,
          title: track.title,
          artist: { id: track.artist_id, name: track.artist_name },
          album: { id: track.album_id, name: track.album_name, coverUrl: row.album_art, releaseDate: row.release_date },
          artistImage: row.artist_image,
          durationMs: row.duration,
          explicit: false,
          genres: row.genres || [],
          popularity: track.popularity || 0,
          sourceType: 'youtube',
          sourceId: row.youtube_video_id,
        };
      }
    }
  } catch (err) {
    console.warn('Database cache check failed, running full resolution:', err);
  }

  // 2. Fetch track info from Spotify
  const token = await getSpotifyAccessToken();
  const spotifyRes = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!spotifyRes.ok) {
    throw new Error(`Spotify track details returned status ${spotifyRes.status}`);
  }

  const trackData = await spotifyRes.json();
  const artistId = trackData.artists[0]?.id;
  const albumId = trackData.album?.id;

  // Fetch Full Artist & Album in parallel
  const [artistRes, albumRes] = await Promise.all([
    fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  let artistImage = '';
  let genres: string[] = [];
  if (artistRes.ok) {
    const artistData = await artistRes.json();
    artistImage = artistData.images?.[0]?.url || '';
    genres = artistData.genres || [];
  }

  let albumLabel = 'Unknown Label';
  let albumReleaseDate = trackData.album?.release_date || '';
  if (albumRes.ok) {
    const albumData = await albumRes.json();
    albumLabel = albumData.label || albumData.copyrights?.[0]?.text || 'Unknown Label';
  }

  // Fallback Artwork Check
  let albumArt = trackData.album?.images?.[0]?.url || '';
  if (!albumArt) {
    const fallbackArt = await fetchFallbackArtwork(trackData.name, trackData.artists[0]?.name);
    albumArt = fallbackArt || '/images/default-cover.png';
  }

  // 3. YouTube Playback Resolution
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured.');
  }

  const query = `${trackData.artists[0]?.name} ${trackData.name} official audio`;
  const ytSearchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
    query
  )}&type=video&key=${apiKey}&maxResults=4&videoCategoryId=10`;

  let videoId = '';
  let finalYtChannel = 'Unknown';
  let verified = false;

  try {
    let ytResponse = await fetch(ytSearchUrl);
    if (!ytResponse.ok) {
      // Retry without Category restriction
      const fallbackYtUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        `${trackData.artists[0]?.name} ${trackData.name}`
      )}&type=video&key=${apiKey}&maxResults=4`;
      ytResponse = await fetch(fallbackYtUrl);
    }

    const searchData = await ytResponse.json();
    const videoItems = searchData.items || [];
    const videoIds = videoItems.map((item: any) => item.id?.videoId).filter(Boolean);

    if (videoIds.length > 0) {
      // Batch fetch durations and details
      const detailsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(
          ','
        )}&key=${apiKey}`
      );
      
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        let bestConfidence = -1;
        let bestVideoId = '';
        let bestChannel = '';

        for (const item of detailsData.items || []) {
          const ytVideo = {
            title: item.snippet?.title || '',
            channelTitle: item.snippet?.channelTitle || '',
            durationMs: parseYouTubeDuration(item.contentDetails?.duration || ''),
          };

          const confidence = calculateYoutubeConfidence(
            { title: trackData.name, artist: trackData.artists[0]?.name, durationMs: trackData.duration_ms },
            ytVideo
          );

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestVideoId = item.id;
            bestChannel = item.snippet?.channelTitle;
          }
        }

        // High confidence match >95% (we use 90% threshold for safe relaxed fallback matching if needed, but user wants strictly >95% for perfect link, otherwise we fallback to the highest available score)
        if (bestConfidence >= 95) {
          videoId = bestVideoId;
          finalYtChannel = bestChannel;
          verified = true;
        } else {
          // If no perfect verified match, use the highest scorer as relaxed fallback, or fallback to YouTube's top search result video ID
          videoId = bestVideoId || videoIds[0];
          finalYtChannel = bestChannel || videoItems[0]?.snippet?.channelTitle || '';
        }
      }
    }
  } catch (err) {
    console.warn('YouTube matching search failed:', err);
  }

  // Final fallback to top search result if something broke in detailed parsing
  if (!videoId) {
    videoId = `yt_${spotifyId}`; // generic fallback
  }

  // 4. Save/Update cache in Supabase
  try {
    // Save Artist
    await sql`
      INSERT INTO public.artists (id, name, genres, popularity, images)
      VALUES (${artistId}, ${trackData.artists[0].name}, ${genres}, ${trackData.artists[0].popularity || 50}, ${JSON.stringify([{ url: artistImage }])})
      ON CONFLICT (id) DO UPDATE SET 
        genres = EXCLUDED.genres,
        popularity = EXCLUDED.popularity,
        images = EXCLUDED.images
    `;

    // Save Album
    await sql`
      INSERT INTO public.albums (id, name, artist_id, images, release_date)
      VALUES (${albumId}, ${trackData.album.name}, ${artistId}, ${JSON.stringify([{ url: albumArt }])}, ${albumReleaseDate})
      ON CONFLICT (id) DO UPDATE SET 
        images = EXCLUDED.images,
        release_date = EXCLUDED.release_date
    `;

    // Save Track
    await sql`
      INSERT INTO public.tracks (id, title, artist_id, album_id, duration_ms, popularity, preview_url)
      VALUES (${spotifyId}, ${trackData.name}, ${artistId}, ${albumId}, ${trackData.duration_ms}, ${trackData.popularity || 50}, ${trackData.preview_url || ''})
      ON CONFLICT (id) DO UPDATE SET 
        popularity = EXCLUDED.popularity
    `;

    // Save Track Source
    await sql`
      INSERT INTO public.track_sources (track_id, source_type, source_id)
      VALUES (${spotifyId}, 'youtube', ${videoId})
      ON CONFLICT (track_id, source_type) DO UPDATE SET 
        source_id = EXCLUDED.source_id
    `;

    // Save Metadata Cache (valid for 30 days)
    await sql`
      INSERT INTO public.metadata_cache (spotify_id, youtube_video_id, album_art, artist_image, duration, release_date, genres, last_updated)
      VALUES (${spotifyId}, ${videoId}, ${albumArt}, ${artistImage}, ${trackData.duration_ms}, ${albumReleaseDate}, ${genres}, NOW())
      ON CONFLICT (spotify_id) DO UPDATE SET
        youtube_video_id = EXCLUDED.youtube_video_id,
        album_art = EXCLUDED.album_art,
        artist_image = EXCLUDED.artist_image,
        duration = EXCLUDED.duration,
        release_date = EXCLUDED.release_date,
        genres = EXCLUDED.genres,
        last_updated = NOW()
    `;
  } catch (err) {
    console.error('Failed to update cache in Supabase:', err);
  }

  return {
    id: spotifyId,
    title: trackData.name,
    artist: {
      id: artistId,
      name: trackData.artists[0]?.name,
    },
    album: {
      id: albumId,
      name: trackData.album?.name,
      coverUrl: albumArt,
      releaseDate: albumReleaseDate,
      label: albumLabel,
    },
    artistImage,
    durationMs: trackData.duration_ms,
    explicit: trackData.explicit || false,
    genres,
    popularity: trackData.popularity || 0,
    sourceType: 'youtube',
    sourceId: videoId,
    spotifyUri: trackData.uri,
    youtubeChannel: finalYtChannel,
  };
}
