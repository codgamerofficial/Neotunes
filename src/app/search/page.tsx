'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import {
  MusicSearchService,
  NormalizedSearchResult,
  AutocompleteSuggestion,
} from '@/services/MusicSearchService';
import { normalizeString } from '@/lib/searchEngine';
import { Track, Artist, Album, Playlist, getArtistName } from '@/types';
import { resolveArtwork } from '@/utils/artwork';
import { Artwork } from '@/components/ui/Artwork';
import { NeoCard } from '@/components/ui/NeoCard';
import { NeoButton } from '@/components/ui/NeoButton';
import { NeoTrackRow } from '@/components/ui/NeoTrackRow';
import { NeoSkeleton } from '@/components/ui/NeoSkeleton';
import { NeoEmptyState } from '@/components/ui/NeoEmptyState';
import { NeoTabs, TabItem } from '@/components/ui/NeoTabs';
import { NeoSection } from '@/components/ui/NeoSection';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import {
  Search as SearchIcon,
  Play,
  Sparkles,
  X,
  History,
  Compass,
  TrendingUp,
  Disc3,
  User,
  ListMusic,
  Globe,
  Flame,
  Volume2,
  Radio,
  CheckCircle,
  CornerDownLeft,
} from 'lucide-react';

const TRENDING_SEARCHES = [
  'Arijit Singh',
  'Kesariya',
  'Karan Aujla Wavy',
  'Diljit Dosanjh',
  'The Weeknd',
  'Bengali Melodies',
  'Anupam Roy',
  'Tum Hi Ho Acoustic',
  'Lo-Fi Chill Beats',
  'Bad Bunny',
  'Coldplay',
  'Hanumankind',
];

const LANGUAGE_PILLS = [
  { label: 'All Languages', id: 'all' },
  { label: 'Hindi', id: 'Hindi' },
  { label: 'Bengali (বাংলা)', id: 'Bengali' },
  { label: 'Punjabi (ਪੰਜਾਬੀ)', id: 'Punjabi' },
  { label: 'English', id: 'English' },
  { label: 'Spanish (Español)', id: 'Spanish' },
  { label: 'Korean (한국어)', id: 'Korean' },
  { label: 'Japanese (日本語)', id: 'Japanese' },
  { label: 'Arabic (العربية)', id: 'Arabic' },
];

const MOOD_PILLS = [
  { label: 'All Moods', id: 'all' },
  { label: 'Chill & Lo-Fi', id: 'chill' },
  { label: 'Workout & Hype', id: 'workout' },
  { label: 'Romantic & Love', id: 'romantic' },
  { label: 'Sad & Melancholy', id: 'sad' },
  { label: 'Party & Dance', id: 'party' },
];

const VERSION_PILLS = [
  { label: 'All Versions', id: 'all' },
  { label: 'Original Studio', id: 'original' },
  { label: 'Acoustic / Unplugged', id: 'acoustic' },
  { label: 'Live Concert', id: 'live' },
  { label: 'Remix / EDM', id: 'remix' },
];

