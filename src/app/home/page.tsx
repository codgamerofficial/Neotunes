'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import PremiumTrackCard, { Track } from '@/components/ui/PremiumTrackCard';
import { 
  Sparkles, 
  Clock, 
  Compass, 
  TrendingUp, 
  Cloud,
  ChevronRight,
  Info,
  Grid,
  Headphones,
  Sliders,
  Volume2,
  Trophy,
  Loader2,
  Calendar,
  Activity,
  Play,
  Pause,
  Flame,
  Radio,
  Music,
  CloudLightning,
  Sun,
  Moon,
  Compass as Travel,
  Activity as Football,
  Calendar as Christmas,
  Users,
  Eye,
  Ticket,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignHeroBanner } from '@/components/campaign/CampaignComponents';
import { getCampaignState } from '@/lib/campaignManager';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

type AIDashboardMode = 'Morning' | 'Night' | 'Rain' | 'Travel' | 'Coding' | 'Workout' | 'Football' | 'Christmas' | 'World Cup';

export default function HomePage() {
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const router = useRouter();
  const supabase = createClientBrowser();
  
  const [userProfile, setUserProfile] = useState<{ displayName: string } | null>(null);
  const [selectedMood, setSelectedMood] = useState('Coding');
  const [showAiDJDetail, setShowAiDJDetail] = useState(false);
  const [campaignActive, setCampaignActive] = useState(false);
  
  // AI DJ generation states
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedCount, setAiGeneratedCount] = useState(0);

  // Dynamic AI Dashboard Modes
  const [dashboardMode, setDashboardMode] = useState<AIDashboardMode>('Coding');
  const [mockWeather, setMockWeather] = useState('Showers 🌧️');
  const [mockTime, setMockTime] = useState('23:22 PM');
  
  // Stats for Hero Section
  const [stats, setStats] = useState({ likedCount: 5, cloudCount: 2, historyCount: 32 });

  // Sync user profile name
  useEffect(() => {
    setCampaignActive(getCampaignState().isActive);
    const fetchProfileAndStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserProfile({
            displayName: profile.display_name || user.email?.split('@')[0] || 'Saswata',
          });
        }

        try {
          const [likedRes, cloudRes, historyRes] = await Promise.all([
            supabase.from('liked_tracks').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('cloud_uploads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('listening_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          ]);
          setStats({
            likedCount: likedRes.count || 5,
            cloudCount: cloudRes.count || 2,
            historyCount: historyRes.count || 32
          });
        } catch (err) {
          console.warn('Failed to fetch stats for hero:', err);
        }
      }
    };
    fetchProfileAndStats();
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

  const handlePlayTrack = (track: Track, list: Track[]) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, list);
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, track }),
      }).catch((err) => console.warn('Failed to log history:', err));
    }
  };

  const handleGenerateAiPlaylist = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      setAiGeneratedCount(prev => prev + 1);
      
      const customAiList: Track[] = [
        { 
          id: 'ai-playlist-1', 
          title: 'Cyberpunk Workspace Beats', 
          artist: { name: 'AI Generator' }, 
          album: { name: 'AI Daily Discovery' }, 
          durationMs: 185000, 
          sourceType: 'youtube',
          isHQ: true 
        },
        { 
          id: 'ai-playlist-2', 
          title: 'Midnight Lofi Chill', 
          artist: { name: 'AI Generator' }, 
          album: { name: 'AI Focus Beats' }, 
          durationMs: 210000, 
          sourceType: 'youtube',
          isHQ: true 
        },
        { 
          id: 'ai-playlist-3', 
          title: 'Rainy Day Coding Station', 
          artist: { name: 'Lofi Orbit' }, 
          album: { name: 'Workspace Acoustics' }, 
          durationMs: 195000, 
          sourceType: 'youtube' 
        }
      ];
      
      playTrack(customAiList[0], customAiList);
    }, 2000);
  };

  const arijitSongs: Track[] = [
    { id: '6iBjgI6c7Bnt78v38e4a9v', title: 'Kesariya (From "Brahmastra")', artist: { name: 'Pritam, Arijit Singh & Amitabh Bhattacharya', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Kesariya - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg', durationMs: 268165, sourceType: 'youtube', isHQ: true },
    { id: '56MuuL29m1338x6j3n3R0e', title: 'Tum Hi Ho', artist: { name: 'Mithoon & Arijit Singh', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Aashiqui 2 Soundtrack', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/23/ee/bb23eeed-0c35-4f1d-2b11-485622777ae4/8902894353007_cover.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/23/ee/bb23eeed-0c35-4f1d-2b11-485622777ae4/8902894353007_cover.jpg/600x600bb.jpg', durationMs: 261974, sourceType: 'youtube' },
    { id: '3y7tEszcskWw1q7UpxjPZ7', title: 'Chaleya (From "Jawan")', artist: { name: 'Anirudh Ravichander, Arijit Singh & Shilpa Rao', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Chaleya - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/ff/32/1eff3216-190d-6fd9-8f68-acbba846e6ee/8903431956026_cover.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/ff/32/1eff3216-190d-6fd9-8f68-acbba846e6ee/8903431956026_cover.jpg/600x600bb.jpg', durationMs: 200374, sourceType: 'youtube', isHQ: true },
    { id: '3y4oF6ZfP0sX7zE5p8v6nN', title: 'Apna Bana Le (From "Bhediya")', artist: { name: 'Arijit Singh & Sachin-Jigar', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Apna Bana Le - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg', durationMs: 261702, sourceType: 'youtube' },
    { id: '5NX1aRjZ0K5Jp7f8p8v6nN', title: 'Heeriye', artist: { name: 'Jasleen Royal & Arijit Singh', id: '3448f76d4' }, album: { name: 'Heeriye - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg', durationMs: 194857, sourceType: 'youtube', isHQ: true }
  ];

  const globalHits: Track[] = [
    { id: 'it_1674691586', title: 'Flowers', artist: { name: 'Miley Cyrus' }, album: { name: 'Endless Summer Vacation', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg', durationMs: 200600, sourceType: 'youtube', streamCount: '4.8M streams', trend: 'up' },
    { id: '0VjIjW4GlUZAMYd2vXMi3b', title: 'Blinding Lights', artist: { name: 'The Weeknd' }, album: { name: 'Blinding Lights - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg', durationMs: 201570, sourceType: 'youtube', streamCount: '4.2M streams', trend: 'flat', isHQ: true },
    { id: '4D7tIB1C03sfw5k049URrw', title: 'As It Was', artist: { name: 'Harry Styles' }, album: { name: "Harry's House", coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg', durationMs: 167303, sourceType: 'youtube', streamCount: '3.9M streams', trend: 'down' },
    { id: 'it_1746801012', title: 'Espresso', artist: { name: 'Sabrina Carpenter' }, album: { name: 'Espresso - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg', durationMs: 175459, sourceType: 'youtube', streamCount: '3.5M streams', trend: 'new', isHQ: true }
  ];

  const moodTracks: Record<string, Track[]> = {
    Coding: [
      { id: 'mood-c1', title: 'Resonance', artist: { name: 'HOME' }, album: { name: 'Odyssey' }, coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube', isHQ: true },
      { id: 'mood-c2', title: 'Starboy (Synthwave)', artist: { name: 'The Weeknd' }, album: { name: 'Cyberpunk Vibe' }, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', durationMs: 220000, sourceType: 'youtube' },
      { id: 'mood-c3', title: 'Daylight Focus', artist: { name: 'David Kushner' }, album: { name: 'Focus Mix' }, coverUrl: 'https://images.unsplash.com/photo-1482440308425-276ad0f28b19?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube', isHQ: true },
    ],
    Workout: [
      { id: 'mood-w1', title: 'Industry Baby', artist: { name: 'Lil Nas X' }, album: { name: 'High Hype' }, coverUrl: 'https://images.unsplash.com/photo-1571330735066-03add575248c?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube', explicit: true },
      { id: 'mood-w2', title: 'Till I Collapse', artist: { name: 'Eminem' }, album: { name: 'The Eminem Show' }, coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80', durationMs: 297000, sourceType: 'youtube', explicit: true, isHQ: true },
    ],
    Happy: [
      { id: 'mood-h1', title: 'Happy Vibes', artist: { name: 'Pharrell' }, album: { name: 'G I R L' }, coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80', durationMs: 233000, sourceType: 'youtube' },
    ],
    Focus: [
      { id: 'mood-f1', title: 'Gymnopédie No.1', artist: { name: 'Erik Satie' }, album: { name: 'Ambient Classics' }, coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80', durationMs: 180000, sourceType: 'youtube' },
    ],
    Sleep: [
      { id: 'mood-s1', title: 'Weightless', artist: { name: 'Marconi Union' }, album: { name: 'Ambient Sleep' }, coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80', durationMs: 480000, sourceType: 'youtube', isHQ: true },
    ]
  };

  const getActiveMoodTracks = () => moodTracks[selectedMood] || moodTracks['Coding'];

  // Mode settings & descriptions
  const dashboardModes: Record<AIDashboardMode, { bg: string; weather: string; desc: string; streak: string; time: string }> = {
    Morning: { bg: 'from-amber-600/10 via-[#07090D] to-transparent', weather: 'Clear Sun ☀️', desc: 'Rise and shine. Launching acoustic workspace vibes for your coffee session.', streak: '12 Day Streak', time: '08:30 AM' },
    Night: { bg: 'from-indigo-950/20 via-[#07090D] to-transparent', weather: 'Overcast 🌙', desc: 'Midnight session detected. Heavy bass chill logs enabled.', streak: '12 Day Streak', time: '23:30 PM' },
    Rain: { bg: 'from-[#00F5FF]/10 via-[#07090D] to-transparent', weather: 'Showers 🌧️', desc: 'Monsoon atmosphere context active. Heavy rains, romantic & sad mix.', streak: '13 Day Streak', time: '16:15 PM' },
    Travel: { bg: 'from-emerald-950/10 via-[#07090D] to-transparent', weather: 'Mild wind 🍃', desc: 'On the move. Offline dynamic caching active.', streak: '12 Day Streak', time: '14:20 PM' },
    Coding: { bg: 'from-[#7B61FF]/10 via-[#07090D] to-transparent', weather: 'Cloudy 💻', desc: 'Workspace India active. High concentration synthwave loop is on.', streak: '12 Day Streak', time: '23:22 PM' },
    Workout: { bg: 'from-rose-950/10 via-[#07090D] to-transparent', weather: 'Warm ⚡', desc: 'Cardio tracking mode. Energetic heavy rock playlist generated.', streak: '12 Day Streak', time: '07:15 AM' },
    Football: { bg: 'from-green-950/10 via-[#07090D] to-transparent', weather: 'Stadium ⚽', desc: 'Hype chants and match tracks loaded for the final event.', streak: '12 Day Streak', time: '21:00 PM' },
    Christmas: { bg: 'from-red-950/15 via-[#07090D] to-transparent', weather: 'Snowy 🎄', desc: 'Season specials. Classic holiday acoustics and low-fi carols.', streak: 'Christmas Mode', time: '25 Dec' },
    'World Cup': { bg: 'from-yellow-950/10 via-[#07090D] to-transparent', weather: 'Sunny 🏆', desc: 'Victory matches and official stadium anthems selected by AI DJ.', streak: 'World Cup Vibe', time: 'Live Stadium' },
  };

  const currentModeInfo = dashboardModes[dashboardMode];

  const getTimeOfDayLabel = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  };

  return (
    <div className="space-y-6 text-white pb-36 font-sans select-none w-full relative text-left">
      
      {/* Background Aurora overlay */}
      <div className="absolute inset-0 aurora-bg -z-10 pointer-events-none opacity-40" />

      {/* Mode Quick Selector Pill bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide snap-x pt-2">
        {Object.keys(dashboardModes).map((m) => {
          const isActive = dashboardMode === m;
          return (
            <button
              key={m}
              onClick={() => {
                setDashboardMode(m as any);
                setMockWeather(dashboardModes[m as AIDashboardMode].weather);
                setMockTime(dashboardModes[m as AIDashboardMode].time);
              }}
              className={`snap-start flex-shrink-0 rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-wider transition-all border ${
                isActive 
                  ? 'bg-white text-black border-white shadow-md' 
                  : 'bg-white/[0.02] border-white/[0.04] text-neutral-450 hover:text-white'
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* 1. HERO BANNER - DYNAMIC AI DASHBOARD */}
      <section className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${currentModeInfo.bg} border border-white/[0.08] p-5 sm:p-7 shadow-2xl nothing-dots`}>
        <div className="absolute top-0 right-0 p-5 hidden sm:block">
          <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest font-black">
            Preset System 5.0
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3.5 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[#00F5FF] bg-[#00F5FF]/10 px-3 py-0.5 rounded-full border border-[#00F5FF]/20">
                {dashboardMode} Mode
              </span>
              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-[#9B5CFF] bg-[#9B5CFF]/10 px-3 py-0.5 rounded-full border border-[#9B5CFF]/20">
                {mockWeather}
              </span>
              <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-0.5 rounded-full border border-amber-500/20">
                <Flame className="h-3 w-3 fill-amber-500" />
                <span>{currentModeInfo.streak}</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Good {getTimeOfDayLabel() === 'Morning' ? 'Morning' : 'Evening'},<br />
              <span className="bg-gradient-to-r from-[#00F5FF] via-[#7B61FF] to-[#FF2D55] bg-clip-text text-transparent animate-shine bg-size-200">
                {displayName}
              </span>
            </h1>

            <p className="text-xs text-neutral-450 font-bold leading-relaxed">
              {currentModeInfo.desc}
            </p>

            <div className="grid grid-cols-3 gap-2.5 max-w-xs pt-1">
              <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl">
                <span className="text-[7px] text-neutral-500 uppercase tracking-widest font-black block">Streams</span>
                <span className="text-xs font-black text-[#00F5FF]">{stats.historyCount}</span>
              </div>
              <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl">
                <span className="text-[7px] text-neutral-500 uppercase tracking-widest font-black block">Locker</span>
                <span className="text-xs font-black text-[#9B5CFF]">{stats.cloudCount} tracks</span>
              </div>
              <div className="bg-white/[0.01] border border-white/[0.04] p-2.5 rounded-xl">
                <span className="text-[7px] text-neutral-500 uppercase tracking-widest font-black block">Time</span>
                <span className="text-xs font-black text-white font-mono">{mockTime}</span>
              </div>
            </div>
          </div>

          {/* Quick Launch Card */}
          <div className="bg-[#07090D]/80 border border-white/[0.06] rounded-2xl p-4 w-full md:w-72 text-left space-y-3.5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#00F5FF]/10 flex items-center justify-center text-[#00F5FF] border border-[#00F5FF]/20">
                <Headphones className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider leading-none">Preset Target</h4>
                <p className="text-[11px] font-black text-white mt-0.5 truncate">Workspace Synthesis</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-neutral-450">
                <span>Concentration Index</span>
                <span className="text-[#00F5FF] font-bold">92%</span>
              </div>
              <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] rounded-full animate-pulse" style={{ width: '92%' }} />
              </div>
            </div>

            <button
              onClick={() => handlePlayTrack(arijitSongs[0], arijitSongs)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] py-2.5 text-xs font-black text-black shadow-md hover:opacity-90 active:scale-95 transition-all duration-200"
            >
              <Play className="h-3.5 w-3.5 fill-black stroke-black translate-x-[0.5px]" />
              <span>Synthesize Mix</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. CONTINUE LISTENING - STACK CARDS */}
      {history.length > 0 && (
        <section className="space-y-3 text-left">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
            <div className="flex items-center gap-2 text-neutral-400">
              <Clock className="h-4 w-4 text-[#00F5FF]" />
              <h3 className="text-xs font-black uppercase tracking-wider">Continue Listening</h3>
            </div>
            <span className="text-[8px] font-mono text-neutral-550">Locker History</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x">
            {history.slice(0, 5).map((track, i) => (
              <div key={`${track.id}-hist`} className="w-28 sm:w-36 flex-shrink-0 snap-start">
                <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, history)} variant="stack" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. AI DAILY BRIEF - FLOATING GLASS BRIEFING */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0E111A]/40 backdrop-blur-xl p-4.5 text-left relative overflow-hidden nothing-dots">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00F5FF] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Workspace AI daily intelligence Brief</span>
            </span>
            <p className="text-xs text-neutral-300 font-semibold leading-relaxed">
              &ldquo;Welcome, Saswata. You completed 5 hours of workspace activity today. Based on the rain and evening conditions, I have custom engineered a low-tempo synthwave and focus lofi session. Probability of engagement matches 98%.&rdquo;
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#00F5FF]/10 to-[#9B5CFF]/10 border border-[#00F5FF]/20 flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-xs font-black text-[#00F5FF]">98%</span>
          </div>
        </div>
      </section>

      {/* 4. MUSIC DNA - CIRCULAR Radar Graph metadata */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.04] bg-[#0E111A]/60 p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Music DNA Vibe</h3>
            <span className="text-[8px] font-mono text-[#00F5FF]">Level 32 OS</span>
          </div>
          
          <div className="flex items-center justify-between gap-6">
            <div className="relative h-20 w-20 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.02)" strokeWidth="4" fill="transparent" />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="url(#dna-grad-home)"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 32}
                  strokeDashoffset={2 * Math.PI * 32 * (1 - 0.78)}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="dna-grad-home" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F5FF" />
                    <stop offset="100%" stopColor="#9B5CFF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center leading-none">
                <span className="text-xs font-black text-white">78%</span>
                <span className="text-[6px] text-neutral-500 uppercase tracking-widest font-black mt-0.5">Focus</span>
              </div>
            </div>
            
            <div className="flex-1 space-y-2 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              <div className="flex justify-between items-center border-b border-white/[0.02] pb-1">
                <span>Lofi & Chill</span>
                <span className="text-[#00F5FF] font-mono">42%</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.02] pb-1">
                <span>Synthwave Synth</span>
                <span className="text-[#9B5CFF] font-mono">36%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Acoustic Ballads</span>
                <span className="text-rose-400 font-mono">22%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. MOOD VIBE STATIONS */}
        <div className="rounded-2xl border border-white/[0.04] bg-[#0E111A]/60 p-4.5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Vibe Station Channels</h3>
            <span className="text-[8px] font-mono text-neutral-550">Interactive</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {['Coding', 'Focus', 'Workout', 'Happy', 'Sleep'].map((mood) => {
              const isActive = selectedMood === mood;
              const emojis: Record<string, string> = {
                Coding: '💻', Focus: '🧠', Workout: '⚡', Happy: '😄', Sleep: '😴'
              };
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`rounded-xl py-3 text-center transition-all border flex flex-col items-center justify-center gap-1 ${
                    isActive 
                      ? 'bg-gradient-to-br from-[#00F5FF] to-[#9B5CFF] border-transparent text-black shadow-md'
                      : 'border-white/[0.04] bg-neutral-900/60 text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="text-base">{emojis[mood] || '🎵'}</span>
                  <span className="text-[8px] font-black uppercase tracking-wider leading-none">{mood}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mood Station Songs - Compact Cards */}
      <section className="space-y-2 text-left">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
          Filtered Channel: {selectedMood} Tracks
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#0A0D14]/30 border border-white/[0.03] p-2.5 rounded-2xl">
          {getActiveMoodTracks().map((track) => (
            <PremiumTrackCard 
              key={track.id} 
              track={track} 
              onClick={() => handlePlayTrack(track, getActiveMoodTracks())} 
              variant="compact" 
            />
          ))}
        </div>
      </section>

      {/* 6. TRENDING ARTISTS - CIRCULAR PROFILE BADGES */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Trending Artists</h3>
          <span className="text-[8px] font-mono text-neutral-500">Popular OS</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { name: 'Arijit Singh', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg' },
            { name: 'Coldplay', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/af/3c/0f/af3c0fe2-1c4f-8499-67a8-14a8e41fdbf8/5021732410535.jpg/600x600bb.jpg' },
            { name: 'Billie Eilish', cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg' },
            { name: 'Daft Punk', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80' }
          ].map((art, idx) => (
            <div key={idx} className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
              <div className="relative h-14 w-14 rounded-full overflow-hidden border border-white/[0.08] group-hover:border-[#00F5FF]/30 transition-all duration-300 p-[1.5px]">
                <img src={art.cover} alt={art.name} className="object-cover h-full w-full rounded-full" />
              </div>
              <span className="text-[9px] font-bold text-neutral-450 mt-1.5 group-hover:text-white truncate max-w-[70px]">{art.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. ALBUMS - STACK CARDS */}
      <section className="space-y-3 text-left">
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Featured Album Stacks</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {recommendations.slice(0, 4).map((track) => (
            <PremiumTrackCard 
              key={track.id} 
              track={track} 
              onClick={() => handlePlayTrack(track, recommendations)} 
              variant="stack" 
            />
          ))}
        </div>
      </section>

      {/* 8. AI RECOMMENDATIONS - EXPLAINABLE MATCH */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">AI Explainable Recommendations</h3>
          <span className="text-[8px] font-mono text-[#00F5FF]">Dynamic Model</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { ...arijitSongs[0], aiScore: 98, aiReason: "Based on Kesariya & rainy mood" },
            { ...globalHits[1], aiScore: 94, aiReason: "Based on Blinding Lights & late hour" }
          ].map((track) => (
            <PremiumTrackCard 
              key={track.id} 
              track={track} 
              onClick={() => handlePlayTrack(track, arijitSongs)} 
              variant="aiMatch" 
            />
          ))}
        </div>
      </section>

      {/* 9. TOP CHARTS - ANIMATED RANKINGS */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">World Hit Chart Anthems</h3>
          <TrendingUp className="h-4 w-4 text-[#00F5FF]" />
        </div>
        <div className="space-y-1">
          {globalHits.map((track, i) => (
            <PremiumTrackCard 
              key={track.id} 
              track={track} 
              onClick={() => handlePlayTrack(track, globalHits)} 
              variant="horizontal" 
              index={i + 1} 
            />
          ))}
        </div>
      </section>

      {/* 10. FRIENDS - CONNECTED AVATARS */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-450">Connected Workspace Friends</h3>
          <Users className="h-4 w-4 text-neutral-500" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0A0D14]/40 border border-white/[0.03] p-3.5 rounded-2xl">
          {[
            { name: "Saswata Dey", status: "Listening to Kesariya", active: true, track: arijitSongs[0] },
            { name: "Arijit Singh", status: "Listening to Tum Hi Ho", active: true, track: arijitSongs[1] },
            { name: "Daft Punk", status: "Offline 2h ago", active: false, track: null }
          ].map((friend, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/[0.03]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-neutral-900 flex-shrink-0">
                  {friend.active && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-black z-10 animate-pulse" />}
                  <span className="text-xs font-black text-white flex h-full w-full items-center justify-center bg-neutral-800">
                    {friend.name.slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0 text-left">
                  <h4 className="text-xs font-black text-white truncate">{friend.name}</h4>
                  <p className="text-[9px] text-neutral-450 truncate font-semibold">{friend.status}</p>
                </div>
              </div>
              {friend.track && (
                <button
                  onClick={() => handlePlayTrack(friend.track!, [friend.track!])}
                  className="p-2 rounded-full bg-[#00F5FF]/10 text-[#00F5FF] border border-[#00F5FF]/20 flex items-center justify-center active:scale-95 transition-all"
                  title="Listen Along"
                >
                  <Play className="h-3 w-3 fill-[#00F5FF]" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 11. AI DJ PANEL */}
      <section className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#0E111A]/85 p-5 text-left shadow-2xl nothing-dots">
        <div className="flex items-center gap-4">
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-tr from-[#00F5FF] to-[#9B5CFF] p-[1.5px] shadow-[0_0_15px_rgba(0,245,255,0.2)] animate-spin [animation-duration:15s] flex-shrink-0">
            <div className="h-full w-full rounded-full bg-[#050505] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#00F5FF]" />
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00F5FF]">Intelligent DJ Voice</span>
            <h4 className="text-sm font-black text-white truncate">NeoTune AI Mind</h4>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] text-xs space-y-2">
          <div className="flex items-center gap-1.5 text-[#00F5FF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F5FF] animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-wider">DJ Speech Feedback</span>
          </div>
          <p className="text-neutral-300 font-semibold leading-relaxed">
            &ldquo;We are in perfect sync tonight. Weather indicators report {mockWeather} in India. I have normalized the bass range for your lofi mixes.&rdquo;
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-3 text-[9px] text-neutral-450 font-black uppercase tracking-widest">
          <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
            <span className="text-[8px] text-neutral-500 block">Energy Score</span>
            <span className="text-[#00F5FF] font-mono text-xs">74 / 100</span>
          </div>
          <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
            <span className="text-[8px] text-neutral-500 block">Spatial Mode</span>
            <span className="text-[#9B5CFF] font-mono text-xs">Active</span>
          </div>
        </div>

        <div className="mt-4">
          <button
            disabled={isGeneratingAi}
            onClick={handleGenerateAiPlaylist}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] py-3 text-xs font-black text-black shadow-lg shadow-[#00F5FF]/10 active:scale-95 transition-all"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                <span>Synthesizing OS Queue...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 fill-black stroke-black" />
                <span>Generate AI Daily Playlist {aiGeneratedCount > 0 && `(${aiGeneratedCount})`}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 12. CONCERTS & LIVE EVENTS */}
      <section className="space-y-3 text-left">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Live Stage & Concerts</h3>
          <Ticket className="h-4 w-4 text-neutral-550" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {[
            { title: "Coldplay: Music of the Spheres", date: "Jan 18, 2026", venue: "Mumbai Arena", price: "$120" },
            { title: "Arijit Singh: Acoustic Space Tour", date: "Feb 10, 2026", venue: "Kolkata Grounds", price: "$75" }
          ].map((evt, idx) => (
            <div key={idx} className="snap-start flex-shrink-0 w-64 bg-[#0E111A]/80 border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between gap-3 text-left">
              <div>
                <span className="text-[8px] font-black text-[#00F5FF] uppercase tracking-wider bg-[#00F5FF]/10 px-2 py-0.5 rounded border border-[#00F5FF]/20">Concert Event</span>
                <h4 className="text-xs font-black text-white mt-1.5 line-clamp-1">{evt.title}</h4>
                <p className="text-[9px] text-neutral-450 mt-0.5 font-bold uppercase tracking-wider">{evt.venue} · {evt.date}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <span className="font-mono text-xs font-black text-[#9B5CFF]">{evt.price}</span>
                <button className="rounded-lg bg-white hover:opacity-90 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-black active:scale-95 transition-all">
                  Buy Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
