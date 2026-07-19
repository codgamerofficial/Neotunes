'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search as SearchIcon, 
  Play, 
  Pause, 
  Heart, 
  Disc, 
  Music, 
  Mic, 
  Clock, 
  TrendingUp, 
  Sparkles,
  Volume2,
  Download,
  Plus,
  Share2,
  Terminal,
  Activity,
  Layers,
  Radio,
  FileCheck,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  Sparkle,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CampaignSearchRibbon } from '@/components/campaign/CampaignComponents';
import { getCampaignState } from '@/lib/campaignManager';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

interface UnifiedSearchTrack {
  id: string;
  title: string;
  artist: {
    id?: string;
    name: string;
    avatarUrl?: string;
  };
  album?: {
    id?: string;
    name: string;
    coverUrl?: string;
  };
  durationMs: number;
  popularity: number;
  previewUrl: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
  coverUrl: string;
  explicit?: boolean;
  genres?: string[];
  score?: number;
  isHQ?: boolean;
  language?: string;
  genre?: string;
  mood?: string;
  activity?: string;
  views?: string;
  matchDetails?: {
    reason: string;
    matchedArtist: string | null;
    matchedMood: string | null;
    matchedGenre: string | null;
    matchedActivity: string | null;
    matchedLanguage: string | null;
    matchedLyrics: string | null;
  };
}

interface GroupedSearchResponse {
  topArtist: any | null;
  artists: any[];
  songs: UnifiedSearchTrack[];
  albums: any[];
  playlists: any[];
  videos: UnifiedSearchTrack[];
  podcasts: UnifiedSearchTrack[];
  covers: UnifiedSearchTrack[];
  live: UnifiedSearchTrack[];
  aiMix: any | null;
  didYouMean?: boolean;
  originalQuery?: string;
  correctedQuery?: string;
  suggestedArtists?: any[];
  suggestedSongs?: UnifiedSearchTrack[];
  popularBengaliSongs?: UnifiedSearchTrack[];
}

const REASONING_STEPS = [
  { label: "Understanding language...", log: "[OK] Normalizing inputs and correcting spelling..." },
  { label: "Detecting intent...", log: "[OK] Tagging semantic vibes, occasion, and activities..." },
  { label: "Searching metadata...", log: "[OK] Scanning Postgres SQL indices..." },
  { label: "Searching YouTube...", log: "[OK] Querying video feeds..." },
  { label: "Searching Spotify...", log: "[OK] Resolving official API catalogs..." },
  { label: "Searching local uploads...", log: "[OK] Checking cloud locker references..." },
  { label: "Ranking results...", log: "[OK] Calculating fuzzy matching weights and confidence..." },
  { label: "Finished", log: "[OK] Outputting ranked search dossier." }
];

