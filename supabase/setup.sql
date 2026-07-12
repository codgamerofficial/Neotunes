-- Enable pg_trgm extension for fuzzy autocomplete and GIN index searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create auth schema and mock users table if they don't exist (e.g. on external Neon databases)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mock auth helper functions if they don't exist (to support RLS parsing)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
  SELECT NULL::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT AS $$
  SELECT 'authenticated';
$$ LANGUAGE sql STABLE;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Artists Table
CREATE TABLE IF NOT EXISTS public.artists (
  id TEXT PRIMARY KEY, -- Spotify ID or custom UUID
  name TEXT NOT NULL,
  genres TEXT[] DEFAULT '{}',
  popularity INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Albums Table
CREATE TABLE IF NOT EXISTS public.albums (
  id TEXT PRIMARY KEY, -- Spotify ID or custom UUID
  name TEXT NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
  images JSONB DEFAULT '[]'::jsonb,
  release_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tracks Table
CREATE TABLE IF NOT EXISTS public.tracks (
  id TEXT PRIMARY KEY, -- Spotify ID or custom UUID
  title TEXT NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE CASCADE,
  album_id TEXT REFERENCES public.albums(id) ON DELETE CASCADE,
  duration_ms INTEGER DEFAULT 0,
  popularity INTEGER DEFAULT 0,
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Track Sources Table (resolves tracks to YouTube stream IDs or Cloud Storage paths)
CREATE TABLE IF NOT EXISTS public.track_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id TEXT REFERENCES public.tracks(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'cloud')),
  source_id TEXT NOT NULL, -- YouTube Video ID or Supabase Storage File Path
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (track_id, source_type)
);

-- 6. Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  is_collaborative BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Playlist Tracks Table
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE NOT NULL,
  track_id TEXT REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (playlist_id, track_id)
);

-- 8. Liked Tracks Table
CREATE TABLE IF NOT EXISTS public.liked_tracks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  track_id TEXT REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, track_id)
);

-- 9. Listening History Table
CREATE TABLE IF NOT EXISTS public.listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  track_id TEXT REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Recent Searches Table
CREATE TABLE IF NOT EXISTS public.recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite_genres TEXT[] DEFAULT '{}',
  favorite_artists TEXT[] DEFAULT '{}',
  playback_quality TEXT DEFAULT 'auto',
  theme TEXT DEFAULT 'dark',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Recommendations Cache Table
CREATE TABLE IF NOT EXISTS public.recommendations_cache (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommended_tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Cloud Uploads Table
CREATE TABLE IF NOT EXISTS public.cloud_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  duration_ms INTEGER DEFAULT 0,
  file_path TEXT NOT NULL, -- Path in Supabase Storage bucket
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  price_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT,
  push_token TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers to auto-create user profile and user_preferences on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );

  -- Insert default user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- -----------------------------------------------------
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- -----------------------------------------------------
-- Trigram Gin indexes for fast fuzzy search
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON public.tracks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON public.artists USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_albums_name_trgm ON public.albums USING gin (name gin_trgm_ops);

-- Composite / Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_tracks_artist_album ON public.tracks (artist_id, album_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks (playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON public.playlist_tracks (playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_listening_history_user ON public.listening_history (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_liked_tracks_user ON public.liked_tracks (user_id);

-- -----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liked_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view, only owner can edit
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Artists, Albums, Tracks, Track Sources: Viewable by authenticated users
DROP POLICY IF EXISTS "Artists viewable by authenticated users" ON public.artists;
CREATE POLICY "Artists viewable by authenticated users" ON public.artists
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Albums viewable by authenticated users" ON public.albums;
CREATE POLICY "Albums viewable by authenticated users" ON public.albums
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Tracks viewable by authenticated users" ON public.tracks;
CREATE POLICY "Tracks viewable by authenticated users" ON public.tracks
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Track sources viewable by authenticated users" ON public.track_sources;
CREATE POLICY "Track sources viewable by authenticated users" ON public.track_sources
  FOR SELECT USING (auth.role() = 'authenticated');

-- Playlists: Public playlists viewable by all authenticated users, private only by owner
DROP POLICY IF EXISTS "Playlists select policy" ON public.playlists;
CREATE POLICY "Playlists select policy" ON public.playlists
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Playlists insert policy" ON public.playlists;
CREATE POLICY "Playlists insert policy" ON public.playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Playlists update policy" ON public.playlists;
CREATE POLICY "Playlists update policy" ON public.playlists
  FOR UPDATE USING (auth.uid() = user_id OR is_collaborative = true);
DROP POLICY IF EXISTS "Playlists delete policy" ON public.playlists;
CREATE POLICY "Playlists delete policy" ON public.playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Playlist Tracks: Viewable if playlist is accessible. Editable by owner or if collaborative.
DROP POLICY IF EXISTS "Playlist tracks select policy" ON public.playlist_tracks;
CREATE POLICY "Playlist tracks select policy" ON public.playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.playlists p 
      WHERE p.id = playlist_id AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "Playlist tracks insert policy" ON public.playlist_tracks;
CREATE POLICY "Playlist tracks insert policy" ON public.playlist_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p 
      WHERE p.id = playlist_id AND (p.user_id = auth.uid() OR p.is_collaborative = true)
    )
  );
DROP POLICY IF EXISTS "Playlist tracks update/delete policy" ON public.playlist_tracks;
CREATE POLICY "Playlist tracks update/delete policy" ON public.playlist_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.playlists p 
      WHERE p.id = playlist_id AND (p.user_id = auth.uid() OR p.is_collaborative = true)
    )
  );

-- Liked Tracks: Users can manage their own likes
DROP POLICY IF EXISTS "Liked tracks access policy" ON public.liked_tracks;
CREATE POLICY "Liked tracks access policy" ON public.liked_tracks
  FOR ALL USING (auth.uid() = user_id);

-- Listening History: Users can manage their own history
DROP POLICY IF EXISTS "Listening history access policy" ON public.listening_history;
CREATE POLICY "Listening history access policy" ON public.listening_history
  FOR ALL USING (auth.uid() = user_id);

-- Recent Searches: Users can manage their own searches
DROP POLICY IF EXISTS "Recent searches access policy" ON public.recent_searches;
CREATE POLICY "Recent searches access policy" ON public.recent_searches
  FOR ALL USING (auth.uid() = user_id);

-- User Preferences: Users can manage their own preferences
DROP POLICY IF EXISTS "User preferences access policy" ON public.user_preferences;
CREATE POLICY "User preferences access policy" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Recommendations Cache: Users can manage their own cache
DROP POLICY IF EXISTS "Recommendations cache access policy" ON public.recommendations_cache;
CREATE POLICY "Recommendations cache access policy" ON public.recommendations_cache
  FOR ALL USING (auth.uid() = user_id);

-- Cloud Uploads: Users can manage their own uploads
DROP POLICY IF EXISTS "Cloud uploads access policy" ON public.cloud_uploads;
CREATE POLICY "Cloud uploads access policy" ON public.cloud_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Notifications: Users can view and update their own notifications
DROP POLICY IF EXISTS "Notifications access policy" ON public.notifications;
CREATE POLICY "Notifications access policy" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- Subscriptions: Users can view their own subscriptions
DROP POLICY IF EXISTS "Subscriptions access policy" ON public.subscriptions;
CREATE POLICY "Subscriptions access policy" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Devices: Users can manage their own devices
DROP POLICY IF EXISTS "Devices access policy" ON public.devices;
CREATE POLICY "Devices access policy" ON public.devices
  FOR ALL USING (auth.uid() = user_id);
