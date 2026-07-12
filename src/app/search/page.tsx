'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Search, Play, Pause, Heart, Disc, Music, FolderPlus, Sparkles, User } from 'lucide-react';
import Image from 'next/image';
import { MusicCoverArt } from '@/components/ui/MusicCoverArt';

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
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const supabase = createClientBrowser();

  const [query, setQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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

  // Reusable genres list
  const genres = [
    { genre: 'Pop', color: 'from-pink-500 to-orange-400' },
    { genre: 'Hip-Hop', color: 'from-purple-600 to-pink-500' },
    { genre: 'Electronic', color: 'from-blue-600 to-cyan-400' },
    { genre: 'Rock', color: 'from-orange-500 to-red-600' },
    { genre: 'Lo-Fi', color: 'from-indigo-600 to-violet-500' },
    { genre: 'Indie', color: 'from-teal-500 to-emerald-400' },
    { genre: 'Bollywood', color: 'from-amber-500 to-rose-500' },
    { genre: 'Chill', color: 'from-teal-400 to-blue-500' },
    { genre: 'Workout', color: 'from-red-500 to-pink-500' },
  ];

  // Reusable moods list
  const moods = ['Chill', 'Focus', 'Party', 'Romance', 'Mellow', 'Energetic'];

  // Spotlight artists
  const spotlightArtists = [
    { name: 'Daft Punk', genre: 'Electronic', initial: 'DP' },
    { name: 'The Weeknd', genre: 'Pop', initial: 'TW' },
    { name: 'Hans Zimmer', genre: 'Focus', initial: 'HZ' },
  ];

  return (
    <div className="space-y-10 text-white pb-12 text-left">
      {/* Search Input Banner */}
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Search</h1>
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setActiveSearch('');
            }}
            className="w-full rounded-full bg-neutral-900/80 border border-neutral-800 px-6 py-4 pl-12 text-sm placeholder-neutral-500 outline-none text-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] focus:border-teal-500/50 focus:ring-2 focus:ring-teal-400/20"
          />
          <Search className="absolute left-4.5 top-4 h-5 w-5 text-neutral-500" />
        </form>
      </div>

      {/* Results viewport */}
      {isFetching ? (
        <div className="flex h-60 items-center justify-center">
          <Disc className="h-10 w-10 animate-spin text-teal-400" />
        </div>
      ) : activeSearch && tracks.length === 0 ? (
        <div className="liquid-panel rounded-xl py-16 text-center text-sm text-neutral-400 border border-neutral-900">
          No matches found for &ldquo;{activeSearch}&rdquo;. Try another search.
        </div>
      ) : tracks.length > 0 ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Results Section */}
          <div className="space-y-4">
            <h2 className="font-bold text-neutral-400 text-xs uppercase tracking-wider">Top Results</h2>
            <div className="space-y-3">
              {tracks.slice(0, 5).map((track) => {
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
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-neutral-900 flex-shrink-0">
                        {track.coverUrl ? (
                          <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
                        ) : (
                          <MusicCoverArt title={track.title} className="h-full w-full" iconClassName="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="truncate text-left">
                        <p className={`truncate text-sm font-bold ${isCurrent ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,240,200,0.3)]' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist.name}</p>
                      </div>
                    </div>

                    {/* Actions Section */}
                    <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                      <span className="hidden sm:inline text-xs font-mono text-neutral-500">
                        {formatDuration(track.durationMs)}
                      </span>

                      {/* Like button toggle */}
                      <button
                        onClick={() => likeMutation.mutate(track)}
                        className={`transition-colors p-2 ${isLiked ? 'text-teal-400' : 'text-neutral-500 hover:text-white'}`}
                      >
                        <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-teal-400 stroke-teal-400' : ''}`} />
                      </button>

                      {/* Add to Playlist Dropdown */}
                      <div className="relative">
                        <button
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
                    <p className="text-[10px] text-neutral-500 font-semibold">{artist.genre}</p>
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
          <div className="space-y-4">
            <h2 className="font-bold text-neutral-400 text-xs uppercase tracking-wider">Discover by Mood</h2>
            <div className="flex flex-wrap gap-2.5">
              {moods.map((mood) => (
                <button
                  key={mood}
                  onClick={() => {
                    setQuery(mood);
                    setActiveSearch(mood);
                  }}
                  className="liquid-interactive rounded-full border border-teal-500/20 bg-neutral-950 px-4.5 py-2 text-xs font-bold text-neutral-300 hover:text-teal-400 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all shadow-sm"
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* Genres Grid */}
          <div className="space-y-4">
            <h2 className="font-bold text-neutral-400 text-xs uppercase tracking-wider">Browse All Genres</h2>
            <div className="grid grid-cols-2 gap-4.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {genres.map((item) => (
                <div
                  key={item.genre}
                  onClick={() => {
                    setQuery(item.genre);
                    setActiveSearch(item.genre);
                  }}
                  className={`liquid-interactive group cursor-pointer relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br ${item.color} p-5 shadow-lg shadow-black/15 transition-transform hover:scale-[1.03]`}
                >
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] transition-all group-hover:bg-black/0" />
                  
                  {/* Stylized background geometric shape */}
                  <div className="absolute -right-3 -bottom-3 h-16 w-16 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-500" />
                  
                  <h3 className="absolute inset-x-0 bottom-5 text-center text-base font-black text-white tracking-wider uppercase select-none">
                    {item.genre}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
