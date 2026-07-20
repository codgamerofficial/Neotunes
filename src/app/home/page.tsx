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
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignHeroBanner } from '@/components/campaign/CampaignComponents';
import { getCampaignState } from '@/lib/campaignManager';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

export default function HomePage() {
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const router = useRouter();
  const supabase = createClientBrowser();
  
  const [userProfile, setUserProfile] = useState<{ displayName: string } | null>(null);
  const [selectedMood, setSelectedMood] = useState('Coding');
  const [showAiDJDetail, setShowAiDJDetail] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'home' | 'foryou' | 'explore'>('home');
  const [campaignActive, setCampaignActive] = useState(false);
  
  // AI DJ generation states
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedCount, setAiGeneratedCount] = useState(0);

  // Stats for Hero Section
  const [stats, setStats] = useState({ likedCount: 0, cloudCount: 0, historyCount: 0 });

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
            likedCount: likedRes.count || 0,
            cloudCount: cloudRes.count || 0,
            historyCount: historyRes.count || 0
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

  const getTimeOfDayLabel = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  };

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
    { id: 'it_1746801012', title: 'Espresso', artist: { name: 'Sabrina Carpenter' }, album: { name: 'Espresso - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg', durationMs: 175459, sourceType: 'youtube', streamCount: '3.5M streams', trend: 'new', isHQ: true },
    { id: 'it_1739659140', title: 'LUNCH', artist: { name: 'Billie Eilish' }, album: { name: 'HIT ME HARD AND SOFT', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg', durationMs: 179587, sourceType: 'youtube', streamCount: '3.1M streams', trend: 'up' }
  ];

  const trendingYoutube: Track[] = [
    { id: 'it_1765520596', title: 'Big Dawgs', artist: { name: 'Hanumankind & Kalmi' }, album: { name: 'Big Dawgs - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/600x600bb.jpg', durationMs: 190667, sourceType: 'youtube', isHQ: true },
    { id: 'it_1751728802', title: 'feelslikeimfallinginlove', artist: { name: 'Coldplay' }, album: { name: 'Moon Music', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/af/3c/0f/af3c0fe2-1c4f-8499-67a8-14a8e41fdbf8/5021732410535.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/af/3c/0f/af3c0fe2-1c4f-8499-67a8-14a8e41fdbf8/5021732410535.jpg/600x600bb.jpg', durationMs: 236231, sourceType: 'youtube' },
    { id: 'it_1749608600', title: 'Houdini', artist: { name: 'Eminem' }, album: { name: 'Houdini - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/0f/11/b5/0f11b57e-999e-b93b-41bc-539d71e7e86f/24UMGIM60029.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/0f/11/b5/0f11b57e-999e-b93b-41bc-539d71e7e86f/24UMGIM60029.rgb.jpg/600x600bb.jpg', durationMs: 227239, sourceType: 'youtube', explicit: true },
    { id: 'it_1744452425', title: 'I Had Some Help (feat. Morgan Wallen)', artist: { name: 'Post Malone' }, album: { name: 'F-1 Trillion', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/84/df/b9/84dfb96b-27c8-4d40-4780-b65ff22790e4/24UMGIM50612.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/84/df/b9/84dfb96b-27c8-4d40-4780-b65ff22790e4/24UMGIM50612.rgb.jpg/600x600bb.jpg', durationMs: 178206, sourceType: 'youtube', isHQ: true }
  ];

  const livePerformances: Track[] = [
    { id: 'it_1123076826', title: 'Fix You (Live in Buenos Aires)', artist: { name: 'Coldplay' }, album: { name: 'Live in Argentina', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/82/48/0c8248a8-4a5b-d30d-8056-f32d650d2fc9/190295978068.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/82/48/0c8248a8-4a5b-d30d-8056-f32d650d2fc9/190295978068.jpg/600x600bb.jpg', durationMs: 294992, sourceType: 'youtube', isHQ: true },
    { id: 'live-2', title: 'Alive 2007 Medley (Live)', artist: { name: 'Daft Punk' }, album: { name: 'Alive 2007' }, coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80', durationMs: 350000, sourceType: 'youtube' },
    { id: 'live-3', title: 'Cruel Summer (The Eras Tour Live)', artist: { name: 'Taylor Swift' }, album: { name: 'Lover (Live)' }, coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80', durationMs: 215000, sourceType: 'youtube', isHQ: true }
  ];

  const podcasts: Track[] = [
    { id: 'pod-1', title: 'Episode 2150 - Terrifying AI Future', artist: { name: 'The Joe Rogan Experience' }, album: { name: 'Podcast' }, coverUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=80', durationMs: 7200000, sourceType: 'youtube' },
    { id: 'pod-2', title: 'Decoding the Universe with Kip Thorne', artist: { name: 'Lex Fridman Podcast' }, album: { name: 'Podcast' }, coverUrl: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=500&auto=format&fit=crop&q=80', durationMs: 6500000, sourceType: 'youtube', isHQ: true },
    { id: 'pod-3', title: 'Deep Space Colonization & Mars Vibe', artist: { name: 'The Ranveer Show' }, album: { name: 'Podcast' }, coverUrl: 'https://images.unsplash.com/photo-1610116306796-6fea9f4fae38?w=500&auto=format&fit=crop&q=80', durationMs: 4500000, sourceType: 'youtube' }
  ];

  const moodTracks: Record<string, Track[]> = {
    Coding: [
      { id: 'mood-c1', title: 'Resonance', artist: { name: 'HOME' }, album: { name: 'Odyssey' }, coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube', isHQ: true },
      { id: 'mood-c2', title: 'Starboy (Synthwave Remix)', artist: { name: 'The Weeknd' }, album: { name: 'Cyberpunk Vibe' }, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', durationMs: 220000, sourceType: 'youtube' },
      { id: 'mood-c3', title: 'Daylight', artist: { name: 'David Kushner' }, album: { name: 'Focus Mix' }, coverUrl: 'https://images.unsplash.com/photo-1482440308425-276ad0f28b19?w=500&auto=format&fit=crop&q=80', durationMs: 200000, sourceType: 'youtube', isHQ: true },
    ],
    Workout: [
      { id: 'mood-w1', title: 'Industry Baby', artist: { name: 'Lil Nas X & Jack Harlow' }, album: { name: 'High Hype' }, coverUrl: 'https://images.unsplash.com/photo-1571330735066-03add575248c?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube', explicit: true },
      { id: 'mood-w2', title: 'Till I Collapse', artist: { name: 'Eminem' }, album: { name: 'The Eminem Show' }, coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80', durationMs: 297000, sourceType: 'youtube', explicit: true, isHQ: true },
    ],
    Happy: [
      { id: 'mood-h1', title: 'Happy', artist: { name: 'Pharrell Williams' }, album: { name: 'G I R L' }, coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80', durationMs: 233000, sourceType: 'youtube' },
      { id: 'mood-h2', title: 'Can\'t Stop the Feeling!', artist: { name: 'Justin Timberlake' }, album: { name: 'Trolls' }, coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80', durationMs: 236000, sourceType: 'youtube', isHQ: true },
    ],
    Focus: [
      { id: 'mood-f1', title: 'Gymnopédie No.1', artist: { name: 'Erik Satie' }, album: { name: 'Ambient Classics' }, coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80', durationMs: 180000, sourceType: 'youtube' },
      { id: 'mood-f2', title: 'Lo-Fi Study Beats', artist: { name: 'Chillhop' }, album: { name: 'Coding Session' }, coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80', durationMs: 210000, sourceType: 'youtube', isHQ: true },
    ],
    Sleep: [
      { id: 'mood-s1', title: 'Weightless', artist: { name: 'Marconi Union' }, album: { name: 'Ambient Sleep' }, coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80', durationMs: 480000, sourceType: 'youtube', isHQ: true },
    ]
  };

  const getActiveMoodTracks = () => moodTracks[selectedMood] || moodTracks['Coding'];

  return (
    <div className="space-y-8 text-white pb-36 sm:pb-12 font-sans select-none w-full relative">
      
      {/* Dynamic ambient soft blur behind */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px] -z-10" />
      <div className="pointer-events-none absolute right-10 top-40 h-80 w-80 rounded-full bg-purple-500/10 blur-[120px] -z-10" />

      {/* 1. GREETING HEADER & STUNNING HERO BANNER */}
      {campaignActive ? (
        <CampaignHeroBanner />
      ) : (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-cyan-500/10 via-[#0A0D14]/90 to-transparent border border-white/[0.06] p-6 sm:p-8 text-left shadow-2xl nothing-dots">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-4 w-full lg:max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  <span>{getTimeOfDayLabel()} · NeoTunes Premium</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  <Flame className="h-3 w-3 text-rose-450 fill-rose-450 animate-bounce" />
                  <span>5 Day Streak</span>
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white">
                Good {getTimeOfDayLabel()},<br />
                <span className="bg-gradient-to-r from-[#00F5FF] via-[#7B61FF] to-[#FF2D55] bg-clip-text text-transparent animate-shine bg-size-200">{displayName} 👋</span>
              </h1>
              
              <p className="max-w-lg text-xs sm:text-sm text-neutral-400 font-semibold leading-relaxed">
                Your AI-Powered Music Operating System is ready. Stream from the cloud, YouTube, or your locker.
              </p>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-3 pt-2 max-w-sm">
                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                  <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block">Favorites</span>
                  <span className="text-sm font-black text-cyan-400">{stats.likedCount}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                  <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block">Locker Size</span>
                  <span className="text-sm font-black text-purple-400">{(stats.cloudCount * 4.2).toFixed(1)}M</span>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl">
                  <span className="text-[8px] font-black text-neutral-500 uppercase tracking-wider block">Total Loops</span>
                  <span className="text-sm font-black text-white">{stats.historyCount}</span>
                </div>
              </div>
            </div>

            {/* Quick Play Action Card */}
            <div className="bg-[#0A0C14]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 w-full lg:w-80 text-left space-y-4 flex-shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-400/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                  <Headphones className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Today&apos;s Focus Goal</h4>
                  <p className="text-xs font-black text-white">Coding Soundtrack V5</p>
                </div>
              </div>
              
              {/* Target / Goal representation */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                  <span>Daily Listening target</span>
                  <span className="text-cyan-400 font-bold">87% Done</span>
                </div>
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" style={{ width: '87%' }} />
                </div>
              </div>

              <button
                onClick={() => handlePlayTrack(arijitSongs[0], arijitSongs)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 py-3 text-xs font-black text-black shadow-lg shadow-cyan-500/10 active:scale-95 transition-all duration-200"
              >
                <Play className="h-4 w-4 fill-black stroke-black translate-x-[0.5px]" />
                <span>Launch Space Mix</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CATEGORY TAB SELECTOR BAR */}
      <div className="flex items-center space-x-2 border-b border-white/[0.06] pb-1 overflow-x-auto scrollbar-hide">
        {[
          { id: 'home', label: 'Space Feed', icon: Grid },
          { id: 'foryou', label: 'AI DJ & Mixes', icon: Sparkles },
          { id: 'explore', label: 'Explore & Live', icon: Compass }
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`relative flex items-center space-x-2 px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-colors flex-shrink-0 ${
                isActive ? 'text-cyan-400' : 'text-neutral-450 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="home-category-active" 
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.6)]" 
                />
              )}
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TABBED VIEWPORT */}
      <div className="mt-4">
        
        {/* ==================== HOME TAB ==================== */}
        {activeCategory === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: HERO MIXES, CONTINUE LISTENING, MOOD SELECTION (8 Columns) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Continue Listening / Recently Played Carousel */}
              {history.length > 0 && (
                <section className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Clock className="h-4.5 w-4.5 text-cyan-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Continue Listening</h3>
                  </div>
                  <div className="relative group">
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                      {history.map((track, i) => (
                        <div key={`${track.id}-history-${i}`} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                          <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, history)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Mood Selection Row */}
              <section className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Vibe Stations</h3>
                  <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase tracking-widest">{selectedMood}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {['Coding', 'Focus', 'Workout', 'Happy', 'Sleep'].map((mood) => {
                    const isActive = selectedMood === mood;
                    const emojis: Record<string, string> = {
                      Coding: '💻', Focus: '🧠', Workout: '⚡', Happy: '😄', Sleep: '😴'
                    };
                    return (
                      <button
                        key={mood}
                        onClick={() => setSelectedMood(mood)}
                        className={`snap-start flex-shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                          isActive 
                            ? 'bg-gradient-to-r from-cyan-400 to-purple-500 border-transparent text-black shadow-lg shadow-cyan-500/15 scale-[1.02]'
                            : 'border-white/[0.04] bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <span>{emojis[mood] || '🎵'}</span>
                        <span className="uppercase text-[9px] tracking-wider font-bold">{mood} Station</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Active Mood Station Carousel */}
              <section className="space-y-4 text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Active Station Playlist</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                  {getActiveMoodTracks().map((track) => (
                    <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                      <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, getActiveMoodTracks())} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Cloud Music uploads (Horizontal Carousel) */}
              {cloudMusic.length > 0 && (
                <section className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Cloud className="h-4.5 w-4.5" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Cloud Locker Uploads</h3>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                    {cloudMusic.map((track) => (
                      <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                        <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, cloudMusic)} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* RIGHT COLUMN: CHARTS & AI DJ ASSISTANT PANEL (4 Columns) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Dynamic AI DJ Panel */}
              <section className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0E111A]/85 p-6 text-left shadow-2xl relative group nothing-dots">
                <div className="absolute top-0 right-0 p-4">
                  <button 
                    onClick={() => setShowAiDJDetail(!showAiDJDetail)}
                    className="text-neutral-500 hover:text-white p-1 transition-colors"
                  >
                    <Info className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {/* Glowing DJ disc */}
                  <div className="relative h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 p-[1.5px] shadow-[0_0_15px_rgba(0,245,255,0.2)] animate-spin [animation-duration:15s] flex-shrink-0">
                    <div className="h-full w-full rounded-full bg-[#050505] flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00F5FF]">Intelligent DJ Voice</span>
                    <h4 className="text-sm font-black text-white truncate">NeoTune AI Mind</h4>
                  </div>
                </div>

                {/* AI DJ conversational preview */}
                <div className="mt-4 p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[9px] font-black uppercase tracking-wider">AI Recommendation context</span>
                  </div>
                  <p className="text-neutral-300 font-semibold leading-relaxed">
                    &ldquo;Hey Saswata, since you are coding tonight, I&apos;ve customized a deep instrumental and focus lofi session. Heavy base bias added to help you concentrate.&rdquo;
                  </p>
                </div>

                {/* AI DJ Details */}
                <div className="mt-4 pt-3 border-t border-white/[0.05] space-y-2.5 text-[10px] text-neutral-405 font-bold uppercase tracking-wider">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Seed Artists</span>
                    <span className="text-white">Arijit Singh, Daft Punk</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Local Weather</span>
                    <span className="text-white">Showers 🌧️</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Synthesizer Mode</span>
                    <span className="text-white">Spatial DSP active</span>
                  </div>
                </div>

                {/* Action button: AI Playlist generator */}
                <div className="mt-5">
                  <button
                    disabled={isGeneratingAi}
                    onClick={handleGenerateAiPlaylist}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 py-3 text-xs font-black text-black shadow-lg shadow-cyan-500/10 active:scale-95 transition-all"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                        <span>Synthesizing Queue...</span>
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

              {/* NeoTunes Charts */}
              <section className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">Top World Charts</h3>
                  <TrendingUp className="h-4 w-4 text-cyan-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  {globalHits.map((track, i) => (
                    <PremiumTrackCard 
                      key={`${track.id}-chart`} 
                      track={track} 
                      onClick={() => handlePlayTrack(track, globalHits)} 
                      variant="horizontal" 
                      index={i + 1}
                    />
                  ))}
                </div>
              </section>

            </div>

          </div>
        )}

        {/* ==================== FOR YOU TAB ==================== */}
        {activeCategory === 'foryou' && (
          <div className="space-y-8">
            
            {/* Made for You Recommendations */}
            <section className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Made For You</h3>
                <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded uppercase tracking-wider">Daily Picks</span>
              </div>
              {recsLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x w-full">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse w-44 aspect-square rounded-2xl bg-neutral-900/40 border border-white/[0.04] p-4 flex-shrink-0" />
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                  {recommendations.map((track) => (
                    <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                      <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, recommendations)} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Arijit Singh Spotlight Corner */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Artist Spotlight: Arijit Singh</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                {arijitSongs.map((track) => (
                  <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                    <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, arijitSongs)} />
                  </div>
                ))}
              </div>
            </section>

            {/* AI Mixes Cards */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">AI Daily Mixes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[
                  { title: 'Coding Mix', desc: 'Focus instrumentals and synthwaves', gradient: 'from-[#7B61FF] to-[#00F5FF]' },
                  { title: 'Morning Mix', desc: 'Light acoustic and wake-up songs', gradient: 'from-amber-500 to-cyan-400' },
                  { title: 'Evening Mix', desc: 'Chill beats and lo-fi melodies', gradient: 'from-purple-600 to-rose-400' },
                  { title: 'Rain Mix', desc: 'Cozy atmospheric acoustics', gradient: 'from-blue-600 to-indigo-500' },
                  { title: 'Late Night Mix', desc: 'Deep atmospheric ambient', gradient: 'from-neutral-900 to-purple-950' },
                  { title: 'Travel Mix', desc: 'Upbeat tracks for the open road', gradient: 'from-emerald-500 to-teal-400' }
                ].map((mix) => (
                  <div
                    key={mix.title}
                    onClick={() => handlePlayTrack(getActiveMoodTracks()[0], getActiveMoodTracks())}
                    className="flex flex-col justify-between aspect-square rounded-2xl bg-[#0E111A]/85 border border-white/[0.04] p-5 cursor-pointer relative overflow-hidden group hover:border-cyan-500/40 hover:-translate-y-1.5 transition-all duration-300"
                  >
                    <div className={`absolute -inset-px -z-10 bg-gradient-to-tr ${mix.gradient} opacity-0 group-hover:opacity-10 rounded-2xl blur-md transition-opacity duration-300`} />
                    <div className={`h-1.5 w-8 rounded-full bg-gradient-to-r ${mix.gradient} mb-4`} />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">{mix.title}</h4>
                      <p className="text-[10px] text-neutral-400 font-bold leading-normal">{mix.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

        {/* ==================== EXPLORE TAB ==================== */}
        {activeCategory === 'explore' && (
          <div className="space-y-8">
            
            {/* Trending Worldwide */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Trending Worldwide</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                {trendingYoutube.map((track) => (
                  <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                    <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, trendingYoutube)} />
                  </div>
                ))}
              </div>
            </section>

            {/* Popular Artists (Circle Variant) */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Popular Artists</h3>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x w-full">
                {arijitSongs.map((track) => (
                  <div key={track.id} className="w-28 md:w-36 flex-shrink-0 snap-start">
                    <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, arijitSongs)} variant="circle" />
                  </div>
                ))}
              </div>
            </section>

            {/* Music Videos (16:9 Aspect Video Variant) */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Trending Music Videos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {trendingYoutube.map((track) => (
                  <PremiumTrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, trendingYoutube)} variant="video" />
                ))}
              </div>
            </section>

            {/* Live Performances */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Live Concerts & Sessions</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                {livePerformances.map((track) => (
                  <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                    <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, livePerformances)} />
                  </div>
                ))}
              </div>
            </section>

            {/* Podcasts */}
            <section className="space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Top Podcasts</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide snap-x w-full">
                {podcasts.map((track) => (
                  <div key={track.id} className="w-36 sm:w-44 md:w-48 flex-shrink-0 snap-start">
                    <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, podcasts)} />
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

      </div>
      
    </div>
  );
}
