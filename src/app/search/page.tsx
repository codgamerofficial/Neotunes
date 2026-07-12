'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Search as SearchIcon, Play, Pause, Heart, Disc, Music, FolderPlus } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: { name: string; id?: string };
  album?: { id?: string; name: string; coverUrl?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
}

export default function SearchPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const supabase = createClientBrowser();

  const [query, setQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeFilter, setFilter] = useState('All');

  // 1. Fetch playlists for the "Add to Playlist" list
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const res = await fetch('/api/playlists');
      if (!res.ok) throw new Error('Failed to fetch playlists');
      return res.json();
    },
  });

  const playlists = playlistsData?.playlists || [];

  // 2. Fetch Hybrid Search Results
  const { data: resultsData, isFetching } = useQuery<{ tracks: Track[] }>({
    queryKey: ['hybrid-search', activeSearch],
    queryFn: async () => {
      if (!activeSearch) return { tracks: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(activeSearch)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!activeSearch,
  });

  const tracks = resultsData?.tracks || [];

  // Client-side filtering logic
  const filteredTracks = React.useMemo(() => {
    if (activeFilter === 'All' || activeFilter === 'Songs') {
      return tracks;
    }
    if (activeFilter === 'Albums') {
      // Deduplicate tracks by album name
      const albumMap = new Map();
      tracks.forEach(t => {
        const albumName = t.album?.name || 'Single';
        if (!albumMap.has(albumName)) {
          albumMap.set(albumName, t);
        }
      });
      return Array.from(albumMap.values());
    }
    return tracks;
  }, [tracks, activeFilter]);

  const filteredPlaylists = React.useMemo(() => {
    if (activeFilter === 'Playlists') {
      return playlists.filter((p: any) =>
        p.name.toLowerCase().includes(activeSearch.toLowerCase())
      );
    }
    return [];
  }, [playlists, activeSearch, activeFilter]);

  // 3. Like song mutation
  const likeMutation = useMutation({
    mutationFn: async (track: Track) => {
      const isLiked = likedMap[track.id];
      const method = isLiked ? 'DELETE' : 'POST';
      const res = await fetch('/api/liked', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, track }),
      });
      if (!res.ok) throw new Error('Failed to like track');
    },
    onSuccess: (_, track) => {
      setLikedMap((prev) => ({ ...prev, [track.id]: !prev[track.id] }));
      queryClient.invalidateQueries({ queryKey: ['liked-songs'] });
    },
  });

  // 4. Add track to playlist mutation
  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, track }: { playlistId: string; track: Track }) => {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_track', track }),
      });
      if (!res.ok) throw new Error('Failed to add track to playlist');
    },
    onSuccess: () => {
      setActiveDropdown(null);
      alert('Track added to playlist!');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setActiveSearch(query.trim());
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, tracks);
      
      // Log track in listening history in database
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, track }),
      }).catch((err) => console.warn('Failed to log history:', err));
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGenreClick = (genreName: string) => {
    setQuery(genreName);
    setActiveSearch(genreName);
  };

  // Reusable genres list
  const genres = [
    { name: "Pop",        emoji: "🎤", gradient: "from-pink-500 to-rose-400",       glow: "shadow-pink-500/30" },
    { name: "Hip-Hop",    emoji: "🎧", gradient: "from-violet-600 to-purple-500",    glow: "shadow-violet-500/30" },
    { name: "Electronic", emoji: "⚡", gradient: "from-blue-500 to-cyan-400",        glow: "shadow-blue-500/30" },
    { name: "Rock",       emoji: "🎸", gradient: "from-orange-500 to-red-400",       glow: "shadow-orange-500/30" },
    { name: "Lo-Fi",      emoji: "☁️", gradient: "from-indigo-600 to-blue-500",     glow: "shadow-indigo-500/30" },
    { name: "Indie",      emoji: "🌿", gradient: "from-emerald-500 to-teal-400",     glow: "shadow-emerald-500/30" },
    { name: "Bollywood",  emoji: "🪘", gradient: "from-amber-500 to-orange-400",    glow: "shadow-amber-500/30" },
    { name: "Chill",      emoji: "🌊", gradient: "from-teal-500 to-cyan-400",        glow: "shadow-teal-500/30" },
    { name: "Workout",    emoji: "🔥", gradient: "from-red-600 to-pink-500",         glow: "shadow-red-500/30" },
  ];

  // Spotlight artists
  const spotlightArtists = [
    { name: 'Daft Punk', genre: 'Electronic', initial: 'DP' },
    { name: 'The Weeknd', genre: 'Pop', initial: 'TW' },
    { name: 'Hans Zimmer', genre: 'Focus', initial: 'HZ' },
  ];

  return (
    <div className="space-y-8 text-white pb-12 font-sans text-left">
      {/* A. PAGE HEADER */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
          NeoTune · Discover
        </p>
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Find your sound.
        </h1>
      </div>

      {/* B. SEARCH BAR — UPGRADE */}
      <div className="relative group max-w-xl">
        {/* Glow layer */}
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 opacity-0 group-focus-within:opacity-100 group-focus-within:from-emerald-500/20 group-focus-within:to-violet-600/20 transition-all duration-300 blur-sm" />

        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-5 py-3.5 focus-within:border-emerald-500/50 transition-colors">
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-neutral-500" />
          <input
            type="text"
            placeholder="What do you want to listen to?"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setActiveSearch('');
              }
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveSearch("");
              }}
              className="text-neutral-500 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* C. FILTER TYPE CHIPS */}
      <div className="flex flex-wrap gap-2">
        {["All", "Songs", "Artists", "Playlists", "Albums"].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === f
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                : "bg-white/[0.05] text-neutral-400 hover:bg-white/[0.08] hover:text-white border border-white/[0.07]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results Viewport */}
      {isFetching ? (
        <div className="flex h-60 items-center justify-center">
          <Disc className="h-10 w-10 animate-spin text-teal-400" />
        </div>
      ) : activeSearch && (filteredTracks.length === 0 && filteredPlaylists.length === 0) ? (
        <div className="liquid-panel rounded-xl py-16 text-center text-sm text-neutral-400 border border-neutral-900">
          No matches found for &ldquo;{activeSearch}&rdquo; under the &ldquo;{activeFilter}&rdquo; filter. Try another search.
        </div>
      ) : activeSearch ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Main Results List */}
          {activeFilter !== 'Playlists' && filteredTracks.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-neutral-400 text-xs uppercase tracking-wider">
                {activeFilter === 'All' ? 'Top Results' : activeFilter}
              </h2>
              <div className="space-y-3">
                {filteredTracks.slice(0, 8).map((track) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isLiked = likedMap[track.id];

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className={`liquid-panel liquid-interactive group relative flex items-center justify-between rounded-xl p-3 transition-colors cursor-pointer border border-neutral-900/50 hover:border-teal-500/25 ${
                        isCurrent ? 'border-teal-500/20 bg-teal-500/5 shadow-[0_0_15px_rgba(20,250,200,0.02)]' : ''
                      }`}
                    >
                      {/* Song Metadata */}
                      <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                              <svg
                                className="h-5 w-5 text-neutral-600"
                                fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" strokeWidth={1.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="truncate text-left">
                          <p className={`truncate text-sm font-bold ${isCurrent ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,240,200,0.3)]' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist?.name || 'Unknown'}</p>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                        <span className="hidden sm:inline text-xs font-mono text-neutral-500">
                          {formatDuration(track.durationMs)}
                        </span>

                        {/* Like button toggle */}
                        <button
                          type="button"
                          onClick={() => likeMutation.mutate(track)}
                          className={`transition-colors p-2 ${isLiked ? 'text-teal-400' : 'text-neutral-500 hover:text-white'}`}
                        >
                          <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-teal-400 stroke-teal-400' : ''}`} />
                        </button>

                        {/* Add to Playlist Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                            className="text-neutral-500 hover:text-white p-2"
                          >
                            <FolderPlus className="h-4.5 w-4.5" />
                          </button>
                          
                          {activeDropdown === track.id && (
                            <div className="liquid-shell absolute right-0 mt-2 z-50 w-48 rounded-lg p-1.5 shadow-xl text-left border border-white/5 bg-neutral-950/90 backdrop-blur-md">
                              <span className="text-[10px] font-extrabold text-neutral-500 uppercase px-2.5 py-1 block border-b border-neutral-900/60 mb-1">
                                Add to playlist
                              </span>
                              {playlists.length === 0 ? (
                                <span className="text-xs text-neutral-500 px-2 py-1 block">
                                  No playlists created yet.
                                </span>
                              ) : (
                                playlists.map((playlist: any) => (
                                  <button
                                    key={playlist.id}
                                    type="button"
                                    onClick={() =>
                                      addToPlaylistMutation.mutate({ playlistId: playlist.id, track })
                                    }
                                    className="w-full text-left rounded px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-teal-500 hover:text-black transition-colors truncate block"
                                  >
                                    {playlist.name}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick play action */}
                        <button
                          type="button"
                          onClick={() => handlePlayTrack(track)}
                          className="text-neutral-400 hover:text-teal-400 transition-colors p-2"
                        >
                          {isCurrent && isPlaying ? (
                            <Pause className="h-5 w-5 text-teal-400 fill-teal-400" />
                          ) : (
                            <Play className="h-5 w-5 text-neutral-400 group-hover:text-teal-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Playlists Search Results View */}
          {activeFilter === 'Playlists' && filteredPlaylists.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-bold text-neutral-400 text-xs uppercase tracking-wider">Playlists</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredPlaylists.map((playlist: any) => (
                  <div
                    key={playlist.id}
                    onClick={() => router.push(`/playlists/${playlist.id}`)}
                    className="liquid-panel liquid-interactive group cursor-pointer rounded-2xl p-4 border border-neutral-900 hover:border-teal-500/25"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-950 mb-3.5 flex items-center justify-center border border-white/[0.06]">
                      <Music className="h-12 w-12 text-neutral-500" />
                    </div>
                    <h3 className="truncate text-sm font-bold text-left">{playlist.name}</h3>
                    <p className="text-xs text-neutral-500 text-left font-semibold">Playlist</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artist Spotlight Section */}
          <div className="space-y-4">
            <h2 className="font-bold text-neutral-400 text-xs uppercase tracking-wider">Artist Spotlight</h2>
            <div className="flex flex-wrap gap-6">
              {spotlightArtists.map((artist) => (
                <div
                  key={artist.name}
                  onClick={() => {
                    setQuery(artist.name);
                    setActiveSearch(artist.name);
                  }}
                  className="liquid-panel liquid-interactive flex items-center space-x-4 rounded-full py-2 px-5 cursor-pointer border border-neutral-900/50 hover:border-teal-500/20"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {artist.initial}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">{artist.name}</p>
                    <p className="text-[10px] text-neutral-505 font-semibold">{artist.genre}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Default Search Screen with Grid of Genres & Moods */
        <div className="space-y-10">
          {/* Discover by Mood Chips */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Discover by Mood
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Chill", color: "from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30" },
                { label: "Focus", color: "from-violet-500/20 to-indigo-500/20 text-violet-300 border-violet-500/30" },
                { label: "Party", color: "from-pink-500/20 to-orange-500/20 text-pink-300 border-pink-500/30" },
                { label: "Romance", color: "from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/30" },
                { label: "Mellow", color: "from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30" },
                { label: "Energetic", color: "from-emerald-500/20 to-lime-500/20 text-emerald-300 border-emerald-500/30" },
              ].map(({ label, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setQuery(label);
                    setActiveSearch(label);
                  }}
                  className={`rounded-full bg-gradient-to-r ${color} border px-4 py-1.5 text-xs font-semibold hover:brightness-125 transition-all`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Genres Grid */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Browse All Genres
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {genres.map(({ name, emoji, gradient, glow }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleGenreClick(name)}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-left hover:scale-[1.03] hover:shadow-xl ${glow} transition-all duration-200`}
                >
                  {/* Decorative blob */}
                  <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-md" />
                  <div className="pointer-events-none absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-black/10" />

                  {/* Content */}
                  <span className="block text-2xl mb-2">{emoji}</span>
                  <span className="text-sm font-bold uppercase tracking-widest text-white drop-shadow">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
