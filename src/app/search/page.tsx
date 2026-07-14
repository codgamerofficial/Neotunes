'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { 
  Search as SearchIcon, 
  Play, 
  Pause, 
  Heart, 
  Disc, 
  Music, 
  FolderPlus, 
  Mic, 
  MicOff,
  Clock, 
  TrendingUp, 
  Sparkles,
  Users,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  Download,
  MoreVertical,
  Plus,
  PlayCircle,
  Radio,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Track {
  id: string;
  title: string;
  artist: { name: string; id?: string; avatarUrl?: string };
  album?: { id?: string; name: string; coverUrl?: string; releaseDate?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
  isHQ?: boolean;
  explicit?: boolean;
  popularity?: number;
}

interface TopArtist {
  id: string;
  name: string;
  coverUrl: string;
  followers: number;
  popularity: number;
  genres: string[];
  verified: boolean;
  country?: string;
  monthlyListeners?: number;
}

interface GroupedSearchResponse {
  topArtist: TopArtist | null;
  artists: any[];
  songs: Track[];
  albums: any[];
  playlists: any[];
  videos: Track[];
  podcasts: Track[];
  covers: Track[];
  live: Track[];
  aiMix: any | null;
  cached: boolean;
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
  
  // Voice Search states
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Collapsible sections toggle states
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({
    topArtist: false,
    songs: false,
    albums: false,
    playlists: false,
    videos: false,
    podcasts: true, // Collapsed by default to clean screen
    covers: true,
    live: false,
    artists: false
  });

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Sync recent searches from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('neotunes-recent-searches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {}
      } else {
        const defaults = ['Arijit Singh', 'Hanumankind', 'Coldplay', 'Espresso'];
        setRecentSearches(defaults);
        localStorage.setItem('neotunes-recent-searches', JSON.stringify(defaults));
      }
    }
  }, []);

  // Fetch listening history for empty-state suggestions
  const { data: historyData } = useQuery<{ history: Track[] }>({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });
  const continueListening = historyData?.history || [];

  // Fetch user playlists
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const res = await fetch('/api/playlists');
      if (!res.ok) throw new Error('Failed to fetch playlists');
      return res.json();
    },
  });
  const userPlaylists = playlistsData?.playlists || [];

  // Fetch Grouped Search Results
  const { data: searchResults, isFetching } = useQuery<GroupedSearchResponse>({
    queryKey: ['grouped-search', activeSearch],
    queryFn: async () => {
      if (!activeSearch) return { topArtist: null, artists: [], songs: [], albums: [], playlists: [], videos: [], podcasts: [], covers: [], live: [], aiMix: null, cached: false };
      const res = await fetch(`/api/search?q=${encodeURIComponent(activeSearch)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!activeSearch,
  });

  const topArtist = searchResults?.topArtist || null;
  const artistsList = searchResults?.artists || [];
  const songsList = searchResults?.songs || [];
  const albumsList = searchResults?.albums || [];
  const playlistsList = searchResults?.playlists || [];
  const videosList = searchResults?.videos || [];
  const podcastsList = searchResults?.podcasts || [];
  const coversList = searchResults?.covers || [];
  const liveList = searchResults?.live || [];
  const aiMix = searchResults?.aiMix || null;

  // Like track Mutation
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

  // Add track to playlist Mutation
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
      alert('Song added to playlist!');
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
    setIsInputFocused(false);
    
    // Save to local storage searches
    let updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('neotunes-recent-searches', JSON.stringify(updated));
  };

  const handlePlayTrack = (track: Track, tracksList: Track[]) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, tracksList);
      
      // Log to database listening history
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

  // Web Speech API Voice Search
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError('');
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setSpeechError('Speech input not recognized. Try again.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          executeSearch(text);
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Voice Search is not supported in this browser. Try Chrome/Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const toggleCollapse = (section: string) => {
    setSectionsCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Counts for each filter tab
  const getFilterCounts = () => {
    return {
      Songs: songsList.length,
      Artists: artistsList.length + (topArtist ? 1 : 0),
      Albums: albumsList.length,
      Playlists: playlistsList.length,
      Videos: videosList.length,
      Podcasts: podcastsList.length,
      Live: liveList.length
    };
  };
  const counts = getFilterCounts();

  return (
    <div className="space-y-8 text-white pb-20 font-sans text-left select-none w-full relative">
      
      {/* A. PAGE HEADER */}
      <div className="space-y-1">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/10 px-3.5 py-1.5 rounded-full border border-cyan-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          <span>NeoTunes AI Music Search Engine</span>
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-none pt-2">
          Discover Sound & Intent
        </h1>
      </div>

      {/* B. SEARCH INPUT BAR WITH AUTO-COMPLETE DROPDOWN */}
      <div className="relative max-w-xl w-full">
        <div className="flex items-center gap-3">
          <div className="relative group flex-1">
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-600/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />

            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-3 rounded-2xl bg-neutral-900/60 border border-white/[0.08] px-5 py-4 focus-within:border-cyan-500/50 transition-colors backdrop-blur-xl">
              <SearchIcon className="h-4.5 w-4.5 flex-shrink-0 text-neutral-500" />
              <input
                type="text"
                placeholder="Search songs, artists, playlists, or try AI mixes..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                value={query}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
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
                  className="text-neutral-500 hover:text-white transition-colors text-xs p-1"
                >
                  ✕
                </button>
              )}
            </form>
          </div>

          {/* Voice Search Button */}
          <button
            onClick={toggleVoiceSearch}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all flex-shrink-0 ${
              isListening 
                ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-lg shadow-cyan-500/30 border-cyan-400 scale-95' 
                : 'bg-neutral-900/60 border-white/[0.08] hover:bg-neutral-800 text-neutral-450 hover:text-white'
            }`}
            title="Voice Search"
          >
            {isListening ? <Mic className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>

        {/* VOICE RECORDING OVERLAY STATE */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 mt-3 z-50 rounded-2xl border border-cyan-500/20 bg-neutral-950/90 backdrop-blur-xl p-5 text-center text-xs font-semibold text-cyan-400 flex items-center justify-center gap-3.5 shadow-xl"
            >
              <div className="flex gap-1 items-center justify-center h-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.div
                    key={i}
                    animate={{ height: [6, 20, 6] }}
                    transition={{ repeat: Infinity, duration: 0.6 + i * 0.1, ease: 'easeInOut' }}
                    className="w-1 bg-cyan-400 rounded-full"
                  />
                ))}
              </div>
              <span>Listening... say artist, song or genre mix...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {speechError && (
          <p className="text-xs text-rose-400 mt-2 font-semibold">{speechError}</p>
        )}

        {/* AUTO-COMPLETE DROPDOWN */}
        <AnimatePresence>
          {isInputFocused && (query.trim() || recentSearches.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 mt-2.5 z-40 rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/95 backdrop-blur-xl shadow-2xl p-4 space-y-4 max-h-[380px] overflow-y-auto"
            >
              {/* If user is typing, show matching guesses */}
              {query.trim() ? (
                <div className="space-y-2 text-left">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Search Guesses</h4>
                  <button
                    onClick={() => executeSearch(query)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all"
                  >
                    <SearchIcon className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Search for &ldquo;{query}&rdquo;</span>
                  </button>
                  {recentSearches.filter(s => s.toLowerCase().includes(query.toLowerCase())).map((term) => (
                    <button
                      key={term}
                      onClick={() => executeSearch(term)}
                      className="w-full flex items-center gap-3 px-2.5 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all"
                    >
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      <span>{term}</span>
                    </button>
                  ))}
                  {/* AI Suggestion bias */}
                  <button
                    onClick={() => executeSearch(`songs similar to ${query}`)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 text-xs font-black text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate AI DJ mix based on &ldquo;{query}&rdquo;</span>
                  </button>
                </div>
              ) : (
                /* If input is focused empty, show recents and trendings */
                <div className="space-y-4 text-left">
                  {recentSearches.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Recent Searches</h4>
                        <button 
                          onClick={() => { setRecentSearches([]); localStorage.setItem('neotunes-recent-searches', JSON.stringify([])); }}
                          className="text-[9px] font-bold text-rose-400 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => executeSearch(term)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] text-xs font-bold text-neutral-300 transition-colors"
                          >
                            <Clock className="h-3 w-3 text-neutral-500" />
                            <span>{term}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Queries */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Trending Searches</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Arijit Singh Kesariya', 'Hanumankind Big Dawgs', 'Sabrina Carpenter Espresso', 'Lofi Sleep Session'].map((term) => (
                        <button
                          key={term}
                          onClick={() => executeSearch(term)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-neutral-900 text-xs font-bold text-neutral-300 transition-colors"
                        >
                          <TrendingUp className="h-3 w-3 text-cyan-400" />
                          <span className="truncate">{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* C. SEARCH LANDING STATE (EMPTY INPUT) */}
      {!activeSearch && (
        <div className="space-y-10 animate-fadeIn text-left">
          
          {/* AI Search Assistant Card */}
          <div className="bg-gradient-to-br from-cyan-500/10 via-purple-600/10 to-transparent border border-white/[0.08] rounded-3xl p-6 relative overflow-hidden shadow-xl max-w-4xl">
            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-20">
              <Sparkles className="h-20 w-20 text-cyan-400 animate-pulse" />
            </div>
            <div className="space-y-3 relative z-10">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5" />
                <span>NeoTunes Smart Search</span>
              </h3>
              <p className="text-sm text-neutral-350 leading-relaxed font-semibold max-w-2xl">
                Try querying natural language concepts! Our algorithm parses keywords to generate smart playlist filters, matched to official cover arts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                {[
                  { label: "Bollywood 2026", desc: "Arijit Singh hits" },
                  { label: "Workout music", desc: "High BPM gym playlist" },
                  { label: "Lofi under 20 min", desc: "Coding Focus beats" },
                  { label: "Gym playlist", desc: "Upbeat energy mixes" },
                  { label: "Night drive", desc: "Late night synthwave" },
                  { label: "Rain songs", desc: "Melancholic acoustic beats" }
                ].map(tips => (
                  <div
                    key={tips.label}
                    onClick={() => executeSearch(tips.label)}
                    className="bg-neutral-950/60 hover:bg-neutral-900 border border-white/[0.04] hover:border-cyan-500/20 p-3 rounded-2xl cursor-pointer transition-all"
                  >
                    <span className="text-xs font-bold text-white block">{tips.label}</span>
                    <span className="text-[10px] text-neutral-500 font-semibold">{tips.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick mood genres grid */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Popular Mood Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { name: "Pop",        emoji: "🎤", gradient: "from-cyan-500/30 to-[#7B61FF]/10",       glow: "shadow-cyan-500/20" },
                { name: "Hip-Hop",    emoji: "🎧", gradient: "from-purple-600/30 to-indigo-500/10",    glow: "shadow-indigo-500/20" },
                { name: "Electronic", emoji: "⚡", gradient: "from-blue-600/30 to-cyan-500/10",        glow: "shadow-blue-500/20" },
                { name: "Bollywood",  emoji: "🪘", gradient: "from-amber-600/30 to-orange-500/10",    glow: "shadow-orange-500/20" },
                { name: "Rock",       emoji: "🎸", gradient: "from-red-600/30 to-pink-500/10",         glow: "shadow-red-500/20" },
                { name: "Lo-Fi",      emoji: "☁️", gradient: "from-neutral-700/30 to-neutral-900/10",     glow: "shadow-neutral-500/10" },
              ].map((g) => (
                <div
                  key={g.name}
                  onClick={() => executeSearch(g.name)}
                  className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${g.gradient} p-5 cursor-pointer hover:border-cyan-500/40 hover:-translate-y-1.5 transition-all text-left`}
                >
                  <span className="text-2xl mb-2.5 block">{g.emoji}</span>
                  <span className="text-xs font-black text-white">{g.name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Continue Listening */}
          {continueListening.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-neutral-400">
                <Clock className="h-4.5 w-4.5" />
                <h3 className="text-sm font-black uppercase tracking-wider">Recently Played</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {continueListening.slice(0, 6).map((track, i) => (
                  <div
                    key={`${track.id}-recent-${i}`}
                    onClick={() => handlePlayTrack(track, continueListening)}
                    className="group relative rounded-2xl bg-neutral-900/45 hover:bg-neutral-850 border border-white/[0.04] p-4 flex flex-col cursor-pointer transition-all hover:scale-102"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900 shadow-md">
                      <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="150px" />
                    </div>
                    <div className="mt-3 text-left">
                      <h4 className="text-xs font-bold text-white truncate leading-tight">{track.title}</h4>
                      <p className="text-[10px] text-neutral-500 font-semibold truncate mt-0.5">{track.artist.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      )}

      {/* D. ACTIVE RESULTS PANEL (UNIFIED SCORING & DEDUPLICATED SECTIONS) */}
      {activeSearch && (
        <div className="space-y-8 animate-fadeIn text-left">
          
          {/* PREMIUM SEARCH FILTERS */}
          <div className="flex flex-wrap gap-2.5 border-b border-white/[0.04] pb-4">
            {[
              { id: 'All', label: 'All Results' },
              { id: 'Songs', label: `Songs (${counts.Songs})` },
              { id: 'Artists', label: `Artists (${counts.Artists})` },
              { id: 'Albums', label: `Albums (${counts.Albums})` },
              { id: 'Playlists', label: `Playlists (${counts.Playlists})` },
              { id: 'Videos', label: `Videos (${counts.Videos})` },
              { id: 'Podcasts', label: `Podcasts (${counts.Podcasts})` },
              { id: 'Live', label: `Live Concerts (${counts.Live})` }
            ].map((filterTab) => {
              const countMatch = filterTab.id === 'All' || (counts as any)[filterTab.id] > 0;
              if (!countMatch) return null; // Hide tabs with 0 matches

              return (
                <button
                  key={filterTab.id}
                  onClick={() => setFilter(filterTab.id)}
                  className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all border ${
                    activeFilter === filterTab.id
                      ? "bg-gradient-to-r from-cyan-400 to-purple-500 text-black border-cyan-400 shadow-md shadow-cyan-500/10"
                      : "bg-[#111]/60 text-neutral-450 hover:bg-neutral-800 hover:text-white border-white/[0.06]"
                  }`}
                >
                  {filterTab.label}
                </button>
              );
            })}
          </div>

          {isFetching ? (
            /* Premium Skeletons Loaders */
            <div className="space-y-5 py-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between rounded-2xl bg-[#111]/30 p-4 border border-white/[0.04]">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-neutral-900 rounded-xl" />
                    <div className="space-y-2">
                      <div className="h-3 w-40 bg-neutral-805 rounded" />
                      <div className="h-2 w-24 bg-neutral-805 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-16 bg-neutral-905 rounded" />
                </div>
              ))}
            </div>
          ) : (songsList.length === 0 && artistsList.length === 0 && albumsList.length === 0 && playlistsList.length === 0 && videosList.length === 0 && podcastsList.length === 0 && coversList.length === 0 && liveList.length === 0) ? (
            <div className="rounded-3xl py-20 text-center text-sm text-neutral-500 border border-dashed border-white/[0.06] bg-[#111]/10">
              No verified matches found for &ldquo;{activeSearch}&rdquo;.<br />Try adjusting your search query.
            </div>
          ) : (
            <div className="space-y-10">

              {/* 0. DYNAMIC AI DJ PLAYLIST GENERATOR ACCENT */}
              {aiMix && activeFilter === 'All' && (
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-br from-cyan-500/15 via-purple-600/15 to-transparent border border-white/[0.08] p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-2xl">
                      {aiMix.icon}
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400">AI Synthesized Station</span>
                      <h4 className="text-md font-black text-white">{aiMix.title}</h4>
                      <p className="text-xs text-neutral-450 font-semibold leading-normal">{aiMix.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePlayTrack(aiMix.tracks[0], aiMix.tracks)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 text-xs font-black text-black shadow-md shadow-cyan-500/20"
                  >
                    <Play className="h-4.5 w-4.5 fill-black stroke-black" />
                    <span>Launch AI Playlist</span>
                  </button>
                </motion.div>
              )}

              {/* 1. TOP RESULT / VERIFIED ARTIST HERO */}
              {activeFilter === 'All' && topArtist && !sectionsCollapsed.topArtist && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Top Match</h3>
                    <button onClick={() => toggleCollapse('topArtist')} className="text-neutral-500 hover:text-white">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0c0c0c]/80 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-2xl"
                  >
                    {/* Background glow matching the artist image */}
                    <div 
                      className="absolute inset-0 filter blur-[80px] opacity-10 -z-10 bg-cover bg-center scale-105 pointer-events-none"
                      style={{ backgroundImage: `url(${topArtist.coverUrl})` }}
                    />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative h-28 w-28 rounded-full overflow-hidden border-2 border-white/[0.08] shadow-lg flex-shrink-0 bg-neutral-900">
                        <ImageWithFallback src={topArtist.coverUrl} alt={topArtist.name} fill sizes="112px" priority className="object-cover" />
                      </div>
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-1.5 text-cyan-400">
                          <CheckCircle className="h-4 w-4 fill-cyan-400 text-[#0c0c0c]" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Artist</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{topArtist.name}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-neutral-405">
                          <span>{topArtist.monthlyListeners?.toLocaleString()} monthly listeners</span>
                          <span className="text-neutral-700">•</span>
                          <span className="text-cyan-400 font-extrabold">{topArtist.popularity}% popularity index</span>
                        </div>
                        {topArtist.genres?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {topArtist.genres.slice(0, 3).map(genre => (
                              <span key={genre} className="text-[9px] font-bold text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.04] uppercase">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Artist Actions */}
                    <div className="flex flex-wrap gap-3.5 w-full md:w-auto">
                      <button
                        onClick={() => router.push(`/artists/${topArtist.id}`)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-6 py-3 text-xs font-black text-black shadow-lg"
                      >
                        <Play className="h-4 w-4 fill-black stroke-black translate-x-[0.5px]" />
                        <span>Artist Station</span>
                      </button>
                      <button
                        onClick={() => alert(`Following ${topArtist.name}!`)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] px-6 py-3 text-xs font-bold text-white transition-all"
                      >
                        <span>Follow</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* 2. POPULAR SONGS SECTION */}
              {(activeFilter === 'All' || activeFilter === 'Songs') && songsList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">
                      Popular Songs {activeFilter === 'All' && `(${songsList.length})`}
                    </h3>
                    <button onClick={() => toggleCollapse('songs')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.songs ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.songs && (
                    <div className="space-y-3.5">
                      {songsList.slice(0, activeFilter === 'All' ? 5 : songsList.length).map((track, idx) => {
                        const isCurrent = currentTrack?.id === track.id;
                        const isLiked = likedMap[track.id] || false;
                        
                        return (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track, songsList)}
                            className={`group relative flex items-center justify-between rounded-2xl p-3 border transition-all cursor-pointer ${
                              isCurrent 
                                ? 'border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_15px_rgba(0,245,255,0.02)]' 
                                : 'border-white/[0.04] bg-neutral-900/30 hover:bg-[#1A1A1A]/40 hover:border-cyan-500/20'
                            }`}
                          >
                            {/* Left part: Cover, Index, Metadata */}
                            <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                              <span className="text-xs font-black text-neutral-500 w-5 text-center">{idx + 1}</span>
                              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-white/[0.06]">
                                <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="48px" className="object-cover" />
                              </div>
                              <div className="truncate text-left">
                                <div className="flex items-center gap-1.5">
                                  <p className={`truncate text-sm font-bold ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white'}`}>
                                    {track.title}
                                  </p>
                                  {track.isHQ && (
                                    <span className="text-[8px] font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1 py-0.5 rounded uppercase">HQ</span>
                                  )}
                                  {track.explicit && (
                                    <span className="text-[8px] font-black text-rose-400 bg-rose-400/10 border border-rose-400/20 px-1 py-0.5 rounded uppercase">E</span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-neutral-400 font-semibold mt-0.5">
                                  {track.artist?.name} · {track.album?.name || 'Single'}
                                </p>
                              </div>
                            </div>

                            {/* Right part: Badges & Action Buttons */}
                            <div className="flex items-center space-x-4" onClick={(e) => e.stopPropagation()}>
                              {/* Popularity bar indicator */}
                              {track.popularity !== undefined && (
                                <div className="hidden md:flex flex-col items-end pr-2 text-right">
                                  <span className="text-[9px] font-bold text-neutral-500 uppercase">Popularity</span>
                                  <div className="w-16 h-1 bg-neutral-850 rounded-full overflow-hidden mt-1 relative">
                                    <div className="absolute left-0 top-0 bottom-0 bg-cyan-400" style={{ width: `${track.popularity}%` }} />
                                  </div>
                                </div>
                              )}

                              <span className="hidden sm:inline text-[11px] font-bold text-neutral-500 font-mono tabular-nums">
                                {formatDuration(track.durationMs)}
                              </span>

                              {/* Heart Like Toggle */}
                              <button
                                onClick={() => likeMutation.mutate(track)}
                                className={`p-2 transition-colors ${isLiked ? 'text-pink-400' : 'text-neutral-500 hover:text-white'}`}
                              >
                                <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-pink-400 stroke-pink-400' : ''}`} />
                              </button>

                              {/* Add to Playlist button */}
                              <div className="relative">
                                <button
                                  onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                                  className="text-neutral-500 hover:text-white p-2"
                                  title="Add to Playlist"
                                >
                                  <FolderPlus className="h-4.5 w-4.5" />
                                </button>
                                
                                {activeDropdown === track.id && (
                                  <div className="absolute right-0 mt-2 z-50 w-48 rounded-2xl p-2 shadow-2xl border border-white/10 bg-[#0c0c0c]/95 backdrop-blur-xl">
                                    <span className="text-[10px] font-black text-neutral-500 uppercase px-2.5 py-1 block border-b border-white/[0.05] mb-1">
                                      Add to playlist
                                    </span>
                                    {userPlaylists.length === 0 ? (
                                      <span className="text-xs text-neutral-500 px-2 py-1.5 block">
                                        No playlists created.
                                      </span>
                                    ) : (
                                      userPlaylists.map((p: any) => (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={() => addToPlaylistMutation.mutate({ playlistId: p.id, track })}
                                          className="w-full text-left rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-300 hover:bg-cyan-500 hover:text-black transition-colors truncate block"
                                        >
                                          {p.name}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Download Link */}
                              <button
                                onClick={() => alert(`Starting download session for ${track.title}...`)}
                                className="text-neutral-500 hover:text-white p-2 hidden sm:block"
                                title="Download Offline"
                              >
                                <Download className="h-4.5 w-4.5" />
                              </button>

                              {/* Play Button */}
                              <button
                                onClick={() => handlePlayTrack(track, songsList)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 border border-white/[0.08] hover:border-cyan-400 text-neutral-450 hover:text-cyan-400 shadow-sm"
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="h-4 w-4 fill-cyan-400 text-cyan-400 stroke-none" />
                                ) : (
                                  <Play className="h-4 w-4 fill-neutral-400 text-neutral-400 stroke-none translate-x-[0.5px] group-hover:fill-cyan-450" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. ALBUMS SECTION */}
              {(activeFilter === 'All' || activeFilter === 'Albums') && albumsList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Albums</h3>
                    <button onClick={() => toggleCollapse('albums')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.albums ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.albums && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                      {albumsList.map((alb) => (
                        <div
                          key={alb.id}
                          onClick={() => router.push(`/albums/${alb.id}`)}
                          className="group relative rounded-2xl bg-neutral-900/30 border border-white/[0.04] hover:border-cyan-500/30 p-4 cursor-pointer transition-all flex flex-col text-left hover:scale-102"
                        >
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] mb-3">
                            <ImageWithFallback src={alb.coverUrl} alt={alb.name} fill sizes="150px" />
                          </div>
                          <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">
                            {alb.name}
                          </h4>
                          <p className="text-[10px] text-neutral-405 font-bold uppercase tracking-wider mt-1 truncate">
                            {alb.artist.name} · {alb.releaseDate?.substring(0, 4)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. PLAYLISTS SECTION */}
              {(activeFilter === 'All' || activeFilter === 'Playlists') && playlistsList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Playlists</h3>
                    <button onClick={() => toggleCollapse('playlists')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.playlists ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.playlists && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                      {playlistsList.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => router.push(`/playlists/${p.id}`)}
                          className="group relative rounded-2xl bg-neutral-900/30 border border-white/[0.04] hover:border-cyan-500/30 p-4 cursor-pointer transition-all flex flex-col text-left hover:scale-102"
                        >
                          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] mb-3 flex items-center justify-center">
                            {p.coverUrl ? (
                              <ImageWithFallback src={p.coverUrl} alt={p.name} fill sizes="150px" />
                            ) : (
                              <Music className="h-10 w-10 text-neutral-600" />
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-white truncate leading-tight group-hover:text-cyan-400 transition-colors">
                            {p.name}
                          </h4>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1">
                            {p.trackCount} Songs · By {p.owner || 'NeoTunes'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. VIDEOS & MUSIC VIDEOS */}
              {(activeFilter === 'All' || activeFilter === 'Videos') && videosList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Official Music Videos</h3>
                    <button onClick={() => toggleCollapse('videos')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.videos ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.videos && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {videosList.map((video) => (
                        <div
                          key={video.id}
                          onClick={() => handlePlayTrack(video, videosList)}
                          className="group relative rounded-2xl border border-white/[0.04] bg-[#0c0c0c]/40 overflow-hidden cursor-pointer hover:border-cyan-500/20 transition-all text-left"
                        >
                          <div className="relative aspect-video bg-neutral-950">
                            <ImageWithFallback src={video.coverUrl || ''} alt={video.title} fill sizes="320px" className="object-cover group-hover:scale-102 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-black shadow-lg">
                                <Play className="h-5 w-5 fill-black stroke-black translate-x-[1px]" />
                              </div>
                            </div>
                          </div>
                          <div className="p-3 space-y-1">
                            <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">{video.title}</h4>
                            <p className="text-[10px] text-neutral-500 font-semibold">{video.artist.name} · Video</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 6. LIVE CONCERTS & SESSIONS */}
              {(activeFilter === 'All' || activeFilter === 'Live') && liveList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Live Concerts & Performances</h3>
                    <button onClick={() => toggleCollapse('live')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.live ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.live && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {liveList.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => handlePlayTrack(track, liveList)}
                          className="group relative rounded-2xl border border-white/[0.04] bg-[#0c0c0c]/40 overflow-hidden cursor-pointer hover:border-cyan-500/20 transition-all text-left"
                        >
                          <div className="relative aspect-video bg-neutral-950">
                            <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="320px" className="object-cover filter brightness-90 group-hover:scale-102 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <PlayCircle className="h-12 w-12 text-cyan-400 shadow-lg" />
                            </div>
                          </div>
                          <div className="p-3 space-y-1">
                            <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-400 transition-colors">{track.title}</h4>
                            <p className="text-[10px] text-neutral-500 font-semibold">{track.artist.name} · Live Session</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 7. PODCASTS */}
              {(activeFilter === 'All' || activeFilter === 'Podcasts') && podcastsList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Podcasts</h3>
                    <button onClick={() => toggleCollapse('podcasts')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.podcasts ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.podcasts && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {podcastsList.map((pod) => (
                        <div
                          key={pod.id}
                          onClick={() => handlePlayTrack(pod, podcastsList)}
                          className="flex items-center gap-3.5 rounded-2xl bg-[#0c0c0c]/40 border border-white/[0.04] p-3.5 hover:bg-neutral-900/60 cursor-pointer transition-colors text-left"
                        >
                          <div className="relative h-14 w-14 rounded-xl flex-shrink-0 overflow-hidden bg-neutral-950">
                            <ImageWithFallback src={pod.coverUrl || ''} alt={pod.title} fill sizes="56px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{pod.title}</h4>
                            <p className="text-[10px] text-neutral-500 font-semibold truncate mt-0.5">{pod.artist.name}</p>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 8. COVERS & REMIXES */}
              {activeFilter === 'All' && coversList.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Covers & Remixes</h3>
                    <button onClick={() => toggleCollapse('covers')} className="text-neutral-500 hover:text-white">
                      {sectionsCollapsed.covers ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {!sectionsCollapsed.covers && (
                    <div className="space-y-2.5">
                      {coversList.slice(0, 4).map((track) => (
                        <div
                          key={track.id}
                          onClick={() => handlePlayTrack(track, coversList)}
                          className="flex items-center justify-between rounded-xl bg-neutral-900/20 p-2.5 border border-white/[0.03] hover:border-cyan-500/10 cursor-pointer"
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <div className="relative h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-950">
                              <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="36px" />
                            </div>
                            <div className="truncate text-left">
                              <p className="text-xs font-bold text-white truncate">{track.title}</p>
                              <p className="text-[9px] text-neutral-500 truncate font-semibold mt-0.5">{track.artist.name}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-neutral-500 uppercase bg-neutral-850 px-2 py-0.5 rounded border border-white/[0.04]">Cover</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
}

// Simple internal icon helper since ChevronRight was omitted from imports list
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
