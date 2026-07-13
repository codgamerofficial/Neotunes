'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import Image from 'next/image';
import { 
  Search as SearchIcon, 
  Play, 
  Pause, 
  Heart, 
  Disc, 
  Music, 
  FolderPlus, 
  Mic, 
  Clock, 
  TrendingUp, 
  Sparkles,
  Layers,
  Users,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isListening, setIsListening] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Arijit Singh', 'Hanumankind', 'Coldplay Live', 'Synthwave Coding Mix'
  ]);

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
  const { data: resultsData, isFetching } = useQuery<{ tracks: Track[]; topArtist: any }>({
    queryKey: ['hybrid-search', activeSearch],
    queryFn: async () => {
      if (!activeSearch) return { tracks: [], topArtist: null };
      const res = await fetch(`/api/search?q=${encodeURIComponent(activeSearch)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!activeSearch,
  });

  const tracks = resultsData?.tracks || [];
  const topArtist = resultsData?.topArtist || null;

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
      executeSearch(query.trim());
    }
  };

  const executeSearch = (searchTerm: string) => {
    setActiveSearch(searchTerm);
    setQuery(searchTerm);
    if (!recentSearches.includes(searchTerm)) {
      setRecentSearches(prev => [searchTerm, ...prev.slice(0, 5)]);
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

  const startVoiceSearch = () => {
    setIsListening(true);
    // Simulate voice search speech resolution
    setTimeout(() => {
      setIsListening(false);
      executeSearch('Arijit Singh Kesariya');
    }, 2500);
  };

  const genres = [
    { name: "Pop",        emoji: "🎤", gradient: "from-[#00F5FF]/30 to-[#7B61FF]/10",       glow: "shadow-cyan-500/20" },
    { name: "Hip-Hop",    emoji: "🎧", gradient: "from-purple-600/30 to-indigo-500/10",    glow: "shadow-indigo-500/20" },
    { name: "Electronic", emoji: "⚡", gradient: "from-blue-600/30 to-cyan-500/10",        glow: "shadow-blue-500/20" },
    { name: "Bollywood",  emoji: "🪘", gradient: "from-amber-600/30 to-orange-500/10",    glow: "shadow-orange-500/20" },
    { name: "Rock",       emoji: "🎸", gradient: "from-red-600/30 to-pink-500/10",         glow: "shadow-red-500/20" },
    { name: "Lo-Fi",      emoji: "☁️", gradient: "from-neutral-700/30 to-neutral-900/10",     glow: "shadow-neutral-500/10" },
  ];

  return (
    <div className="space-y-8 text-white pb-12 font-sans text-left select-none">
      
      {/* A. PAGE HEADER */}
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
          NeoTunes · AI-First Search
        </p>
        <h1 className="text-4xl font-black tracking-tighter text-white">
          Find your sound.
        </h1>
      </div>

      {/* B. SEARCH BAR & VOICE SEARCH */}
      <div className="flex items-center gap-3 max-w-xl w-full">
        <div className="relative group flex-1">
          {/* Glow layer */}
          <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-500/0 via-purple-600/0 to-cyan-500/0 opacity-0 group-focus-within:opacity-100 group-focus-within:from-cyan-500/20 group-focus-within:to-purple-600/20 transition-all duration-300 blur-sm" />

          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-3 rounded-2xl bg-[#111111]/70 border border-white/[0.08] px-5 py-3.5 focus-within:border-cyan-500/50 transition-colors backdrop-blur-xl">
            <SearchIcon className="h-4 w-4 flex-shrink-0 text-neutral-500" />
            <input
              type="text"
              placeholder="Search songs, artists, podcasts..."
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

        {/* Voice Search Button */}
        <button
          onClick={startVoiceSearch}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] transition-all flex-shrink-0 ${
            isListening 
              ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-lg shadow-cyan-500/30 border-cyan-400 scale-95' 
              : 'bg-[#111111]/70 hover:bg-neutral-900 text-neutral-400 hover:text-white'
          }`}
          title="Voice Search"
        >
          <Mic className={`h-5 w-5 ${isListening ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* Voice Search Active Panel overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-cyan-500/20 bg-cyan-950/10 p-5 text-center text-xs font-semibold text-cyan-400 max-w-xl animate-pulse"
          >
            🎙️ Listening to Saswata... &ldquo;Say a song title or artist name&rdquo;
          </motion.div>
        )}
      </AnimatePresence>

      {/* C. SEARCH LANDING STATE (NO ACTIVE SEARCH) */}
      {!activeSearch && !isListening && (
        <div className="space-y-8 animate-fadeIn">
          {/* Quick Categories grid */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Quick Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {genres.map((g) => (
                <div
                  key={g.name}
                  onClick={() => executeSearch(g.name)}
                  className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${g.gradient} p-4 cursor-pointer hover:border-cyan-500/40 hover:-translate-y-1 transition-all select-none text-left`}
                >
                  <span className="text-xl mb-2 block">{g.emoji}</span>
                  <span className="text-xs font-black text-white">{g.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Searches & Search History */}
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Recent Searches</h3>
                <button 
                  onClick={() => setRecentSearches([])}
                  className="text-[10px] font-black text-neutral-500 hover:text-white uppercase tracking-wider"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => executeSearch(term)}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] px-4 py-2 text-xs font-bold text-neutral-300 transition-all"
                  >
                    <Clock className="h-3 w-3 text-neutral-500" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Today */}
          <div className="space-y-4 pt-4 border-t border-white/[0.05]">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span>Trending Today</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              {[
                { title: 'Big Dawgs', artist: 'Hanumankind', rank: '1' },
                { title: 'Chaleya', artist: 'Arijit Singh', rank: '2' },
                { title: 'Espresso', artist: 'Sabrina Carpenter', rank: '3' },
                { title: 'Feelslikeimfallinginlove', artist: 'Coldplay', rank: '4' }
              ].map((trend) => (
                <div
                  key={trend.title}
                  onClick={() => executeSearch(`${trend.artist} ${trend.title}`)}
                  className="flex items-center gap-3.5 rounded-2xl bg-[#1A1A1A]/30 border border-white/[0.04] p-3 hover:bg-neutral-900 cursor-pointer transition-colors text-left"
                >
                  <span className="text-sm font-black text-neutral-600 w-5 text-center">#{trend.rank}</span>
                  <div>
                    <p className="text-xs font-bold text-white leading-normal">{trend.title}</p>
                    <p className="text-[10px] text-neutral-500 font-semibold leading-normal">{trend.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* D. ACTIVE SEARCH RESULTS (UNIFIED SPOTIFY / YOUTUBE CATALOG) */}
      {activeSearch && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* FILTER CHIPS */}
          <div className="flex flex-wrap gap-2">
            {["All", "Songs", "Artists", "Playlists", "Albums"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all border ${
                  activeFilter === f
                    ? "bg-gradient-to-r from-cyan-400 to-purple-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20"
                    : "bg-white/[0.04] text-neutral-400 hover:bg-[#1A1A1A] hover:text-white border-white/[0.06]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Results list */}
          {isFetching ? (
            <div className="flex h-60 items-center justify-center">
              <Disc className="h-10 w-10 animate-spin text-cyan-400" />
            </div>
          ) : (filteredTracks.length === 0 && filteredPlaylists.length === 0) ? (
            <div className="rounded-2xl py-16 text-center text-sm text-neutral-500 border border-dashed border-white/[0.08]">
              No matches found for &ldquo;{activeSearch}&rdquo;. Try another search term.
            </div>
          ) : (
            <div className="space-y-8 text-left">
              
              {/* Top Artist Result Card */}
              {activeFilter === 'All' && topArtist && (
                <div className="space-y-4">
                  <h2 className="font-black text-neutral-400 text-xs uppercase tracking-wider">Top Result</h2>
                  <div
                    onClick={() => router.push(`/artists/${topArtist.id}`)}
                    className="group relative flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-white/[0.06] bg-[#111111]/40 p-6 hover:border-cyan-500/30 hover:bg-[#1A1A1A]/40 transition-all cursor-pointer max-w-xl text-center sm:text-left select-none overflow-hidden"
                  >
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-2 border-white/[0.08] shadow-2xl bg-neutral-900">
                      {topArtist.coverUrl ? (
                        <Image
                          src={topArtist.coverUrl}
                          alt={topArtist.name}
                          fill
                          sizes="96px"
                          priority
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-850">
                          <Music className="h-10 w-10 text-neutral-600" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-cyan-400">
                        <CheckCircle className="h-4 w-4 fill-cyan-400 text-[#050505]" />
                        <span className="text-[9px] font-black uppercase tracking-[0.25em]">Verified Artist</span>
                      </div>
                      <h3 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors leading-tight">
                        {topArtist.name}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-[10px] text-neutral-400 font-bold">
                        <span>{topArtist.followers.toLocaleString()} followers</span>
                        <span>·</span>
                        <span className="text-cyan-400 font-black">{topArtist.popularity}% Popularity</span>
                      </div>
                      {topArtist.genres?.length > 0 && (
                        <p className="text-[9px] text-neutral-500 font-semibold uppercase tracking-wider truncate max-w-xs">
                          {topArtist.genres.slice(0, 3).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Songs lists */}
              {activeFilter !== 'Playlists' && filteredTracks.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-black text-neutral-400 text-xs uppercase tracking-wider">
                    {activeFilter === 'All' ? 'Songs' : activeFilter}
                  </h2>
                  <div className="space-y-3">
                    {filteredTracks.slice(0, 10).map((track) => {
                      const isCurrent = currentTrack?.id === track.id;
                      const isLiked = likedMap[track.id] || false;

                      // Router pushes to dynamic album/artist details if clicked on title
                      const handleNavigateToAlbum = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        router.push(`/albums/${track.album?.id || '4aawyABuhtvU4upGL7jSMG'}`);
                      };

                      return (
                        <div
                          key={track.id}
                          onClick={() => handlePlayTrack(track)}
                          className={`group relative flex items-center justify-between rounded-2xl p-3 border transition-all cursor-pointer ${
                            isCurrent 
                              ? 'border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_15px_rgba(0,245,255,0.02)]' 
                              : 'border-white/[0.06] bg-[#111111]/40 hover:bg-[#1A1A1A]/40 hover:border-cyan-500/20'
                          }`}
                        >
                          {/* Left: Thumbnail & Meta */}
                          <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-white/[0.05]">
                              {track.coverUrl ? (
                                <Image
                                  src={track.coverUrl}
                                  alt={track.title}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-850 to-neutral-900">
                                  <Music className="h-5 w-5 text-neutral-600" />
                                </div>
                              )}
                            </div>
                            <div className="truncate text-left">
                              <p className={`truncate text-sm font-bold ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white hover:underline'}`} onClick={handleNavigateToAlbum}>
                                {track.title}
                              </p>
                              <p className="truncate text-xs text-neutral-400 font-semibold hover:text-white" onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/artists/${track.artist?.id || '4YRx37jL6VOmbfUnxwSy6g'}`);
                              }}>
                                {track.artist?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                            <span className="hidden sm:inline text-[11px] font-bold text-neutral-500 tabular-nums">
                              {formatDuration(track.durationMs)}
                            </span>

                            {/* Like toggle */}
                            <button
                              type="button"
                              onClick={() => likeMutation.mutate(track)}
                              className={`transition-colors p-2 ${isLiked ? 'text-pink-400' : 'text-neutral-500 hover:text-white'}`}
                            >
                              <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-pink-400 stroke-pink-400' : ''}`} />
                            </button>

                            {/* Add to Playlist button & dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                                className="text-neutral-500 hover:text-white p-2"
                              >
                                <FolderPlus className="h-4.5 w-4.5" />
                              </button>
                              
                              {activeDropdown === track.id && (
                                <div className="absolute right-0 mt-2 z-50 w-48 rounded-2xl p-2 shadow-2xl border border-white/10 bg-[#111111]/90 backdrop-blur-xl">
                                  <span className="text-[10px] font-black text-neutral-500 uppercase px-2 py-1 block border-b border-white/[0.05] mb-1">
                                    Add to playlist
                                  </span>
                                  {playlists.length === 0 ? (
                                    <span className="text-xs text-neutral-500 px-2 py-1 block">
                                      No playlists created.
                                    </span>
                                  ) : (
                                    playlists.map((p: any) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => addToPlaylistMutation.mutate({ playlistId: p.id, track })}
                                        className="w-full text-left rounded-xl px-2 py-1.5 text-xs font-bold text-neutral-300 hover:bg-cyan-500 hover:text-black transition-colors truncate block"
                                      >
                                        {p.name}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Play overlay button */}
                            <button
                              type="button"
                              onClick={() => handlePlayTrack(track)}
                              className="text-neutral-400 hover:text-cyan-400 transition-colors p-2"
                            >
                              {isCurrent && isPlaying ? (
                                <Pause className="h-5 w-5 text-cyan-400 fill-cyan-400" />
                              ) : (
                                <Play className="h-5 w-5 text-neutral-400 group-hover:text-cyan-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Playlists matches */}
              {activeFilter === 'Playlists' && filteredPlaylists.length > 0 && (
                <div className="space-y-4">
                  <h2 className="font-black text-neutral-400 text-xs uppercase tracking-wider">Playlists</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                    {filteredPlaylists.map((playlist: any) => (
                      <div
                        key={playlist.id}
                        onClick={() => router.push(`/playlists/${playlist.id}`)}
                        className="group cursor-pointer rounded-2xl bg-[#111111]/40 border border-white/[0.06] p-4 hover:border-cyan-500/30 hover:-translate-y-1 transition-all"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900 mb-3 flex items-center justify-center border border-white/[0.05]">
                          <Music className="h-10 w-10 text-neutral-600" />
                        </div>
                        <h3 className="truncate text-xs font-bold text-left">{playlist.name}</h3>
                        <p className="text-[10px] text-neutral-500 text-left font-bold uppercase">Playlist</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}