const DISCOVER_GENRES = [
  { name: 'Bollywood Hits', genre: 'Hindi Cinema', color: '#DFFF00', query: 'Arijit Singh Pritam Hits', destination: '/browse?category=bollywood' },
  { name: 'Punjabi Pop', genre: 'Punjabi Wave', color: '#00E5FF', query: 'Diljit Dosanjh Karan Aujla', destination: '/browse?category=punjabi' },
  { name: 'Bengali Classics', genre: 'Rabindra & Rock', color: '#DFFF00', query: 'Anupam Roy Bengali Melodies', destination: '/browse?category=bengali' },
  { name: 'Global Top Hits', genre: 'International Pop', color: '#00E5FF', query: 'Global Top Hits', destination: '/browse?category=global' },
  { name: 'Lo-Fi Chill Beats', genre: 'Ambient Focus', color: '#DFFF00', query: 'Lo-Fi Chill Beats', destination: '/browse?category=lofi' },
  { name: 'Latin & Reggaeton', genre: 'Urban Latin', color: '#00E5FF', query: 'Bad Bunny Reggaeton Hits', destination: '/browse?category=latin' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const inputRef = useRef<HTMLInputElement>(null);

  const { playTrack } = usePlaybackStore();
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const [resolvedQuery, setResolvedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'All' | 'Songs' | 'Artists' | 'Albums' | 'Playlists'>('All');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedMood, setSelectedMood] = useState('all');
  const [selectedVersion, setSelectedVersion] = useState('all');

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [suggestedCorrection, setSuggestedCorrection] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  const [results, setResults] = useState<NormalizedSearchResult>({
    topResult: null,
    songs: [],
    artists: [],
    albums: [],
    playlists: [],
  });

  const requestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionsAbortRef = useRef<AbortController | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('neotunes_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 8));
      }
    } catch {}
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('neotunes_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== term);
      try {
        localStorage.setItem('neotunes_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('neotunes_recent_searches');
  };

  // Keyboard shortcut listener: press '/' anywhere to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search execution with monotonic Request ID + AbortController cancellation
  const performSearch = React.useCallback(async (searchTerm: string, forceOriginal = false) => {
    const trimmed = searchTerm.trim();
    setShowSuggestions(false);

    if (!trimmed) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults({ topResult: null, songs: [], artists: [], albums: [], playlists: [] });
      setResolvedQuery('');
      setIsLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const searchData = await MusicSearchService.searchAll(trimmed, {
        signal: controller.signal,
      });

      // Stale response guard: only update if this matches the latest request ID
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setResults(searchData);
      setResolvedQuery(trimmed);
      saveRecentSearch(trimmed);

      // Track session interaction with artist
      if (searchData.topResult?.type === 'artist') {
        MusicSearchService.recordInteraction((searchData.topResult.data as Artist).name);
      } else if (searchData.songs[0]) {
        MusicSearchService.recordInteraction(
          typeof searchData.songs[0].artist === 'string'
            ? searchData.songs[0].artist
            : (searchData.songs[0].artist as any)?.name
        );
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && currentRequestId === requestIdRef.current) {
        console.error('Search query failed:', err);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Live Autocomplete Suggestions Debounce (150ms)
  useEffect(() => {
    const trimmed = inputQuery.trim();
    if (!trimmed) {
      setSuggestions([]);
      setSuggestedCorrection(null);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (suggestionsAbortRef.current) {
        suggestionsAbortRef.current.abort();
      }
      const controller = new AbortController();
      suggestionsAbortRef.current = controller;

      try {
        const sug = await MusicSearchService.getSuggestions(trimmed, controller.signal);
        const combined = [...(sug.artists || []), ...(sug.songs || []), ...(sug.albums || [])].slice(0, 6);
        setSuggestions(combined);
        setSuggestedCorrection(sug.didYouMean ? sug.correctedQuery : null);
        setShowSuggestions(combined.length > 0 || Boolean(sug.didYouMean));
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setSuggestions([]);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [inputQuery]);

  // Main search debounce (280ms)
  useEffect(() => {
    const trimmedInput = inputQuery.trim();
    const normInput = normalizeString(trimmedInput);
    const normResolved = normalizeString(resolvedQuery);

    if (!trimmedInput) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults({ topResult: null, songs: [], artists: [], albums: [], playlists: [] });
      setResolvedQuery('');
      setIsLoading(false);
      return;
    }

    // Immediately mark as loading if user typed a different query than what is displayed
    if (normInput !== normResolved) {
      setIsLoading(true);
    }

    const timer = setTimeout(() => {
      performSearch(trimmedInput);
    }, 280);

    return () => clearTimeout(timer);
  }, [inputQuery, performSearch, resolvedQuery]);

  // Sync initial query from URL
  useEffect(() => {
    if (initialQuery && initialQuery !== inputQuery) {
      setInputQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, inputQuery, performSearch]);

  const handleSelectQuery = (term: string) => {
    setInputQuery(term);
    performSearch(term);
  };

  // Client-side filtering by Language, Mood, and Version
  const filteredSongs = React.useMemo(() => {
    let list = results.songs;

    if (selectedLanguage !== 'all') {
      const targetLang = selectedLanguage.toLowerCase();
      list = list.filter((s) => {
        const lang = ((s as any).language || '').toLowerCase();
        const title = s.title.toLowerCase();
        return lang.includes(targetLang) || title.includes(targetLang);
      });
    }

    if (selectedMood !== 'all') {
      const targetMood = selectedMood.toLowerCase();
      list = list.filter((s) => {
        const mood = ((s as any).mood || '').toLowerCase();
        const title = s.title.toLowerCase();
        return mood.includes(targetMood) || title.includes(targetMood);
      });
    }

    if (selectedVersion !== 'all') {
      const targetVersion = selectedVersion.toLowerCase();
      list = list.filter((s) => {
        const title = s.title.toLowerCase();
        if (targetVersion === 'acoustic') return title.includes('acoustic') || title.includes('unplugged');
        if (targetVersion === 'live') return title.includes('live') || title.includes('concert');
        if (targetVersion === 'remix') return title.includes('remix') || title.includes('mix') || title.includes('edm');
        if (targetVersion === 'original') return !title.includes('acoustic') && !title.includes('live') && !title.includes('remix') && !title.includes('cover');
        return true;
      });
    }

    return list;
  }, [results.songs, selectedLanguage, selectedMood, selectedVersion]);

  const normInput = normalizeString(inputQuery.trim());
  const normResolved = normalizeString(resolvedQuery.trim());
  const isSearchingNewQuery = Boolean(inputQuery.trim()) && (isLoading || normInput !== normResolved);

  const hasResults = Boolean(
    results.topResult ||
    filteredSongs.length > 0 ||
    results.artists.length > 0 ||
    results.albums.length > 0 ||
    results.playlists.length > 0
  );

  const searchTabs: TabItem<'All' | 'Songs' | 'Artists' | 'Albums' | 'Playlists'>[] = [
    { id: 'All', label: 'All Results' },
    { id: 'Songs', label: 'Songs', count: filteredSongs.length },
    { id: 'Artists', label: 'Artists', count: results.artists.length },
    { id: 'Albums', label: 'Albums', count: results.albums.length },
    { id: 'Playlists', label: 'Playlists', count: results.playlists.length },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto min-h-screen text-[#F5F7FA] font-sans select-none pb-48 md:pb-32">
      {/* ── 1. LARGE GLASS SEARCH INPUT BAR ── */}
      <div className="relative z-30 max-w-2xl mx-auto">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-4 h-5 w-5 text-[#DFFF00] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex((prev) => Math.max(prev - 1, -1));
              } else if (e.key === 'Enter') {
                if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                  const item = suggestions[activeSuggestionIndex];
                  const term = item.name || item.title || inputQuery;
                  handleSelectQuery(term);
                } else {
                  handleSelectQuery(inputQuery);
                }
              }
            }}
            placeholder="Search tracks, artists, moods (e.g. Arijit Singh, Kesariya, Wavy, Punjabi workout)..."
            className="w-full pl-12 pr-24 py-4 rounded-full bg-[#11141A]/90 backdrop-blur-2xl border border-white/10 focus:border-[#DFFF00] focus:ring-2 focus:ring-[#DFFF00]/30 text-white placeholder-[#9AA1AD] text-sm sm:text-base font-medium outline-none transition-all shadow-2xl"
            autoFocus
          />

          {/* Shortcut badge / Loading / Clear button */}
          <div className="absolute right-3 flex items-center gap-1.5">
            {isLoading ? (
              <div className="p-1.5 mr-1" aria-label="Loading search results">
                <div className="w-4 h-4 rounded-full border-2 border-[#DFFF00] border-t-transparent animate-spin" />
              </div>
            ) : inputQuery ? (
              <button
                type="button"
                onClick={() => {
                  setInputQuery('');
                  setResolvedQuery('');
                  if (abortControllerRef.current) abortControllerRef.current.abort();
                  setResults({ topResult: null, songs: [], artists: [], albums: [], playlists: [] });
                  inputRef.current?.focus();
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-[#9AA1AD] hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DFFF00]"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-[#9AA1AD] bg-white/5 border border-white/10 rounded-md">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* ── AUTOCOMPLETE DROPDOWN POPOVER (Constrained above player) ── */}
        {showSuggestions && inputQuery.trim() && (suggestions.length > 0 || Boolean(suggestedCorrection)) && (
          <div
            id="search-suggestions-dropdown"
            role="listbox"
            aria-label="Search suggestions"
            className="absolute top-full left-0 right-0 mt-2 bg-[#171A21]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-y-auto scrollbar-none z-50 divide-y divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[min(340px,calc(100vh-230px))] sm:max-h-[min(400px,calc(100vh-250px))]"
          >
            {suggestedCorrection && (
              <button
                type="button"
                onClick={() => {
                  handleSelectQuery(suggestedCorrection);
                }}
                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3 cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DFFF00]"
              >
                <Sparkles className="h-4 w-4 text-[#DFFF00] shrink-0" />
                <span className="text-xs text-[#9AA1AD]">
                  Did you mean <strong className="text-white group-hover:text-[#DFFF00]">{suggestedCorrection}</strong>?
                </span>
              </button>
            )}

            {suggestions.map((item, idx) => (
              <button
                key={`${item.id}_${idx}`}
                type="button"
                onClick={() => {
                  const target = item.name || item.title || inputQuery;
                  handleSelectQuery(target);
                }}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DFFF00] ${
                  activeSuggestionIndex === idx ? 'bg-[#DFFF00]/15' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt=""
                      className={`w-8 h-8 object-cover shrink-0 ${item.type === 'artist' ? 'rounded-full' : 'rounded-lg'}`}
                    />
                  ) : item.type === 'artist' ? (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-[#DFFF00]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Disc3 className="h-4 w-4 text-[#00E5FF]" />
                    </div>
                  )}

                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{item.name || item.title}</p>
                    <p className="text-[10px] text-[#9AA1AD] capitalize">
                      {item.type} {item.artist ? `• ${item.artist}` : ''}
                    </p>
                  </div>
                </div>

                <CornerDownLeft className="h-3 w-3 text-[#9AA1AD] opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. "DID YOU MEAN" / "SHOWING RESULTS FOR" BANNER ── */}
      {!isSearchingNewQuery && resolvedQuery && results.didYouMean && results.correctedQuery && normInput === normResolved && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DFFF00]/10 border border-[#DFFF00]/30 text-xs text-white shadow-lg">
            <Sparkles className="h-4 w-4 text-[#DFFF00]" />
            <span>
              Showing results for <strong className="text-[#DFFF00]">{results.correctedQuery}</strong>.
            </span>
            {results.originalQuery && results.originalQuery.toLowerCase() !== results.correctedQuery.toLowerCase() && (
              <button
                type="button"
                onClick={() => {
                  handleSelectQuery(results.originalQuery!);
                }}
                className="underline text-[#9AA1AD] hover:text-white transition-colors cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DFFF00] rounded"
              >
                Search for <em>{results.originalQuery}</em> instead
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 3. FILTER TABS & SECONDARY PILLS (Horizontally Scrollable Rails with Edge Fades) ── */}
      {!isSearchingNewQuery && resolvedQuery.length > 0 && hasResults && (
        <div className="space-y-3">
          {/* Result tabs with horizontal scroll rail and edge fade */}
          <div className="relative max-w-full">
            <div className="overflow-x-auto scrollbar-none flex sm:justify-center py-1 px-1 -mx-1 touch-pan-x flex-nowrap">
              <NeoTabs tabs={searchTabs} activeTab={activeTab} onChange={setActiveTab} variant="segmented" />
            </div>
            {/* Right subtle edge fade for mobile affordance */}
            <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050608] to-transparent z-10" />
          </div>

          {/* Secondary filter pills as single-row horizontal rails */}
          <div className="space-y-2 pt-1">
            {/* Language filter rail */}
            <div className="relative max-w-full">
              <div
                role="tablist"
                aria-label="Filter by language"
                className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-1 -mx-1 touch-pan-x flex-nowrap sm:justify-center"
              >
                {LANGUAGE_PILLS.map((lang) => {
                  const isSelected = selectedLanguage === lang.id;
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${
                        isSelected
                          ? 'bg-[#00E5FF] text-black shadow-[0_0_12px_rgba(0,229,255,0.4)] border border-[#00E5FF]'
                          : 'bg-[#11141A] border border-white/10 text-[#9AA1AD] hover:text-white hover:border-white/20'
                      }`}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050608] to-transparent z-10" />
            </div>

            {/* Version filter rail */}
            <div className="relative max-w-full">
              <div
                role="tablist"
                aria-label="Filter by version"
                className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-1 -mx-1 touch-pan-x flex-nowrap sm:justify-center"
              >
                {VERSION_PILLS.map((v) => {
                  const isSelected = selectedVersion === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedVersion(v.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ${
                        isSelected
                          ? 'bg-[#DFFF00] text-black shadow-[0_0_12px_rgba(223,255,0,0.4)] border border-[#DFFF00]'
                          : 'bg-[#11141A] border border-white/10 text-[#9AA1AD] hover:text-white hover:border-white/20'
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#050608] to-transparent z-10" />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. COMPACT LOADING SKELETON STATE (Shown while searching a new query) ── */}
      {isSearchingNewQuery && (
        <div className="space-y-6 pt-2 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
              <div className="p-6 rounded-2xl bg-[#11141A] border border-white/10 space-y-4">
                <div className="w-28 h-28 mx-auto rounded-2xl bg-white/10 animate-pulse" />
                <div className="space-y-2 text-center">
                  <div className="h-5 w-40 mx-auto bg-white/10 rounded animate-pulse" />
                  <div className="h-3.5 w-24 mx-auto bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 space-y-3">
              <div className="h-4 w-28 bg-white/5 rounded animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-[#11141A] border border-white/5 flex items-center gap-3 px-4 animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-48 bg-white/10 rounded" />
                      <div className="h-3 w-32 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. IDLE DISCOVERY HOME (Before Typing) ── */}
      {!inputQuery.trim() && !isSearchingNewQuery && (
        <div className="space-y-8 pt-2">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#9AA1AD] flex items-center gap-2">
                  <History className="h-4 w-4 text-[#DFFF00]" /> Recent Searches
                </h3>
                <button
                  type="button"
                  onClick={clearAllRecent}
                  className="text-xs font-semibold text-[#9AA1AD] hover:text-red-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
                  aria-label="Clear all recent searches"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="group px-3.5 py-1.5 rounded-full bg-[#11141A] border border-white/5 hover:border-white/20 text-xs font-semibold text-white/80 hover:text-white flex items-center gap-2 transition-all shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectQuery(term)}
                      className="cursor-pointer hover:text-[#DFFF00] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#DFFF00] rounded"
                    >
                      {term}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(term, e)}
                      className="text-[#9AA1AD] hover:text-red-400 p-0.5 rounded-full cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                      aria-label={`Remove ${term} from recent searches`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#9AA1AD] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#DFFF00]" /> Trending Globally
            </h3>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectQuery(item)}
                  className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:border-[#DFFF00]/40 text-xs font-semibold text-[#9AA1AD] hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Discover by Language */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#9AA1AD] flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#00E5FF]" /> Global Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_PILLS.filter((l) => l.id !== 'all').map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => handleSelectQuery(lang.label)}
                  className="px-4 py-2 rounded-xl bg-[#171A21] border border-white/10 hover:border-[#00E5FF]/40 text-xs font-bold text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Curated Hubs (Semantic clickable card buttons with keyboard & focus-visible support) */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#9AA1AD] flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#00E5FF]" /> Curated Hubs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {DISCOVER_GENRES.map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => router.push(g.destination)}
                  className="p-4 rounded-2xl bg-[#11141A] border border-white/[0.08] hover:border-[#00E5FF]/50 hover:bg-[#171A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050608] active:scale-[0.98] transition-all flex flex-col justify-between min-h-[104px] text-left cursor-pointer group shadow-sm"
                  aria-label={`Open ${g.name} curated hub - ${g.genre}`}
                >
                  <span className="text-xs font-extrabold text-white group-hover:text-[#00E5FF] transition-colors">
                    {g.name}
                  </span>
                  <span className="text-[11px] text-[#9AA1AD] group-hover:text-white/80 transition-colors">
                    {g.genre}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. ZERO RESULTS RECOVERY EXPERIENCE ── */}
      {!isSearchingNewQuery && resolvedQuery.trim().length > 0 && !hasResults && (
        <div className="space-y-8">
          <NeoEmptyState
            icon={SearchIcon}
            title="We couldn't find an exact track for that search"
            description={`No exact match found for "${resolvedQuery}". Check for spelling differences, try English/Romanized spelling, or explore trending recommendations below.`}
            actionText="Explore Browse"
            onAction={() => router.push('/browse')}
          />

          {/* Fallback Trending recommendations */}
          <div className="space-y-3 pt-4">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#9AA1AD] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#DFFF00]" /> Recommended Discoveries
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {TRENDING_SEARCHES.slice(0, 6).map((item) => (
                <NeoCard
                  key={item}
                  interactive
                  onClick={() => handleSelectQuery(item)}
                  className="p-3 cursor-pointer hover:border-[#DFFF00]/40 transition-all text-center"
                >
                  <p className="text-xs font-bold text-white truncate">{item}</p>
                  <p className="text-[10px] text-[#9AA1AD] mt-1">Trending</p>
                </NeoCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. SEARCH RESULTS PRESENTATION ── */}
      {!isSearchingNewQuery && resolvedQuery.trim().length > 0 && hasResults && (
        <div className="space-y-8">
          {/* TOP RESULT HERO CARD */}
          {activeTab === 'All' && results.topResult && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {(() => {
                if (results.topResult?.type === 'artist') {
                  const artist = results.topResult.data as Artist;
                  return (
                    <div className="lg:col-span-5 space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1AD]">Top Artist</h3>
                      <NeoCard
                        interactive
                        onClick={() => router.push(`/artist/${encodeURIComponent(artist.name || artist.id)}`)}
                        className="p-6 space-y-4 group relative overflow-hidden bg-gradient-to-b from-[#171A21] to-[#11141A] border-white/10"
                      >
                        <Artwork
                          source={artist.imageUrl || artist.avatarUrl}
                          size="large"
                          aspectRatio="circle"
                          alt={artist.name}
                          type="artist"
                          className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full object-cover border border-white/10 shadow-xl group-hover:scale-105 transition-transform"
                        />
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 inline-block mb-1">
                            ARTIST
                          </span>
                          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight group-hover:text-[#00E5FF] transition-colors truncate">
                            {artist.name}
                          </h2>
                          <p className="text-xs text-[#9AA1AD] font-semibold">
                            {artist.genres && artist.genres.length > 0 ? artist.genres.slice(0, 2).join(' • ') : 'Verified Artist'}
                          </p>
                        </div>
                      </NeoCard>
                    </div>
                  );
                }

                const topTrack: Track | null =
                  results.topResult?.type === 'song' ? (results.topResult.data as Track) : filteredSongs[0] || null;

                if (!topTrack) return null;

                return (
                  <div className="lg:col-span-5 space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1AD]">Top Result</h3>
                    <NeoCard
                      interactive
                      onClick={() => playTrack(topTrack)}
                      className="p-5 sm:p-6 space-y-4 group relative overflow-hidden bg-gradient-to-b from-[#171A21] to-[#11141A] border-white/10 shadow-2xl"
                    >
                      <Artwork
                        source={resolveArtwork(topTrack)}
                        size="large"
                        canonicalId={topTrack.id}
                        type="track"
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border border-white/10 shadow-xl group-hover:scale-105 transition-transform"
                      />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DFFF00]/15 text-[#DFFF00] border border-[#DFFF00]/30 inline-block">
                            EXACT MATCH
                          </span>
                          {topTrack.title.toLowerCase().includes('acoustic') && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 inline-block">
                              ACOUSTIC
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight group-hover:text-[#DFFF00] transition-colors truncate">
                          {topTrack.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#9AA1AD] font-semibold">
                          {getArtistName(topTrack.artists || topTrack.artist)}
                        </p>
                      </div>

                      <div className="pt-2 flex items-center gap-3">
                        <NeoButton
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            playTrack(topTrack);
                          }}
                        >
                          <Play className="h-4 w-4 fill-black ml-0.5" /> Play
                        </NeoButton>
                      </div>
                    </NeoCard>
                  </div>
                );
              })()}

              {/* Top Songs Quick Column */}
              <div className="lg:col-span-7 space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1AD]">Top Songs</h3>
                <div className="space-y-1">
                  {filteredSongs.slice(0, 4).map((song, idx) => (
                    <NeoTrackRow
                      key={`${song.id}_${idx}`}
                      track={song}
                      index={idx}
                      showIndex={false}
                      playlistContext={filteredSongs}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SONGS LIST */}
          {(activeTab === 'All' || activeTab === 'Songs') && filteredSongs.length > 0 && (
            <NeoSection
              title="Songs"
              actionText={activeTab === 'All' ? 'See all songs' : undefined}
              onAction={() => setActiveTab('Songs')}
            >
              <div className="space-y-1">
                {(activeTab === 'Songs' ? filteredSongs : filteredSongs.slice(0, 8)).map((song, idx) => (
                  <NeoTrackRow
                    key={`${song.id}_${idx}`}
                    track={song}
                    index={idx}
                    showIndex={true}
                    playlistContext={filteredSongs}
                  />
                ))}
              </div>
            </NeoSection>
          )}

          {/* ARTISTS GRID */}
          {(activeTab === 'All' || activeTab === 'Artists') && results.artists.length > 0 && (
            <NeoSection
              title="Artists"
              actionText={activeTab === 'All' ? 'See all artists' : undefined}
              onAction={() => setActiveTab('Artists')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {results.artists.map((art, idx) => (
                  <NeoCard
                    key={`${art.id}_${idx}`}
                    interactive
                    onClick={() => router.push(`/artist/${encodeURIComponent(art.name || art.id)}`)}
                    className="p-4 text-center space-y-3 group cursor-pointer"
                  >
                    <Artwork
                      source={art.imageUrl || art.avatarUrl}
                      size="medium"
                      aspectRatio="circle"
                      alt={art.name}
                      type="artist"
                      className="w-24 h-24 mx-auto rounded-full object-cover border border-white/10 shadow-lg group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#DFFF00] transition-colors">
                        {art.name}
                      </h4>
                      <p className="text-[11px] text-[#9AA1AD] mt-0.5">Artist</p>
                    </div>
                  </NeoCard>
                ))}
              </div>
            </NeoSection>
          )}

          {/* ALBUMS GRID */}
          {(activeTab === 'All' || activeTab === 'Albums') && results.albums.length > 0 && (
            <NeoSection
              title="Albums"
              actionText={activeTab === 'All' ? 'See all albums' : undefined}
              onAction={() => setActiveTab('Albums')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {results.albums.map((alb, idx) => (
                  <NeoCard
                    key={`${alb.id}_${idx}`}
                    interactive
                    onClick={() => router.push(`/album/${encodeURIComponent(alb.title || alb.name || alb.id)}`)}
                    className="p-3 space-y-2.5 group cursor-pointer"
                  >
                    <Artwork
                      source={resolveArtwork(alb)}
                      size="medium"
                      canonicalId={alb.id}
                      type="album"
                      className="w-full aspect-square rounded-xl object-cover border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#DFFF00] transition-colors">
                        {alb.title || alb.name}
                      </h4>
                      <p className="text-[11px] text-[#9AA1AD] truncate mt-0.5">
                        {alb.artistName || (Array.isArray(alb.artists) ? alb.artists.join(', ') : 'Album')}
                      </p>
                    </div>
                  </NeoCard>
                ))}
              </div>
            </NeoSection>
          )}

          {/* PLAYLISTS GRID */}
          {(activeTab === 'All' || activeTab === 'Playlists') && results.playlists.length > 0 && (
            <NeoSection
              title="Playlists"
              actionText={activeTab === 'All' ? 'See all playlists' : undefined}
              onAction={() => setActiveTab('Playlists')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {results.playlists.map((pl, idx) => (
                  <NeoCard
                    key={`${pl.id}_${idx}`}
                    interactive
                    onClick={() => router.push(`/playlist/${encodeURIComponent(pl.name || pl.id)}`)}
                    className="p-3 space-y-2.5 group cursor-pointer"
                  >
                    <Artwork
                      source={resolveArtwork(pl)}
                      size="medium"
                      canonicalId={pl.id}
                      type="playlist"
                      className="w-full aspect-square rounded-xl object-cover border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#DFFF00] transition-colors">
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-[#9AA1AD] truncate mt-0.5">By {pl.owner || 'NeoTunes'}</p>
                    </div>
                  </NeoCard>
                ))}
              </div>
            </NeoSection>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <FeatureErrorBoundary featureName="Search">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-[#9AA1AD] animate-pulse">Loading Search...</div>
        }
      >
        <SearchContent />
      </Suspense>
    </FeatureErrorBoundary>
  );
}
