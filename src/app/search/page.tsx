'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { Search, Play, Pause, Plus, Heart, Disc, Music, Check, FolderPlus } from 'lucide-react';
import Image from 'next/image';

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

  return (
    <div className="space-y-8 text-white pb-12">
      {/* Search Input Banner */}
      <div className="flex flex-col space-y-4 text-left">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Search</h1>
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl">
          <input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="liquid-panel w-full rounded-full px-6 py-3 pl-12 text-sm placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 text-white"
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-neutral-500" />
        </form>
      </div>

      {/* Results viewport */}
      {isFetching ? (
        <div className="flex h-60 items-center justify-center">
          <Disc className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : activeSearch && tracks.length === 0 ? (
        <div className="liquid-panel rounded-xl py-16 text-center text-sm text-neutral-500">
          No matches found for &ldquo;{activeSearch}&rdquo;
        </div>
      ) : tracks.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-left font-bold text-neutral-400 text-xs uppercase tracking-wider">Search Results</h2>
          <div className="space-y-2">
            {tracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedMap[track.id];

              return (
                <div
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className={`liquid-panel liquid-interactive group relative flex items-center justify-between rounded-lg p-3 transition-colors cursor-pointer ${
                    isCurrent ? 'border-emerald-500/20 bg-emerald-500/10' : ''
                  }`}
                >
                  {/* Song Metadata */}
                  <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded bg-neutral-800 flex-shrink-0">
                      {track.coverUrl ? (
                        <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-600 bg-neutral-900">
                          <Music className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="truncate text-left">
                      <p className={`truncate text-sm font-semibold ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-neutral-400">{track.artist.name}</p>
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
                      className={`transition-colors p-2 ${isLiked ? 'text-emerald-400' : 'text-neutral-500 hover:text-white'}`}
                    >
                      <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-emerald-400' : ''}`} />
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
                        <div className="liquid-shell absolute right-0 mt-2 z-50 w-48 rounded-lg p-1.5 shadow-xl text-left">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase px-2 py-1 block border-b border-neutral-800/60 mb-1">
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
                                className="w-full text-left rounded px-2 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-emerald-500 hover:text-black transition-colors truncate block"
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
                      className="text-neutral-400 hover:text-emerald-400 transition-colors p-2"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                      ) : (
                        <Play className="h-5 w-5 text-neutral-400 group-hover:text-emerald-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Default generic search prompts */
        <div className="grid grid-cols-2 gap-4 max-w-xl">
          {[
            { genre: 'Pop', color: 'from-pink-500 to-rose-600' },
            { genre: 'Hip-Hop', color: 'from-purple-500 to-indigo-600' },
            { genre: 'Electronic', color: 'from-blue-500 to-cyan-600' },
            { genre: 'Rock', color: 'from-amber-500 to-orange-600' },
          ].map((item) => (
            <div
              key={item.genre}
              onClick={() => {
                setQuery(item.genre);
                setActiveSearch(item.genre);
              }}
              className={`liquid-interactive cursor-pointer rounded-xl bg-gradient-to-br ${item.color} p-6 shadow-md shadow-black/20 transition-transform hover:scale-[1.03] text-left`}
            >
              <h3 className="text-lg font-bold text-white tracking-wide">{item.genre}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
