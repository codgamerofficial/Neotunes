export interface Artist {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  images?: { url: string; width?: number; height?: number }[];
}

export interface Album {
  id: string;
  name: string;
  artistId?: string;
  artistName?: string;
  images?: { url: string; width?: number; height?: number }[];
  releaseDate?: string;
}

export interface Track {
  id: string; // Spotify ID or local UUID
  title: string;
  artist: {
    id?: string;
    name: string;
  };
  album?: {
    id?: string;
    name: string;
    coverUrl?: string;
  };
  durationMs: number;
  popularity?: number;
  previewUrl?: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string; // YouTube Video ID or Supabase Storage file path
  coverUrl?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  isCollaborative: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  tracks?: Track[];
}

export interface UserProfile {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  favoriteGenres: string[];
  favoriteArtists: string[];
  playbackQuality: 'auto' | 'high' | 'low';
  theme: 'dark' | 'light';
}