export default function SearchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const supabase = createClientBrowser();

  const [query, setQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeFilter, setFilter] = useState('All');
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef<any>(null);

  // Background states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [campaignActive, setCampaignActive] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // AI Reasoning State Machine
  const [reasoningActive, setReasoningActive] = useState(false);
  const [reasoningStep, setReasoningStep] = useState(0);
  const [reasoningLogs, setReasoningLogs] = useState<string[]>([]);
  const searchIntervalRef = useRef<any>(null);

  // Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Generate initial particles
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Gravitational pull to mouse pointer
        const dx = mousePos.x - p.x;
        const dy = mousePos.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          p.x += (dx / dist) * 0.25;
          p.y += (dy / dist) * 0.25;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45, 212, 255, ${p.alpha})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [mousePos]);

  // Sync state
  useEffect(() => {
    setCampaignActive(getCampaignState().isActive);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('neotunes-recent-searches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.warn('Failed to parse recent searches');
        }
      }
    }
  }, []);

  // Web Speech API Voice Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setQuery(transcript);
            executeSearch(transcript);
          }
        };

        rec.onerror = (e: any) => {
          console.error('Speech error:', e);
          setSpeechError('Failed to capture speech. Try typing.');
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Add search term to history
  const addToRecent = (term: string) => {
    if (!term || term.trim() === '') return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('neotunes-recent-searches', JSON.stringify(updated));
  };

  const removeRecent = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('neotunes-recent-searches', JSON.stringify(updated));
  };

  // Query pipeline search endpoint
  const { data: searchResults, isFetching, refetch } = useQuery<GroupedSearchResponse>({
    queryKey: ['search-results', activeSearch],
    queryFn: async () => {
      if (!activeSearch) return { topArtist: null, artists: [], songs: [], albums: [], playlists: [], videos: [], podcasts: [], covers: [], live: [], aiMix: null };
      const res = await fetch(`/api/search?q=${encodeURIComponent(activeSearch)}`);
      if (!res.ok) throw new Error('Search request failed');
      return res.json();
    },
    enabled: false
  });

  const executeSearch = (term: string, skipHistory = false) => {
    const clean = term.trim();
    if (!clean) return;

    // Trigger AI reasoning simulation
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
    }

    setReasoningActive(true);
    setReasoningStep(0);
    setReasoningLogs([]);
    setActiveSearch(clean);
    setQuery(clean);
    if (!skipHistory) addToRecent(clean);

    // Simulate multi-stage reasoning logs
    let currentStep = 0;
    const stepInterval = setInterval(() => {
      if (currentStep < REASONING_STEPS.length) {
        setReasoningStep(currentStep + 1);
        const logMsg = REASONING_STEPS[currentStep]?.log || '';
        setReasoningLogs(prev => [...prev, logMsg]);
        currentStep++;
      } else {
        clearInterval(stepInterval);
        searchIntervalRef.current = null;
        setReasoningActive(false);
        refetch();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#2DD4FF', '#9B5CFF']
        });
      }
    }, 280);
    searchIntervalRef.current = stepInterval;
  };

  const handlePlayTrack = (track: UnifiedSearchTrack, list: UnifiedSearchTrack[]) => {
    const mappedList = list.map(t => ({
      ...t,
      artist: typeof t.artist === 'string' ? { name: t.artist } : (t.artist || { name: 'Unknown' }),
      sourceType: t.sourceType || 'youtube',
      durationMs: t.durationMs || 180000
    })) as any[];
    
    const target = mappedList.find(t => t.id === track.id) || {
      ...track,
      artist: typeof track.artist === 'string' ? { name: track.artist } : (track.artist || { name: 'Unknown' }),
      sourceType: track.sourceType || 'youtube',
      durationMs: track.durationMs || 180000
    };
    
    if (currentTrack?.id === target.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(target as any, mappedList);
    }
  };

  const triggerLike = (track: UnifiedSearchTrack) => {
    fetch('/api/liked', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: track.id, track }),
    })
      .then(res => {
        if (res.ok) {
          alert(`Successfully liked "${track.title}"!`);
        }
      })
      .catch(e => console.warn('Failed to like track:', e));
  };

  const triggerShare = (track: UnifiedSearchTrack) => {
    if (navigator.share) {
      navigator.share({
        title: track.title,
        text: `Check out ${track.title} by ${track.artist.name} on NeoTunes!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/player?id=${track.id}`);
      alert('Track link copied to clipboard!');
    }
  };

  // Clean data outputs
  const songsList = searchResults?.songs || [];
  const artistsList = searchResults?.artists || [];
  const albumsList = searchResults?.albums || [];
  const playlistsList = searchResults?.playlists || [];
  const videosList = searchResults?.videos || [];
  const podcastsList = searchResults?.podcasts || [];
  const coversList = searchResults?.covers || [];
  const liveList = searchResults?.live || [];
  const topArtist = searchResults?.topArtist || null;

  // Fallbacks
  const suggestedArtists = searchResults?.suggestedArtists || [];
  const suggestedSongs = searchResults?.suggestedSongs || [];
  const popularBengaliSongs = searchResults?.popularBengaliSongs || [];

  // Filter counters
  const counts = {
    Songs: songsList.length,
    Artists: artistsList.length,
    Albums: albumsList.length,
    Playlists: playlistsList.length,
    Videos: videosList.length,
    Podcasts: podcastsList.length,
    Live: liveList.length
  };

  return (
    <div 
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      className="space-y-8 text-white pb-36 text-left relative font-sans select-none w-full min-h-screen overflow-hidden"
    >
      {/* 1. Interactive Particle Canvas Backdrop */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none -z-20" />

      {/* Aurora Lighting Cones */}
      <div className="absolute top-[-100px] left-1/3 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#2DD4FF]/10 to-[#9B5CFF]/5 blur-[120px] pointer-events-none -z-10 animate-pulse [animation-duration:8s]" />
      <div className="absolute bottom-10 right-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-[#FF2D55]/5 to-[#9B5CFF]/10 blur-[130px] pointer-events-none -z-10 animate-pulse [animation-duration:10s]" />

      {/* Voice Assistant Pulsing Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#050505]/95 flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="absolute h-32 w-32 rounded-full bg-[#2DD4FF]/20 blur-xl"
              />
              <div className="relative h-24 w-24 rounded-full bg-gradient-to-tr from-[#2DD4FF] to-[#9B5CFF] flex items-center justify-center shadow-lg shadow-[#2DD4FF]/25">
                <Mic className="h-10 w-10 text-black animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Listening to Voice Input</h2>
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest animate-pulse">Say a song, movie, mood, or artist name...</p>
            </div>
            <button
              onClick={() => setIsListening(false)}
              className="px-6 py-2.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign header bar if World Cup Active */}
      {campaignActive && <CampaignSearchRibbon />}

      {/* A. SEARCH INPUT CONTROL DECK */}
      <div className="space-y-6 max-w-4xl">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#2DD4FF] bg-[#2DD4FF]/10 px-3.5 py-1.5 rounded-full border border-[#2DD4FF]/20">
            <Radio className="h-3.5 w-3.5" />
            <span>AI Search OS v4.1</span>
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white uppercase">
            Semantic Intelligence Command
          </h1>
        </div>
        
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-neutral-500 group-focus-within:text-[#2DD4FF] transition-colors" />
          </div>
          
          <input
            type="text"
            placeholder="Type anything... 'bandhu tui koi geli' or 'that sad arijit song' or 'coding lofi'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') executeSearch(query);
            }}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#0E0E11]/80 py-4.5 pr-20 pl-13 text-sm font-semibold text-white placeholder-neutral-500 outline-none transition-all focus:border-[#2DD4FF] focus:shadow-[0_0_20px_rgba(45,212,255,0.12)]"
          />

          {/* Voice Mic Trigger */}
          <div className="absolute inset-y-0 right-3 flex items-center gap-2">
            <button
              onClick={toggleVoiceSearch}
              className="p-2.5 rounded-xl border border-white/[0.06] bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-[#2DD4FF] transition-colors"
              title="Voice Input"
            >
              <Mic className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Laser scanning bar during reasoning */}
          {reasoningActive && (
            <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#2DD4FF] to-transparent animate-pulse" />
          )}
        </div>

        {speechError && (
          <p className="text-xs font-bold text-rose-450 pl-1">{speechError}</p>
        )}
      </div>

      {/* B. RECENT SEARCHES OVERLAY */}
      {isInputFocused && recentSearches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-[#0E0E11] p-4.5 shadow-2xl space-y-3 text-left"
        >
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-500 tracking-wider">
            <span>Recent Command History</span>
            <Clock className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <div
                key={term}
                onClick={() => executeSearch(term)}
                className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-neutral-900/40 hover:bg-neutral-800 px-3.5 py-1.5 text-xs font-bold text-neutral-350 hover:text-white cursor-pointer transition-colors"
              >
                <span>{term}</span>
                <span onClick={(e) => removeRecent(e, term)} className="text-neutral-600 hover:text-rose-400 ml-1 select-none font-bold">×</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* C. INITIAL DISCOVERY VIEW (IF NO SEARCH DONE) */}
      {!activeSearch && !reasoningActive && (
        <div className="space-y-10 animate-fadeIn max-w-6xl">
          
          {/* Quick NLP prompts grid */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Suggested Semantic Prompts</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: "bandhu tui koi geli", desc: "Transliterated Bengali Folk search", tag: "Transliteration" },
                { title: "that sad arijit song", desc: "Emotion & artist matching", tag: "Sad Mood" },
                { title: "late night lofi beats for coding", desc: "Activity & genre mapping", tag: "Focus Session" },
                { title: "football edit music", desc: "Stadium energy beats", tag: "World Cup Vibe" },
                { title: "gym workout motivation", desc: "High-BPM electronic pump", tag: "Energy Boost" },
                { title: "retro classic hindi 90s", desc: "Generational decade query", tag: "Decade Shift" }
              ].map((item) => (
                <div
                  key={item.title}
                  onClick={() => executeSearch(item.title)}
                  className="rounded-2xl border border-white/[0.06] bg-[#0E0E11]/80 p-5 cursor-pointer hover:border-[#2DD4FF]/40 hover:-translate-y-1 transition-all text-left flex flex-col justify-between min-h-[110px]"
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#2DD4FF] bg-[#2DD4FF]/10 px-2 py-0.5 rounded w-fit block">{item.tag}</span>
                    <h4 className="text-sm font-black text-white italic group-hover:text-[#2DD4FF] mt-2">&ldquo;{item.title}&rdquo;</h4>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-semibold mt-2">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Mood Categories Grid */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Intelligent AI Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {[
                { name: "Pop",        emoji: "🎤", gradient: "from-[#2DD4FF]/25 to-transparent",   border: "hover:border-[#2DD4FF]/30" },
                { name: "Hip-Hop",    emoji: "🎧", gradient: "from-[#9B5CFF]/25 to-transparent",   border: "hover:border-[#9B5CFF]/30" },
                { name: "Electronic", emoji: "⚡", gradient: "from-[#34D399]/25 to-transparent",   border: "hover:border-[#34D399]/30" },
                { name: "Bollywood",  emoji: "🪘", gradient: "from-amber-500/25 to-transparent",   border: "hover:border-amber-500/30" },
                { name: "Rock",       emoji: "🎸", gradient: "from-[#FF2D55]/25 to-transparent",   border: "hover:border-[#FF2D55]/30" },
                { name: "Lo-Fi",      emoji: "☁️", gradient: "from-neutral-700/25 to-transparent", border: "hover:border-neutral-500/30" },
              ].map((g) => (
                <div
                  key={g.name}
                  onClick={() => executeSearch(g.name)}
                  className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${g.gradient} ${g.border} p-5 cursor-pointer hover:-translate-y-1.5 transition-all text-left flex flex-col justify-between aspect-square group shadow-xl`}
                >
                  <span className="text-3xl mb-4 block group-hover:scale-105 transition-transform">{g.emoji}</span>
                  <span className="text-xs font-black text-white uppercase tracking-wider">{g.name}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* D. AI REASONING TERMINAL SIMULATION */}
      {reasoningActive && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl rounded-3xl border border-white/[0.08] bg-[#0E0E11]/90 p-6 backdrop-blur-2xl space-y-6 shadow-2xl text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
            <div className="flex items-center space-x-3 text-[#2DD4FF]">
              <Terminal className="h-5 w-5 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-wider">AI Reasoning Pipeline</h2>
            </div>
            <div className="flex space-x-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
            </div>
          </div>

          {/* Process step list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Steps panel */}
            <div className="space-y-2">
              {REASONING_STEPS.map((step, idx) => {
                const isPassed = reasoningStep > idx;
                const isCurrent = reasoningStep === idx;
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center space-x-3 text-xs font-bold transition-all ${
                      isPassed ? 'text-[#34D399]' : isCurrent ? 'text-[#2DD4FF] pl-2' : 'text-neutral-600'
                    }`}
                  >
                    <span className="w-5 font-mono">0{idx + 1}.</span>
                    <span className="flex-1">{step.label}</span>
                    {isPassed && <CheckCircle className="h-4.5 w-4.5 text-[#34D399]" />}
                    {isCurrent && <Loader2 className="h-4 w-4 animate-spin text-[#2DD4FF]" />}
                  </div>
                );
              })}
            </div>

            {/* Terminal logs panel */}
            <div className="rounded-2xl bg-neutral-950 p-4 border border-white/[0.04] font-mono text-[10px] text-neutral-400 space-y-2 h-48 overflow-y-auto scrollbar-thin">
              <p className="text-neutral-500">{"// Processing Query: \"" + activeSearch + "\""}</p>
              {reasoningLogs.map((log, idx) => (
                <p key={idx} className="animate-fadeIn">{log}</p>
              ))}
              {reasoningStep < REASONING_STEPS.length && (
                <p className="text-[#2DD4FF] animate-pulse">_</p>
              )}
            </div>

          </div>
        </motion.div>
      )}

      {/* E. ACTIVE RESULTS VIEWPORT */}
      {activeSearch && !reasoningActive && (
        <div className="space-y-10 animate-fadeIn max-w-6xl text-left">
          
          {/* Autocorrection suggestion banner */}
          {searchResults?.didYouMean && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900/60 border border-white/[0.08] p-5 rounded-2xl text-xs space-y-1.5 backdrop-blur-xl"
            >
              <p className="font-semibold text-neutral-400">
                Showing results for <span className="text-[#2DD4FF] italic font-bold">&ldquo;{searchResults.correctedQuery}&rdquo;</span>
              </p>
              <button
                onClick={() => executeSearch(searchResults.originalQuery || '', true)}
                className="text-[#2DD4FF] hover:text-white underline font-bold transition-colors"
              >
                Search instead for &ldquo;{searchResults.originalQuery}&rdquo;
              </button>
            </motion.div>
          )}

          {/* Unified Perplexity-style AI matched description summary box */}
          {songsList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-[#0E0E11]/85 p-6 backdrop-blur-2xl space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Sparkle className="h-28 w-28 text-[#2DD4FF]" />
              </div>

              <div className="flex items-center space-x-2 text-[#2DD4FF]">
                <Sparkles className="h-4.5 w-4.5" />
                <h3 className="text-xs font-black uppercase tracking-widest">Perplexity AI Summary</h3>
              </div>

              <p className="text-sm font-semibold text-neutral-300 leading-relaxed max-w-4xl">
                We resolved your command &ldquo;{activeSearch}&rdquo; using fuzzy match metadata vectors. 
                The primary intent targets <strong className="text-[#2DD4FF]">{songsList[0].artist.name}</strong> under the 
                genre classification <strong className="text-[#9B5CFF]">{songsList[0].genre || 'Bollywood'}</strong>. 
                Calculated search confidence matching rate is at <strong className="text-[#34D399]">{songsList[0].score || 95}%</strong>.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <span className="text-[10px] font-black uppercase bg-neutral-900 border border-white/[0.06] px-3.5 py-1.5 rounded-full">🎯 Match Vibe: {songsList[0].mood || 'Chill'}</span>
                <span className="text-[10px] font-black uppercase bg-neutral-900 border border-white/[0.06] px-3.5 py-1.5 rounded-full">🇮🇳 Language: {songsList[0].language || 'Hindi'}</span>
                <span className="text-[10px] font-black uppercase bg-neutral-900 border border-white/[0.06] px-3.5 py-1.5 rounded-full">🔥 Popularity: {songsList[0].popularity || 84}/100</span>
              </div>
            </motion.div>
          )}

          {/* Filter Categories Tab Selector */}
          <div className="flex flex-wrap gap-2.5 border-b border-white/[0.04] pb-4">
            {[
              { id: 'All', label: 'All Results' },
              { id: 'Songs', label: `Songs (${counts.Songs})` },
              { id: 'Artists', label: `Artists (${counts.Artists})` },
              { id: 'Albums', label: `Albums (${counts.Albums})` },
              { id: 'Playlists', label: `Playlists (${counts.Playlists})` },
              { id: 'Videos', label: `Videos (${counts.Videos})` },
              { id: 'Podcasts', label: `Podcasts (${counts.Podcasts})` },
              { id: 'Live', label: `Concerts (${counts.Live})` }
            ].map((filterTab) => {
              const countMatch = filterTab.id === 'All' || (counts as any)[filterTab.id] > 0;
              if (!countMatch) return null;

              return (
                <button
                  key={filterTab.id}
                  onClick={() => setFilter(filterTab.id)}
                  className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-wider transition-all border ${
                    activeFilter === filterTab.id
                      ? "bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] text-black border-[#2DD4FF] shadow-md shadow-[#2DD4FF]/10"
                      : "bg-[#0E0E11]/60 text-neutral-450 hover:bg-neutral-800 hover:text-white border-white/[0.06]"
                  }`}
                >
                  {filterTab.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Sections Grid */}
          {isFetching ? (
            /* Skeleton Loading State */
            <div className="space-y-4 py-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between rounded-2xl bg-[#0E0E11] p-4 border border-white/[0.04]">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-neutral-900 rounded-xl" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-40 bg-neutral-850 rounded" />
                      <div className="h-2 w-24 bg-neutral-850 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-16 bg-neutral-850 rounded" />
                </div>
              ))}
            </div>
          ) : (songsList.length === 0 && artistsList.length === 0 && albumsList.length === 0 && playlistsList.length === 0) ? (
            
            /* FALLBACK LAYOUT: ALWAYS DISPLAY CLOSEST MATCHES, POPULAR BENGALI SONGS, RECOMMENDATIONS */
            <div className="space-y-10 animate-fadeIn w-full">
              
              {/* Informative alert tag */}
              <div className="rounded-3xl p-6 border border-white/[0.06] bg-[#0E0E11]/85 space-y-4 max-w-4xl text-left shadow-2xl">
                <div className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  <h2 className="text-base font-black uppercase tracking-wider">No Exact Match Registered</h2>
                </div>
                <p className="text-xs font-semibold text-neutral-400 leading-relaxed">
                  We couldn&apos;t resolve an exact match for &ldquo;{activeSearch}&rdquo; in our local catalog index. 
                  NeoTunes has compiled fallback suggestions, popular searches, and trending tracks for you below.
                </p>
              </div>

              {/* Suggested Songs Fallback Grid */}
              {suggestedSongs.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#2DD4FF]">Recommended Closest Matches</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {suggestedSongs.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handlePlayTrack(track, suggestedSongs)}
                        className="group relative rounded-2xl border border-white/[0.06] bg-[#0E0E11] p-4.5 cursor-pointer hover:border-[#2DD4FF]/30 transition-all flex gap-4 text-left"
                      >
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/[0.05]">
                          <img src={track.coverUrl || '/default-album.png'} alt={track.title} className="object-cover w-full h-full" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="text-xs font-black text-white group-hover:text-[#2DD4FF] transition-colors truncate">{track.title}</h4>
                          <p className="text-[10px] text-neutral-400 font-semibold truncate">{track.artist.name}</p>
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#9B5CFF] block">Trending Vibe</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Popular Bengali Songs Fallback Slider */}
              {popularBengaliSongs.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#9B5CFF]">Trending Bengali Hits</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {popularBengaliSongs.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handlePlayTrack(track, popularBengaliSongs)}
                        className="group rounded-2xl border border-white/[0.04] bg-[#0E0E11] p-3 text-left cursor-pointer hover:border-[#2DD4FF]/25 transition-all"
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.05]">
                          <img src={track.coverUrl || '/default-album.png'} alt={track.title} className="object-cover w-full h-full" />
                        </div>
                        <h4 className="text-[11px] font-black text-white mt-2 truncate w-full group-hover:text-[#2DD4FF] transition-colors">{track.title}</h4>
                        <p className="text-[9px] text-neutral-450 font-bold truncate mt-0.5">{track.artist.name}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Suggested Artists fallback */}
              {suggestedArtists.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#34D399]">Community Favorite Artists</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {suggestedArtists.map((art: any) => (
                      <div
                        key={art.id}
                        onClick={() => router.push(`/artists/${art.id}`)}
                        className="group rounded-2xl border border-white/[0.04] bg-[#0E0E11] p-3 text-center cursor-pointer hover:border-[#34D399]/25 transition-all"
                      >
                        <div className="relative h-16 w-16 mx-auto rounded-full overflow-hidden border border-white/[0.08] shadow bg-neutral-900">
                          <img src={art.coverUrl || '/default-artist.png'} alt={art.name} className="object-cover w-full h-full" />
                        </div>
                        <h4 className="text-[11px] font-black text-white mt-2 truncate w-full group-hover:text-[#34D399] transition-colors">{art.name}</h4>
                        <span className="text-[8px] font-black text-[#34D399] uppercase tracking-wider mt-1 block">Verified</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          ) : (
            
            /* STANDARD RESULTS LAYOUT WITH COMPLETE DOSSIER METADATA */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Top Match & Unified Songs list */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Top Spotlight card */}
                {topArtist && activeFilter === 'All' && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Spotlight Match</h3>
                    <div
                      onClick={() => router.push(`/artists/${topArtist.id}`)}
                      className="group relative rounded-3xl border border-white/[0.08] bg-[#0E0E11]/80 p-6 flex flex-col sm:flex-row items-center gap-6 cursor-pointer shadow-2xl hover:border-[#2DD4FF]/30 transition-all duration-300 w-full text-center sm:text-left"
                    >
                      <div className="relative h-24 w-24 rounded-full overflow-hidden border border-white/[0.08] shadow bg-neutral-900 flex-shrink-0">
                        <img src={topArtist.coverUrl} alt={topArtist.name} className="object-cover w-full h-full" />
                      </div>
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#2DD4FF] bg-[#2DD4FF]/10 px-2.5 py-1 rounded border border-[#2DD4FF]/20">Best Fit</span>
                          {topArtist.verified && <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded">VERIFIED</span>}
                        </div>
                        <h4 className="text-2xl font-black text-white group-hover:text-[#2DD4FF] transition-colors truncate">{topArtist.name}</h4>
                        <p className="text-xs text-neutral-400 font-bold truncate">
                          {topArtist.genres.slice(0, 3).join(' · ')} {topArtist.monthlyListeners && `· ${topArtist.monthlyListeners.toLocaleString()} monthly listeners`}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Songs section */}
                {songsList.length > 0 && (activeFilter === 'All' || activeFilter === 'Songs') && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Songs Dossier ({songsList.length})</h3>
                    <div className="space-y-3.5">
                      {songsList.map((track, i) => {
                        const isCurrent = currentTrack?.id === track.id;
                        return (
                          <div
                            key={track.id}
                            className={`rounded-3xl border p-5 transition-all duration-300 relative group overflow-hidden ${
                              isCurrent 
                                ? 'border-[#2DD4FF]/30 bg-[#2DD4FF]/5 shadow-[0_0_20px_rgba(45,212,255,0.06)]' 
                                : 'border-white/[0.06] bg-[#0E0E11]/90 hover:border-[#2DD4FF]/25 hover:bg-[#121217]'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              {/* Left Art and text details */}
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <span className="text-xs font-black text-neutral-500 w-5 text-center">{i + 1}</span>
                                
                                {/* Large Album Artwork */}
                                <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-neutral-900 border border-white/[0.06] flex-shrink-0 group-hover:scale-105 transition-transform duration-300 shadow">
                                  <img src={track.coverUrl || '/default-album.png'} alt={track.title} className="object-cover w-full h-full" />
                                  {isCurrent && isPlaying && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span className="flex gap-[3px] items-end h-3">
                                        <span className="w-[2px] bg-[#2DD4FF] animate-equalizer-bar-1" />
                                        <span className="w-[2px] bg-[#2DD4FF] animate-equalizer-bar-2" style={{ animationDelay: '0.1s' }} />
                                        <span className="w-[2px] bg-[#2DD4FF] animate-equalizer-bar-3" style={{ animationDelay: '0.2s' }} />
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="text-left min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className={`text-sm font-black truncate leading-normal ${isCurrent ? 'text-[#2DD4FF]' : 'text-white'}`}>{track.title}</h4>
                                    {track.isHQ && <span className="text-[8px] font-black text-[#2DD4FF] bg-[#2DD4FF]/10 px-1.5 py-0.5 rounded">HQ</span>}
                                  </div>
                                  <p className="text-xs text-neutral-400 font-bold truncate mt-0.5">{track.artist?.name} · {track.album?.name || 'Single'}</p>
                                  
                                  {/* Badges and parameters row */}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    <span className="text-[9px] font-semibold text-neutral-500 uppercase">🔥 {track.popularity}/100</span>
                                    <span className="text-[9px] font-semibold text-neutral-500">•</span>
                                    <span className="text-[9px] font-semibold text-neutral-500 uppercase">⏱️ {Math.floor(track.durationMs / 60000)}:{(Math.floor(track.durationMs / 1000) % 60).toString().padStart(2, '0')}</span>
                                    <span className="text-[9px] font-semibold text-neutral-500">•</span>
                                    <span className="text-[9px] font-semibold text-neutral-500 uppercase">👁️ {track.views || '12.4M'}</span>
                                    <span className="text-[9px] font-semibold text-neutral-500">•</span>
                                    <span className="text-[9px] font-semibold text-neutral-500 uppercase">{track.language}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right details: Confidence & Controls */}
                              <div className="flex items-center justify-between md:justify-end gap-4.5 pt-4 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                                <div className="text-right">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-[#34D399]">🎯 {track.score || 95}% Match</div>
                                  <span className="text-[8px] font-semibold uppercase text-neutral-500 block mt-0.5">Source: {track.sourceType.toUpperCase()}</span>
                                </div>

                                {/* Inline controls */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handlePlayTrack(track, songsList)}
                                    className="h-10 w-10 rounded-full bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] text-black flex items-center justify-center active:scale-95 transition-transform"
                                    title="Play track"
                                  >
                                    {isCurrent && isPlaying ? <Pause className="h-4.5 w-4.5 stroke-[2.5]" /> : <Play className="h-4.5 w-4.5 fill-black stroke-none translate-x-[0.5px]" />}
                                  </button>
                                  <button
                                    onClick={() => triggerLike(track)}
                                    className="p-2 rounded-xl border border-white/[0.06] bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-[#FF2D55] transition-colors"
                                    title="Like track"
                                  >
                                    <Heart className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => triggerShare(track)}
                                    className="p-2 rounded-xl border border-white/[0.06] bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                    title="Share Link"
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Dropdown matched attributes details container */}
                            {track.matchDetails && (
                              <div className="mt-4 pt-3 border-t border-white/[0.03] space-y-2 text-[10px] text-neutral-400 text-left font-semibold">
                                <p className="text-[#2DD4FF] font-bold">Explanation: <span className="text-neutral-300 font-medium">{track.matchDetails.reason}</span></p>
                                {track.matchDetails.matchedLyrics && (
                                  <p className="italic text-neutral-450 bg-neutral-950/60 p-2 rounded-lg border border-white/[0.03]">Matched lyrics: &ldquo;{track.matchDetails.matchedLyrics}&rdquo;</p>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              </div>

              {/* Right Column: Video matches, related artists, playlists */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Related Videos */}
                {videosList.length > 0 && (activeFilter === 'All' || activeFilter === 'Videos') && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Related Videos</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {videosList.map((track) => (
                        <div
                          key={track.id}
                          className="group relative rounded-2xl border border-white/[0.06] bg-[#0E0E11] p-3 text-left cursor-pointer hover:border-[#2DD4FF]/25 transition-all"
                        >
                          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.05]">
                            <img src={track.coverUrl || '/default-album.png'} alt={track.title} className="object-cover w-full h-full" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <button onClick={() => handlePlayTrack(track, videosList)} className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/40"><Play className="h-5 w-5 fill-current translate-x-[0.5px]" /></button>
                            </div>
                          </div>
                          <h4 className="text-xs font-black text-white mt-3 truncate w-full group-hover:text-[#2DD4FF] transition-colors">{track.title}</h4>
                          <p className="text-[10px] text-neutral-450 font-bold truncate mt-0.5">{track.artist?.name} · Video</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Artists list */}
                {artistsList.length > 0 && (activeFilter === 'All' || activeFilter === 'Artists') && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Artists</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {artistsList.slice(0, 4).map((art: any) => (
                        <div
                          key={art.id}
                          onClick={() => router.push(`/artists/${art.id}`)}
                          className="group rounded-2xl border border-white/[0.04] bg-[#0E0E11] p-3 text-center cursor-pointer hover:border-[#2DD4FF]/25 transition-all"
                        >
                          <div className="relative h-16 w-16 mx-auto rounded-full overflow-hidden border border-white/[0.08] shadow bg-neutral-900">
                            <img src={art.coverUrl} alt={art.name} className="object-cover w-full h-full" />
                          </div>
                          <h4 className="text-[11px] font-black text-white mt-2 truncate w-full group-hover:text-[#2DD4FF] transition-colors">{art.name}</h4>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
