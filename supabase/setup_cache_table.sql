-- Create metadata_cache table for storing resolved unified tracks
CREATE TABLE IF NOT EXISTS public.metadata_cache (
  spotify_id TEXT PRIMARY KEY,
  youtube_video_id TEXT NOT NULL,
  album_art TEXT,
  artist_image TEXT,
  duration INTEGER NOT NULL,
  release_date TEXT,
  genres TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup of updated entries
CREATE INDEX IF NOT EXISTS idx_metadata_cache_last_updated ON public.metadata_cache (last_updated);
