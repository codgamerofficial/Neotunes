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
  Loader2,
  Compass,
  Cpu,
  Trophy
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

const AI_CATEGORIES = [
  { name: "Pop",        emoji: "🎤", color: "#00F5FF", gradient: "from-[#00F5FF]/20 via-neutral-900/40 to-transparent" },
  { name: "Hip-Hop",    emoji: "🎧", color: "#7B61FF", gradient: "from-[#7B61FF]/20 via-neutral-900/40 to-transparent" },
  { name: "Electronic", emoji: "⚡", color: "#34D399", gradient: "from-[#34D399]/20 via-neutral-900/40 to-transparent" },
  { name: "Bollywood",  emoji: "🪘", color: "#F59E0B", gradient: "from-[#F59E0B]/20 via-neutral-900/40 to-transparent" },
  { name: "Rock",       emoji: "🎸", color: "#FF2D55", gradient: "from-[#FF2D55]/20 via-neutral-900/40 to-transparent" },
  { name: "Lo-Fi",      emoji: "☁️", color: "#6B7280", gradient: "from-[#6B7280]/20 via-neutral-900/40 to-transparent" },
  { name: "Classical",  emoji: "🎻", color: "#8B5CF6", gradient: "from-[#8B5CF6]/20 via-neutral-900/40 to-transparent" },
  { name: "Podcasts",   emoji: "🎙️", color: "#10B981", gradient: "from-[#10B981]/20 via-neutral-900/40 to-transparent" },
  { name: "Mood Mixes", emoji: "🍷", color: "#EC4899", gradient: "from-[#EC4899]/20 via-neutral-900/40 to-transparent" },
  { name: "Workout",    emoji: "🏃", color: "#F43F5E", gradient: "from-[#F43F5E]/20 via-neutral-900/40 to-transparent" },
  { name: "Sleep Vibe", emoji: "🌙", color: "#3B82F6", gradient: "from-[#3B82F6]/20 via-neutral-900/40 to-transparent" },
];

const MOCK_AI_PICKS: UnifiedSearchTrack[] = [
  { id: "kesariya", title: "Kesariya", artist: { name: "Arijit Singh" }, durationMs: 268165, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 85 },
  { id: "blinding-lights", title: "Blinding Lights", artist: { name: "The Weeknd" }, durationMs: 201570, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 90 },
  { id: "espresso", title: "Espresso", artist: { name: "Sabrina Carpenter" }, durationMs: 175459, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 92 },
  { id: "yt-1", title: "Big Dawgs", artist: { name: "Hanumankind & Kalmi" }, durationMs: 190667, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 88 },
  { id: "lunch", title: "LUNCH", artist: { name: "Billie Eilish" }, durationMs: 179587, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 86 },
];

