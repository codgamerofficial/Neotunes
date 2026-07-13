'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { 
  Play, 
  Pause, 
  Sparkles, 
  Clock, 
  Music, 
  Compass, 
  TrendingUp, 
  Radio, 
  Volume2, 
  VolumeX, 
  ListMusic, 
  Cloud,
  ChevronRight,
  Disc,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Track {
  id: string;
  title: string;
  artist: { name: string; id?: string };
  album?: { name: string; coverUrl?: string; id?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
}

export default function HomePage() {
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const router = useRouter();
  const supabase = createClientBrowser();
  
  const [userProfile, setUserProfile] = useState<{ displayName: string } | null>(null);
  const [selectedMood, setSelectedMood] = useState('Coding');
  const [showAiDJDetail, setShowAiDJDetail] = useState(false);

  // Sync user profile name
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        if (data) {
          setUserProfile({
            displayName: data.display_name || user.email?.split('@')[0] || 'Saswata',
          });
        }
      }
    };
    fetchProfile();
  }, []);

  // Fetch Discover Mix recommendations
  const { data: recsResponse, isLoading: recsLoading } = useQuery<{ data: { tracks: Track[] }; fallbackUsed: boolean; message?: string }>({
    queryKey: ['discover-mix'],
    queryFn: async () => {
      const res = await fetch('/api/recommendations?type=discover-weekly');
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      return res.json();
    },
  });

  // Fetch Recently Played History
  const { data: historyData, isLoading: historyLoading } = useQuery<{ history: Track[] }>({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  // Fetch Cloud Uploads
  const { data: cloudData, isLoading: cloudLoading } = useQuery<{ uploads: Track[] }>({
    queryKey: ['cloud-uploads-home'],
    queryFn: async () => {
      const res = await fetch('/api/cloud');
      if (!res.ok) throw new Error('Failed to fetch cloud uploads');
      return res.json();
    },
  });

  const recommendations = recsResponse?.data?.tracks || [];
  const history = historyData?.history || [];
  const cloudMusic = cloudData?.uploads || [];
  const displayName = userProfile?.displayName || 'Saswata';

  const getTimeOfDayLabel = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  };
  const timeOfDay = getTimeOfDayLabel().toLowerCase();

  const handlePlayTrack = (track: Track, list: Track[]) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, list);
      
      // Log track in listening history in database
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, track }),
      }).catch((err) => console.warn('Failed to log history:', err));
    }
  };

  // Curated Lists matching the 18 user requirements
  const arijitSongs: Track[] = [
    { id: 'kesariya', title: 'Kesariya', artist: { name: 'Arijit Singh', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Brahmastra' }, coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80', durationMs: 268000, sourceType: 'youtube' },
    { id: 'tum-hi-ho', title: 'Tum Hi Ho', artist: { name: 'Arijit Singh', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Aashiqui 2' }, coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80', durationMs: 262000, sourceType: 'youtube' },
    { id: 'chaleya', title: 'Chaleya', artist: { name: 'Arijit Singh', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Jawan' }, coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube' },
    { id: 'apna-bana-le', title: 'Apna Bana Le', artist: { name: 'Arijit Singh', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Bhediya' }, coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80', durationMs: 264000, sourceType: 'youtube' },
    { id: 'heeriye', title: 'Heeriye (feat. Arijit Singh)', artist: { name: 'Jasleen Royal', id: '3448f76d4' }, album: { name: 'Heeriye Single' }, coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80', durationMs: 198000, sourceType: 'youtube' }
  ];

  const globalHits: Track[] = [
    { id: 'flowers', title: 'Flowers', artist: { name: 'Miley Cyrus' }, album: { name: 'Endless Summer Vacation' }, coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube' },
    { id: 'blinding-lights', title: 'Blinding Lights', artist: { name: 'The Weeknd' }, album: { name: 'After Hours' }, coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube' },
    { id: 'as-it-was', title: 'As It Was', artist: { name: 'Harry Styles' }, album: { name: "Harry's House" }, coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80', durationMs: 167000, sourceType: 'youtube' },
    { id: 'espresso', title: 'Espresso', artist: { name: 'Sabrina Carpenter' }, album: { name: 'Espresso Single' }, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80', durationMs: 175000, sourceType: 'youtube' },
    { id: 'lunch', title: 'LUNCH', artist: { name: 'Billie Eilish' }, album: { name: 'HIT ME HARD AND SOFT' }, coverUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=500&auto=format&fit=crop&q=80', durationMs: 180000, sourceType: 'youtube' }
  ];

  const trendingYoutube: Track[] = [
    { id: 'yt-1', title: 'Hanumankind - Big Dawgs', artist: { name: 'Hanumankind' }, album: { name: 'Big Dawgs Single' }, coverUrl: 'https://img.youtube.com/vi/hOHKltAiKXQ/mqdefault.jpg', durationMs: 205000, sourceType: 'youtube' },
    { id: 'yt-2', title: 'Coldplay - Feelslikeimfallinginlove', artist: { name: 'Coldplay' }, album: { name: 'Moon Music' }, coverUrl: 'https://img.youtube.com/vi/W7lT4HlY82M/mqdefault.jpg', durationMs: 240000, sourceType: 'youtube' },
    { id: 'yt-3', title: 'Eminem - Houdini', artist: { name: 'Eminem' }, album: { name: 'The Death of Slim Shady' }, coverUrl: 'https://img.youtube.com/vi/22tVWwmVg1M/mqdefault.jpg', durationMs: 227000, sourceType: 'youtube' },
    { id: 'yt-4', title: 'Post Malone - I Had Some Help (feat. Morgan Wallen)', artist: { name: 'Post Malone' }, album: { name: 'F-1 Trillion' }, coverUrl: 'https://img.youtube.com/vi/W59hL7Wk1tM/mqdefault.jpg', durationMs: 180000, sourceType: 'youtube' }
  ];

  const livePerformances: Track[] = [
    { id: 'live-1', title: 'Fix You (Live in São Paulo)', artist: { name: 'Coldplay' }, album: { name: 'Live Album' }, coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80', durationMs: 310000, sourceType: 'youtube' },
    { id: 'live-2', title: 'Alive 2007 Medley (Live)', artist: { name: 'Daft Punk' }, album: { name: 'Alive 2007' }, coverUrl: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=500&auto=format&fit=crop&q=80', durationMs: 350000, sourceType: 'youtube' },
    { id: 'live-3', title: 'Cruel Summer (The Eras Tour Live)', artist: { name: 'Taylor Swift' }, album: { name: 'Lover (Live)' }, coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80', durationMs: 215000, sourceType: 'youtube' }
  ];

  const podcasts: Track[] = [
    { id: 'pod-1', title: 'Episode 2150 - Terrifying AI Future', artist: { name: 'The Joe Rogan Experience' }, album: { name: 'Podcast' }, coverUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=80', durationMs: 7200000, sourceType: 'youtube' },
    { id: 'pod-2', title: 'Decoding the Universe with Kip Thorne', artist: { name: 'Lex Fridman Podcast' }, album: { name: 'Podcast' }, coverUrl: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=500&auto=format&fit=crop&q=80', durationMs: 6500000, sourceType: 'youtube' },
    { id: 'pod-3', title: 'Deep Space Colonization & Mars Vibe', artist: { name: 'The Ranveer Show' }, album: { name: 'Podcast' }, coverUrl: 'https://images.unsplash.com/photo-1610116306796-6fea9f4fae38?w=500&auto=format&fit=crop&q=80', durationMs: 4500000, sourceType: 'youtube' }
  ];

  // Based on mood tracks lists mapping
  const moodTracks: Record<string, Track[]> = {
    Coding: [
      { id: 'mood-c1', title: 'Resonance', artist: { name: 'HOME' }, album: { name: 'Odyssey' }, coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube' },
      { id: 'mood-c2', title: 'Starboy (Synthwave Remix)', artist: { name: 'The Weeknd' }, album: { name: 'Cyberpunk Vibe' }, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', durationMs: 220000, sourceType: 'youtube' },
      { id: 'mood-c3', title: 'Daylight', artist: { name: 'David Kushner' }, album: { name: 'Focus Mix' }, coverUrl: 'https://images.unsplash.com/photo-1482440308425-276ad0f28b19?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube' },
    ],
    Workout: [
      { id: 'mood-w1', title: 'Industry Baby', artist: { name: 'Lil Nas X & Jack Harlow' }, album: { name: 'High Hype' }, coverUrl: 'https://images.unsplash.com/photo-1571330735066-03add575248c?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube' },
      { id: 'mood-w2', title: 'Till I Collapse', artist: { name: 'Eminem' }, album: { name: 'The Eminem Show' }, coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80', durationMs: 297000, sourceType: 'youtube' },
    ],
    Happy: [
      { id: 'mood-h1', title: 'Happy', artist: { name: 'Pharrell Williams' }, album: { name: 'G I R L' }, coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80', durationMs: 233000, sourceType: 'youtube' },
      { id: 'mood-h2', title: 'Can\'t Stop the Feeling!', artist: { name: 'Justin Timberlake' }, album: { name: 'Trolls' }, coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80', durationMs: 236000, sourceType: 'youtube' },
    ],
    Focus: [
      { id: 'mood-f1', title: 'Gymnopédie No.1', artist: { name: 'Erik Satie' }, album: { name: 'Ambient Classics' }, coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80', durationMs: 180000, sourceType: 'youtube' },
      { id: 'mood-f2', title: 'Lo-Fi Study Beats', artist: { name: 'Chillhop' }, album: { name: 'Coding Session' }, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube' },
    ],
    Sleep: [
      { id: 'mood-s1', title: 'Weightless', artist: { name: 'Marconi Union' }, album: { name: 'Ambient Sleep' }, coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80', durationMs: 480000, sourceType: 'youtube' },
    ]
  };

  const getActiveMoodTracks = () => moodTracks[selectedMood] || moodTracks['Coding'];

  const TrackCard = ({ track, onClick }: { track: Track; onClick: () => void }) => {
    const isCurrent = currentTrack?.id === track.id;
    const artistName = track.artist?.name || 'Unknown';
    const isYt = track.id.startsWith('yt-') || track.id.startsWith('pod-') || track.id.startsWith('mood-') || track.id.startsWith('live-') || track.id.length < 15;

    // Use Spotify router path on click if it's a real track
    const handleNavigation = (e: React.MouseEvent) => {
      // If we clicked play directly, don't navigate
      e.stopPropagation();
      onClick();
    };

    const handleCardClick = () => {
      if (track.id.startsWith('mood-') || track.id.startsWith('yt-') || track.id.startsWith('pod-')) {
        onClick();
      } else {
        router.push(`/albums/${track.album?.id || '4aawyABuhtvU4upGL7jSMG'}`);
      }
    };

    return (
      <div
        onClick={handleCardClick}
        className="group relative flex-shrink-0 w-44 snap-start rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] overflow-hidden hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-200 cursor-pointer"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-850 to-neutral-900">
              <Music className="h-8 w-8 text-neutral-600" />
            </div>
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleNavigation}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/40 transform scale-90 group-hover:scale-100 transition-transform active:scale-95"
            >
              {isCurrent && isPlaying ? (
                <Pause className="h-4.5 w-4.5 fill-black stroke-black" />
              ) : (
                <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-0.5 text-left font-sans">
          <p className={`text-sm font-semibold leading-tight line-clamp-1 ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white'}`}>
            {track.title}
          </p>
          <p className="text-[11px] text-neutral-500 line-clamp-1">
            {artistName}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 text-white pb-12 font-sans select-none">
      
      {/* 1. GREETING HEADER & BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/10 via-purple-600/5 to-transparent border border-white/[0.06] px-8 py-10 text-left">
        {/* Glowing atmospheres */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-32 h-48 w-48 rounded-full bg-purple-600/10 blur-3xl" />

        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
          {getTimeOfDayLabel()} · NeoTunes Universe
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
          Good {timeOfDay},<br className="sm:hidden" /> {displayName}
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400 font-semibold leading-relaxed">
          Unifying your local clouds, YouTube discoverability, and Spotify metadata into a single, high-fidelity experience.
        </p>
      </div>

      {/* 2. DYNAMIC AI DJ PANEL */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111111]/70 backdrop-blur-xl p-6 text-left">
        <div className="absolute top-0 right-0 p-4">
          <button 
            onClick={() => setShowAiDJDetail(!showAiDJDetail)}
            className="text-neutral-500 hover:text-white p-1 transition-colors"
            title="AI DJ Details"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Spinning glowing DJ disc */}
            <div className="relative h-16 w-16 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 p-0.5 shadow-[0_0_20px_rgba(0,245,255,0.2)] animate-spin [animation-duration:10s] flex-shrink-0">
              <div className="h-full w-full rounded-full bg-[#111111] flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">AI DJ Session</span>
              <h2 className="text-xl font-black text-white">AI DJ Saswata</h2>
              <p className="text-xs text-neutral-400 font-semibold">Ready with your late-night workspace vibe</p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => handlePlayTrack(arijitSongs[0], arijitSongs)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-6 py-3 text-xs font-black text-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <Play className="h-4 w-4 fill-black stroke-black translate-x-[0.5px]" />
              <span>Launch AI DJ Mix</span>
            </button>
          </div>
        </div>

        {/* AI DJ Decision Logic Display */}
        <AnimatePresence>
          {(showAiDJDetail || true) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-5 border-t border-white/[0.05] grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3 text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Recent Activity</span>
                <p className="text-xs font-bold text-neutral-250 mt-1">Coding React Apps</p>
              </div>
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3 text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Favorite Artists</span>
                <p className="text-xs font-bold text-neutral-250 mt-1">Arijit Singh, Weeknd</p>
              </div>
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3 text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Today&apos;s Weather</span>
                <p className="text-xs font-bold text-neutral-250 mt-1">Monsoon Showers 🌧️</p>
              </div>
              <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3 text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Time of Day</span>
                <p className="text-xs font-bold text-neutral-250 mt-1">Late Night Vibes</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 3. MOOD DETECTION PANEL */}
      <section className="space-y-4 text-left">
        <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">Identify Your Mood</h3>
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {['Coding', 'Focus', 'Workout', 'Happy', 'Sleep', 'Driving', 'Study', 'Romantic', 'Rain', 'Party'].map((mood) => {
            const isActive = selectedMood === mood;
            const emojis: Record<string, string> = {
              Coding: '💻', Focus: '🧠', Workout: '⚡', Happy: '😄', Sleep: '😴', Driving: '🚗', Study: '📖', Romantic: '❤️', Rain: '🌧️', Party: '🥳'
            };
            return (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all border ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-400 to-purple-500 border-cyan-400 text-black shadow-md shadow-cyan-500/10'
                    : 'border-white/[0.06] bg-[#111111]/40 text-neutral-400 hover:text-white hover:border-neutral-750'
                }`}
              >
                <span>{emojis[mood] || '🎵'}</span>
                <span>{mood}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. AI MIXES SECTION */}
      <section className="space-y-4 text-left">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-bold tracking-tight text-white">AI Daily Mixes</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {[
            { title: 'Coding Mix', desc: 'Focus instrumentals and synthwaves', gradient: 'from-[#7B61FF] to-[#00F5FF]' },
            { title: 'Morning Mix', desc: 'Light acoustic and wake-up songs', gradient: 'from-amber-500 to-cyan-400' },
            { title: 'Evening Mix', desc: 'Chill beats and lo-fi melodies', gradient: 'from-purple-600 to-rose-400' },
            { title: 'Rain Mix', desc: 'Cozy atmospheric acoustics', gradient: 'from-blue-600 to-indigo-500' },
            { title: 'Late Night Mix', desc: 'Deep atmospheric and OLED ambient', gradient: 'from-neutral-900 to-purple-950' },
            { title: 'Travel Mix', desc: 'Upbeat tracks for the open road', gradient: 'from-emerald-500 to-teal-400' }
          ].map((mix) => (
            <div
              key={mix.title}
              onClick={() => handlePlayTrack(getActiveMoodTracks()[0], getActiveMoodTracks())}
              className="snap-start flex-shrink-0 w-64 rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-5 cursor-pointer relative overflow-hidden group hover:border-cyan-500/40 hover:-translate-y-1 transition-all"
            >
              {/* Glowing gradient back-accent */}
              <div className={`absolute -inset-px -z-10 bg-gradient-to-tr ${mix.gradient} opacity-0 group-hover:opacity-10 rounded-2xl blur-md transition-opacity duration-300`} />
              <div className={`h-2.5 w-12 rounded-full bg-gradient-to-r ${mix.gradient} mb-4`} />
              <h4 className="text-sm font-black text-white">{mix.title}</h4>
              <p className="text-xs text-neutral-500 mt-1">{mix.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. DYNAMIC SECTIONS GRID */}

      {/* FOR YOU */}
      <section className="space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">For You</h2>
        </div>
        {recsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse w-44 h-56 rounded-2xl bg-[#1A1A1A]/40" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
            {recommendations.slice(0, 8).map((track) => (
              <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, recommendations)} />
            ))}
          </div>
        )}
      </section>

      {/* BASED ON YOUR MOOD */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">Based on Your Mood: <span className="text-cyan-400 font-extrabold">{selectedMood}</span></h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {getActiveMoodTracks().map((track) => (
            <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, getActiveMoodTracks())} />
          ))}
        </div>
      </section>

      {/* CONTINUE LISTENING & RECENTS */}
      {history.length > 0 && (
        <section className="space-y-4 text-left">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-neutral-400" />
            <h2 className="text-lg font-bold tracking-tight">Continue Listening</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
            {history.slice(0, 6).map((track, i) => (
              <TrackCard key={`${track.id}-continue-${i}`} track={track} onClick={() => handlePlayTrack(track, history)} />
            ))}
          </div>
        </section>
      )}

      {/* TRENDING ON YOUTUBE */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">🔥 Trending on YouTube</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {trendingYoutube.map((track) => (
            <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, trendingYoutube)} />
          ))}
        </div>
      </section>

      {/* ARIJIT SINGH CORNER */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">🎤 Because You Like Arijit Singh</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {arijitSongs.map((track) => (
            <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, arijitSongs)} />
          ))}
        </div>
      </section>

      {/* OFFICIAL RELEASES */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">💿 Official Releases</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {globalHits.map((track) => (
            <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, globalHits)} />
          ))}
        </div>
      </section>

      {/* LIVE PERFORMANCES & CONCERTS */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">⚡ Live Performances & Concerts</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {livePerformances.map((track) => (
            <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, livePerformances)} />
          ))}
        </div>
      </section>

      {/* PODCASTS */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">🎙️ Trending Podcasts</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {podcasts.map((track) => (
            <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, podcasts)} />
          ))}
        </div>
      </section>

      {/* CLOUD MUSIC & COMMUNITY UPLOADS */}
      {cloudMusic.length > 0 && (
        <section className="space-y-4 text-left">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-bold tracking-tight">Your Cloud Music</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide">
            {cloudMusic.map((track) => (
              <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, cloudMusic)} />
            ))}
          </div>
        </section>
      )}

      {/* CHARTS & HIT SECTIONS */}
      <section className="space-y-4 text-left">
        <h2 className="text-lg font-bold tracking-tight">📈 NeoTunes Charts (Top Hits)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {globalHits.slice(0, 4).map((track, i) => (
            <div
              key={`${track.id}-chart`}
              onClick={() => handlePlayTrack(track, globalHits)}
              className="flex items-center gap-4 rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.04] p-3.5 hover:bg-[#1A1A1A]/60 cursor-pointer transition-colors"
            >
              <span className="text-lg font-black text-neutral-600 w-6 text-center">#{i + 1}</span>
              <img src={track.coverUrl} className="h-12 w-12 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-white truncate">{track.title}</p>
                <p className="text-xs text-neutral-500 truncate">{track.artist.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-600" />
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