const MOCK_NEW_RELEASES: UnifiedSearchTrack[] = [
  { id: "yt-2", title: "feelslikeimfallinginlove", artist: { name: "Coldplay" }, durationMs: 236231, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/af/3c/0f/af3c0fe2-1c4f-8499-67a8-14a8e41fdbf8/5021732410535.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 84 },
  { id: "yt-3", title: "Houdini", artist: { name: "Eminem" }, durationMs: 227000, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/0c/3b/c1/0c3bc1e5-8f64-984f-e221-bf96fe08ca67/24UMGIM42701.rgb.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 89 },
  { id: "flowers", title: "Flowers", artist: { name: "Miley Cyrus" }, durationMs: 200600, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 87 },
  { id: "heeriye", title: "Heeriye", artist: { name: "Jasleen Royal & Arijit Singh" }, durationMs: 194857, coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg", sourceType: 'youtube', previewUrl: '', popularity: 83 },
];

const MOCK_TRENDING_ARTISTS = [
  { id: "arijit-singh", name: "Arijit Singh", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/8f/2c/18/8f2c18d1-f519-e587-ec17-f3eb54fa5727/190295851458.jpg/600x600bb.jpg" },
  { id: "the-weeknd", name: "The Weeknd", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/8b/63/c4/8b63c46e-1d57-19aa-78b1-3be22dc8f46c/19UM1IM02484.rgb.jpg/600x600bb.jpg" },
  { id: "coldplay", name: "Coldplay", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/b8/aa/06/b8aa063c-396f-c104-5825-fdfce7ea49bb/5019039234827.jpg/600x600bb.jpg" },
  { id: "sabrina-carpenter", name: "Sabrina Carpenter", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/eb/fa/cb/ebfacbe3-85f0-621f-c4ff-d227b6c7a98b/24UMGIM35300.rgb.jpg/600x600bb.jpg" },
  { id: "billie-eilish", name: "Billie Eilish", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dc/18/b7/dc18b763-7eb9-6a97-9e48-8df0c345d2e0/21UMGIM08436.rgb.jpg/600x600bb.jpg" },
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

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.setItem('neotunes-recent-searches', JSON.stringify([]));
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
          <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-[#00F5FF] bg-[#00F5FF]/10 px-3.5 py-1.5 rounded-full border border-[#00F5FF]/20">
            <Sparkles className="h-3.5 w-3.5 text-[#00F5FF]" />
            <span>AI Search OS v4.1</span>
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white uppercase">
            Semantic Intelligence Command
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium">
            An advanced semantic mapping engine translating mood, activity, language, and lyrics into immediate audio signals.
          </p>
        </div>
        
        {/* Futuristic glowing search bar container */}
        <div className={`relative w-full group rounded-[22px] p-[1.5px] bg-gradient-to-r transition-all duration-500 shadow-[inner_0_2px_4px_rgba(255,255,255,0.02),_0_12px_45px_rgba(0,0,0,0.55)] ${
          reasoningActive 
            ? 'from-[#00F5FF] via-[#7B61FF] to-[#9B5CFF] animate-pulse shadow-[0_0_35px_rgba(0,245,255,0.25)]' 
            : 'from-white/[0.08] to-white/[0.08] hover:from-white/[0.15] hover:to-white/[0.15] focus-within:from-[#00F5FF] focus-within:to-[#9B5CFF] focus-within:shadow-[0_0_30px_rgba(0,245,255,0.15),_0_0_50px_rgba(155,92,255,0.1)]'
        }`}>
          <div className="relative w-full h-[72px] sm:h-[76px] rounded-[21px] bg-[#0E111A]/85 backdrop-blur-2xl flex items-center overflow-hidden">
            
            {/* Perfectly Centered Search Icon */}
            <div className="absolute left-0 top-0 bottom-0 w-14 sm:w-16 flex items-center justify-center pointer-events-none z-10">
              <SearchIcon className="h-5.5 w-5.5 sm:h-6 w-6 text-neutral-455 group-focus-within:text-[#00F5FF] transition-colors duration-300" />
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
              className="w-full h-full bg-transparent border-none outline-none pl-14 sm:pl-16 pr-16 sm:pr-20 text-sm sm:text-base font-semibold text-white placeholder-white/45 caret-[#00F5FF] transition-all duration-300"
            />

            {/* Voice Mic Trigger */}
            <div className="absolute right-3.5 sm:right-4 top-0 bottom-0 flex items-center z-10">
              <button
                onClick={toggleVoiceSearch}
                className="h-10 w-10 sm:h-11 w-11 rounded-xl border flex items-center justify-center bg-white/[0.04] border-white/[0.08] hover:border-[#00F5FF]/40 text-neutral-400 hover:text-[#00F5FF] hover:bg-white/[0.08] hover:scale-105 active:scale-95 transition-all duration-300"
                title="Voice Input"
              >
                <Mic className="h-5 w-5 text-current" />
              </button>
            </div>

            {/* Laser scanning bar during reasoning */}
            {reasoningActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#00F5FF] to-transparent animate-pulse" />
            )}
          </div>
        </div>

        {speechError && (
          <p className="text-xs font-bold text-rose-450 pl-1">{speechError}</p>
        )}

        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest pl-2">
          ⚡ TIP: Try natural prompts describing mood, context, or transliterated lyrics.
        </div>
      </div>

      {/* B. RECENT SEARCHES OVERLAY */}
      {isInputFocused && recentSearches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 w-full max-w-4xl rounded-2xl border border-white/[0.08] bg-[#0E111A]/95 p-4.5 shadow-2xl space-y-3 text-left backdrop-blur-2xl"
        >
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-500 tracking-wider">
            <span>Recent Command History</span>
            <span onClick={clearAllRecent} className="hover:text-rose-450 cursor-pointer transition-colors">Clear All</span>
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
        <div className="space-y-12 animate-fadeIn max-w-6xl">
          
          {/* Quick NLP prompts Bento Grid */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Suggested Semantic Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Card 1: Bengali Transliteration (Wide) */}
              <div
                onClick={() => executeSearch("bandhu tui koi geli")}
                className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#00F5FF]/10 via-[#3B82F6]/5 to-transparent border border-white/[0.06] hover:border-[#00F5FF]/30 p-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,245,255,0.06)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#00F5FF]/5 blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#00F5FF] bg-[#00F5FF]/10 px-2.5 py-1 rounded-full border border-[#00F5FF]/20">Transliteration</span>
                  <Compass className="h-5 w-5 text-neutral-500 group-hover:text-[#00F5FF] transition-colors" />
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black text-white italic group-hover:text-[#00F5FF] transition-colors">&ldquo;bandhu tui koi geli&rdquo;</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">Bengali folk search. Instantly matches phonetic inputs to relational metadata.</p>
                </div>
              </div>

              {/* Card 2: Focus Session (Tall) */}
              <div
                onClick={() => executeSearch("late night lofi beats for coding")}
                className="col-span-1 md:row-span-2 bg-gradient-to-br from-[#7B61FF]/10 via-[#9B5CFF]/5 to-transparent border border-white/[0.06] hover:border-[#7B61FF]/30 p-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(123,97,255,0.06)] flex flex-col justify-between min-h-[220px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-[#7B61FF]/5 blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#7B61FF] bg-[#7B61FF]/10 px-2.5 py-1 rounded-full border border-[#7B61FF]/20">Focus Session</span>
                  <Cpu className="h-5 w-5 text-neutral-500 group-hover:text-[#7B61FF] transition-colors" />
                </div>
                <div className="mt-8 text-left">
                  <h4 className="text-base font-black text-white italic group-hover:text-[#7B61FF] transition-colors">&ldquo;late night lofi beats for coding&rdquo;</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-2 leading-relaxed">Activity & vibe mapping. Generate a custom ambient space tailored for deep focus and low-tempo study flow.</p>
                </div>
              </div>

              {/* Card 3: Sad Mood (Standard) */}
              <div
                onClick={() => executeSearch("that sad arijit song")}
                className="col-span-1 bg-gradient-to-br from-[#FF2D55]/10 to-transparent border border-white/[0.06] hover:border-[#FF2D55]/30 p-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(255,45,85,0.06)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-[#FF2D55]/5 blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#FF2D55] bg-[#FF2D55]/10 px-2.5 py-1 rounded-full border border-[#FF2D55]/20">Sad Mood</span>
                  <Heart className="h-5 w-5 text-neutral-500 group-hover:text-[#FF2D55] transition-colors" />
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black text-white italic group-hover:text-[#FF2D55] transition-colors">&ldquo;that sad arijit song&rdquo;</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">Emotion & artist correlation.</p>
                </div>
              </div>

              {/* Card 4: World Cup Vibe (Standard) */}
              <div
                onClick={() => executeSearch("football edit music")}
                className="col-span-1 bg-gradient-to-br from-amber-500/10 to-transparent border border-white/[0.06] hover:border-amber-500/30 p-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(245,158,11,0.06)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-amber-500/5 blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">World Cup Vibe</span>
                  <Trophy className="h-5 w-5 text-neutral-500 group-hover:text-amber-500 transition-colors" />
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black text-white italic group-hover:text-amber-500 transition-colors">&ldquo;football edit music&rdquo;</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">Stadium energy audio beats.</p>
                </div>
              </div>

              {/* Card 5: Energy Boost (Wide) */}
              <div
                onClick={() => executeSearch("gym workout motivation")}
                className="col-span-1 md:col-span-2 bg-gradient-to-br from-[#34D399]/10 via-[#00F5FF]/5 to-transparent border border-white/[0.06] hover:border-[#34D399]/30 p-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(52,211,153,0.06)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[#34D399]/5 blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#34D399] bg-[#34D399]/10 px-2.5 py-1 rounded-full border border-[#34D399]/20">Energy Boost</span>
                  <Activity className="h-5 w-5 text-neutral-500 group-hover:text-[#34D399] transition-colors" />
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black text-white italic group-hover:text-[#34D399] transition-colors">&ldquo;gym workout motivation&rdquo;</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">High-BPM electronic pump. Maximize physical output with heavy synth lines.</p>
                </div>
              </div>

              {/* Card 6: Decade Shift (Standard) */}
              <div
                onClick={() => executeSearch("retro classic hindi 90s")}
                className="col-span-1 bg-gradient-to-br from-[#00F5FF]/10 to-transparent border border-white/[0.06] hover:border-[#00F5FF]/30 p-6 rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,245,255,0.06)] flex flex-col justify-between min-h-[140px] relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-[#00F5FF]/5 blur-xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#00F5FF] bg-[#00F5FF]/10 px-2.5 py-1 rounded-full border border-[#00F5FF]/20">Decade Shift</span>
                  <Clock className="h-5 w-5 text-neutral-500 group-hover:text-[#00F5FF] transition-colors" />
                </div>
                <div className="mt-4">
                  <h4 className="text-base font-black text-white italic group-hover:text-[#00F5FF] transition-colors">&ldquo;retro classic hindi 90s&rdquo;</h4>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">Nostalgic decade-specific curation.</p>
                </div>
              </div>

            </div>
          </section>

          {/* Immersive Category Cards */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Intelligent AI Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {AI_CATEGORIES.map((c) => (
                <div
                  key={c.name}
                  onClick={() => executeSearch(c.name)}
                  className="relative rounded-[22px] border border-white/[0.05] bg-[#0E111A]/60 p-5 cursor-pointer hover:border-white/[0.15] hover:-translate-y-1.5 transition-all duration-300 text-left flex flex-col justify-between aspect-square group shadow-xl overflow-hidden"
                  style={{
                    boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.35)`
                  }}
                >
                  {/* Immersive radial glow source */}
                  <div 
                    className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-45 transition-all duration-500"
                    style={{ backgroundColor: c.color }}
                  />
                  {/* Soft Particles inside */}
                  <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <span className="absolute w-1 h-1 rounded-full bg-white top-1/4 left-1/3 animate-ping" />
                    <span className="absolute w-1.5 h-1.5 rounded-full bg-white top-2/3 left-2/3 animate-pulse" />
                    <span className="absolute w-1 h-1 rounded-full bg-white top-1/2 left-3/4 animate-ping" />
                  </div>

                  <span className="text-3xl mb-4 block transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">{c.emoji}</span>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-white uppercase tracking-wider block">{c.name}</span>
                    <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">OS Optimized</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI Picks & Trending Sections (Content Below) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            
            {/* Left Column: AI Picks & New Releases */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* AI Picks for You */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">AI picks for you</h3>
                  <span className="text-[9px] font-black text-[#00F5FF] uppercase tracking-wider bg-[#00F5FF]/10 px-2.5 py-1 rounded-full border border-[#00F5FF]/20 animate-pulse">Personalized</span>
                </div>
                <div className="space-y-3">
                  {MOCK_AI_PICKS.map((track, i) => (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track, MOCK_AI_PICKS)}
                      className="group rounded-2xl border border-white/[0.04] bg-[#0E111A]/40 hover:bg-[#121622]/60 hover:border-white/[0.1] p-3 cursor-pointer transition-all duration-300 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className="text-xs font-black text-neutral-500 w-5 text-center">0{i + 1}</span>
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.05] flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          <img src={track.coverUrl} alt={track.title} className="object-cover w-full h-full" />
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="text-xs font-black text-white truncate group-hover:text-[#00F5FF] transition-colors">{track.title}</h4>
                          <p className="text-[10px] text-neutral-450 font-bold truncate mt-0.5">{track.artist.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <span className="text-[9px] font-black uppercase text-[#00F5FF]/80">98% match</span>
                        <button className="h-8.5 w-8.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-gradient-to-r group-hover:from-[#00F5FF] group-hover:to-[#9B5CFF] group-hover:border-none flex items-center justify-center text-white group-hover:text-black transition-all">
                          <Play className="h-3.5 w-3.5 fill-current translate-x-[0.5px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* New Releases */}
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">New Releases</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MOCK_NEW_RELEASES.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => handlePlayTrack(track, MOCK_NEW_RELEASES)}
                      className="group rounded-2xl border border-white/[0.04] bg-[#0E111A]/40 hover:bg-[#121622]/60 hover:border-white/[0.1] p-3.5 cursor-pointer transition-all duration-300 flex items-center gap-3.5"
                    >
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.05] flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <img src={track.coverUrl} alt={track.title} className="object-cover w-full h-full" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className="text-xs font-black text-white truncate group-hover:text-[#00F5FF] transition-colors">{track.title}</h4>
                        <p className="text-[10px] text-neutral-450 font-bold truncate mt-0.5">{track.artist.name}</p>
                        <span className="inline-block text-[8px] font-black text-[#9B5CFF] bg-[#9B5CFF]/10 px-1.5 py-0.5 rounded border border-[#9B5CFF]/20 mt-1">NEW RELEASE</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Right Column: Trending Artists & OS Insights */}
            <div className="lg:col-span-4 space-y-10">
              
              {/* Trending Artists */}
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Trending Artists</h3>
                <div className="grid grid-cols-2 gap-4">
                  {MOCK_TRENDING_ARTISTS.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => executeSearch(art.name)}
                      className="group rounded-2xl border border-white/[0.04] bg-[#0E111A]/40 p-4 text-center cursor-pointer hover:border-white/[0.12] transition-all duration-300"
                    >
                      <div className="relative h-16 w-16 mx-auto rounded-full overflow-hidden border border-white/[0.08] shadow bg-neutral-900 group-hover:scale-105 transition-transform duration-300">
                        <img src={art.coverUrl} alt={art.name} className="object-cover w-full h-full" />
                      </div>
                      <h4 className="text-[11px] font-black text-white mt-3 truncate w-full group-hover:text-[#00F5FF] transition-colors">{art.name}</h4>
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mt-0.5 block">Verified</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* OS Insights */}
              <section className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">OS Intelligence Insights</h3>
                <div className="rounded-[24px] border border-white/[0.05] bg-gradient-to-br from-[#0E111A]/80 to-transparent p-5 space-y-4 text-left shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[#9B5CFF]/5 blur-2xl pointer-events-none" />
                  
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                      <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Active Profile</span>
                      <span className="text-[10px] text-[#00F5FF] font-black uppercase">Lossless Coder</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                      <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Energy Quotient</span>
                      <span className="text-[10px] text-[#34D399] font-black uppercase">High (84 BPM Avg)</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                      <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Top Vibe intent</span>
                      <span className="text-[10px] text-[#7B61FF] font-black uppercase">Synthesized Lofi</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">Peak Listening Hour</span>
                      <span className="text-[10px] text-amber-500 font-black uppercase">10 PM - 1 AM</span>
                    </div>
                  </div>
                </div>
              </section>

            </div>

          </div>

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
