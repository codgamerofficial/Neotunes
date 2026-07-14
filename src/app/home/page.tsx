'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { 
  Play, 
  Pause, 
  Sparkles, 
  Clock, 
  Music, 
  Compass, 
  TrendingUp, 
  Radio, 
  ListMusic, 
  Cloud,
  ChevronRight,
  Disc,
  Info,
  Heart,
  Grid,
  Headphones,
  Sliders,
  Calendar,
  Volume2
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
  const [activeCategory, setActiveCategory] = useState<'home' | 'foryou' | 'explore'>('home');

  // Stats for Hero Section
  const [stats, setStats] = useState({ likedCount: 0, cloudCount: 0, historyCount: 0 });

  // Sync user profile name
  useEffect(() => {
    const fetchProfileAndStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch Display Name
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

        // Fetch User Stats
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

  // Official resolved tracks using Deezer/iTunes metadata
  const arijitSongs: Track[] = [
    { id: '6iBjgI6c7Bnt78v38e4a9v', title: 'Kesariya (From "Brahmastra")', artist: { name: 'Pritam, Arijit Singh & Amitabh Bhattacharya', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Kesariya - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/9f/13/ca/9f13ca3b-e533-03e0-f19a-f0aaa774581d/196589311191.jpg/600x600bb.jpg', durationMs: 268165, sourceType: 'youtube' },
    { id: '56MuuL29m1338x6j3n3R0e', title: 'Tum Hi Ho', artist: { name: 'Mithoon & Arijit Singh', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Aashiqui 2 Soundtrack', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/23/ee/bb23eeed-0c35-4f1d-2b11-485622777ae4/8902894353007_cover.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/23/ee/bb23eeed-0c35-4f1d-2b11-485622777ae4/8902894353007_cover.jpg/600x600bb.jpg', durationMs: 261974, sourceType: 'youtube' },
    { id: '3y7tEszcskWw1q7UpxjPZ7', title: 'Chaleya (From "Jawan")', artist: { name: 'Anirudh Ravichander, Arijit Singh & Shilpa Rao', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Chaleya - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/ff/32/1eff3216-190d-6fd9-8f68-acbba846e6ee/8903431956026_cover.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/1e/ff/32/1eff3216-190d-6fd9-8f68-acbba846e6ee/8903431956026_cover.jpg/600x600bb.jpg', durationMs: 200374, sourceType: 'youtube' },
    { id: '3y4oF6ZfP0sX7zE5p8v6nN', title: 'Apna Bana Le (From "Bhediya")', artist: { name: 'Arijit Singh & Sachin-Jigar', id: '4YRx37jL6VOmbfUnxwSy6g' }, album: { name: 'Apna Bana Le - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/2e/0b/c0/2e0bc070-112f-a827-6ad8-6bc64f7caaff/840214460180.png/600x600bb.jpg', durationMs: 261702, sourceType: 'youtube' },
    { id: '5NX1aRjZ0K5Jp7f8p8v6nN', title: 'Heeriye', artist: { name: 'Jasleen Royal & Arijit Singh', id: '3448f76d4' }, album: { name: 'Heeriye - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f0/8c/2a/f08c2aeb-3903-8738-d0a5-8c2e4547eed7/5054197711039.jpg/600x600bb.jpg', durationMs: 194857, sourceType: 'youtube' }
  ];

  const globalHits: Track[] = [
    { id: 'it_1674691586', title: 'Flowers', artist: { name: 'Miley Cyrus' }, album: { name: 'Endless Summer Vacation', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/8c/67/ff/8c67ff91-31c3-3fef-1884-ce3ec89f3af4/196589946874.jpg/600x600bb.jpg', durationMs: 200600, sourceType: 'youtube' },
    { id: '0VjIjW4GlUZAMYd2vXMi3b', title: 'Blinding Lights', artist: { name: 'The Weeknd' }, album: { name: 'Blinding Lights - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a6/6e/bf/a66ebf79-5008-8948-b352-a790fc87446b/19UM1IM04638.rgb.jpg/600x600bb.jpg', durationMs: 201570, sourceType: 'youtube' },
    { id: '4D7tIB1C03sfw5k049URrw', title: 'As It Was', artist: { name: 'Harry Styles' }, album: { name: "Harry's House", coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a9-82abe679b88e/886449990061.jpg/600x600bb.jpg', durationMs: 167303, sourceType: 'youtube' },
    { id: 'it_1746801012', title: 'Espresso', artist: { name: 'Sabrina Carpenter' }, album: { name: 'Espresso - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/57/e8/7b/57e87ba0-5057-9bb9-c247-ce7dbe426e89/24UMGIM55213.rgb.jpg/600x600bb.jpg', durationMs: 175459, sourceType: 'youtube' },
    { id: 'it_1739659140', title: 'LUNCH', artist: { name: 'Billie Eilish' }, album: { name: 'HIT ME HARD AND SOFT', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/92/9f/69/929f69f1-9977-3a44-d674-11f70c852d1b/24UMGIM36186.rgb.jpg/600x600bb.jpg', durationMs: 179587, sourceType: 'youtube' }
  ];

  const trendingYoutube: Track[] = [
    { id: 'it_1765520596', title: 'Big Dawgs', artist: { name: 'Hanumankind & Kalmi' }, album: { name: 'Big Dawgs - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/42/d2/6c/42d26c01-619f-fa0a-2e83-7f4a28b5d3b2/24UMGIM70977.rgb.jpg/600x600bb.jpg', durationMs: 190667, sourceType: 'youtube' },
    { id: 'it_1751728802', title: 'feelslikeimfallinginlove', artist: { name: 'Coldplay' }, album: { name: 'Moon Music', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/af/3c/0f/af3c0fe2-1c4f-8499-67a8-14a8e41fdbf8/5021732410535.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/af/3c/0f/af3c0fe2-1c4f-8499-67a8-14a8e41fdbf8/5021732410535.jpg/600x600bb.jpg', durationMs: 236231, sourceType: 'youtube' },
    { id: 'it_1749608600', title: 'Houdini', artist: { name: 'Eminem' }, album: { name: 'Houdini - Single', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/0f/11/b5/0f11b57e-999e-b93b-41bc-539d71e7e86f/24UMGIM60029.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/0f/11/b5/0f11b57e-999e-b93b-41bc-539d71e7e86f/24UMGIM60029.rgb.jpg/600x600bb.jpg', durationMs: 227239, sourceType: 'youtube' },
    { id: 'it_1744452425', title: 'I Had Some Help (feat. Morgan Wallen)', artist: { name: 'Post Malone' }, album: { name: 'F-1 Trillion', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/84/df/b9/84dfb96b-27c8-4d40-4780-b65ff22790e4/24UMGIM50612.rgb.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/84/df/b9/84dfb96b-27c8-4d40-4780-b65ff22790e4/24UMGIM50612.rgb.jpg/600x600bb.jpg', durationMs: 178206, sourceType: 'youtube' }
  ];

  const livePerformances: Track[] = [
    { id: 'it_1123076826', title: 'Fix You', artist: { name: 'Coldplay' }, album: { name: 'X&Y', coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/82/48/0c8248a8-4a5b-d30d-8056-f32d650d2fc9/190295978068.jpg/600x600bb.jpg' }, coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/82/48/0c8248a8-4a5b-d30d-8056-f32d650d2fc9/190295978068.jpg/600x600bb.jpg', durationMs: 294992, sourceType: 'youtube' },
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
    const isYtOrCustom = track.id.startsWith('yt-') || track.id.startsWith('pod-') || track.id.startsWith('mood-') || track.id.startsWith('live-') || track.id.startsWith('it_') || track.id.startsWith('dz_') || track.id.length < 15;

    const handlePlayBtnClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    };

    const handleCardClick = () => {
      if (isYtOrCustom) {
        onClick();
      } else {
        router.push(`/albums/${track.album?.id || '4aawyABuhtvU4upGL7jSMG'}`);
      }
    };

    return (
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCardClick}
        className="group relative w-full rounded-2xl bg-neutral-900/40 hover:bg-neutral-850/50 border border-white/[0.04] hover:border-cyan-500/30 overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-300 cursor-pointer p-4 flex flex-col h-full text-left"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900 shadow-md">
          <ImageWithFallback
            src={track.coverUrl || '/images/default-cover.png'}
            alt={track.title}
            fill
            sizes="(max-width: 640px) 150px, 220px"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handlePlayBtnClick}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 shadow-xl shadow-cyan-500/30 transform scale-90 group-hover:scale-100 transition-transform active:scale-95 duration-300"
            >
              {isCurrent && isPlaying ? (
                <Pause className="h-5 w-5 fill-black stroke-black" />
              ) : (
                <Play className="h-5 w-5 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 flex-grow flex flex-col justify-between font-sans">
          <div className="space-y-1">
            <h4 className={`text-sm font-bold leading-tight line-clamp-1 ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white'}`}>
              {track.title}
            </h4>
            <p className="text-xs text-neutral-400 line-clamp-1 font-semibold">
              {artistName}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.03] text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
            <span>{track.sourceType}</span>
            <span className="font-mono">{Math.floor(track.durationMs / 60000)}:{(Math.floor((track.durationMs % 60000) / 1000)).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8 text-white pb-12 font-sans select-none w-full">
      
      {/* 1. GREETING HEADER & STUNNING HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/15 via-purple-600/10 to-transparent border border-white/[0.08] px-8 py-10 text-left shadow-2xl">
        {/* Animated Visualizer Background inside Hero */}
        <div className="absolute inset-0 bg-[#000]/10 backdrop-blur-[2px] -z-10" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-48 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/10 px-3.5 py-1.5 rounded-full border border-cyan-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{getTimeOfDayLabel()} · NeoTunes Premium</span>
            </p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white max-w-2xl">
              The Future of Music,<br />Tailored for You
            </h1>
            <p className="max-w-lg text-sm text-neutral-405 font-semibold leading-relaxed">
              Unifying your local storage lockers, the completeness of YouTube, and Spotify Web metadata. Powered by Upstash Redis and Supabase.
            </p>

            {/* Quick Stats Grid */}
            <div className="flex gap-6 text-left pt-2">
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Liked Songs</span>
                <span className="text-lg font-black text-cyan-400">{stats.likedCount}</span>
              </div>
              <div className="w-[1px] bg-white/[0.08]" />
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Cloud Files</span>
                <span className="text-lg font-black text-purple-400">{stats.cloudCount}</span>
              </div>
              <div className="w-[1px] bg-white/[0.08]" />
              <div>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Total Plays</span>
                <span className="text-lg font-black text-white">{stats.historyCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Play Action Card */}
          <div className="bg-neutral-900/60 backdrop-blur-md border border-white/[0.08] rounded-2xl p-5 lg:w-80 text-left space-y-4 flex-shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-400/15 flex items-center justify-center text-cyan-400">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase">Personalized Mix</h4>
                <p className="text-sm font-black text-white">Saswata&apos;s Workspace Vibe</p>
              </div>
            </div>
            <p className="text-[11px] text-neutral-450 font-semibold leading-normal">
              Based on your liked songs and listening history, launch a custom workspace session.
            </p>
            <button
              onClick={() => handlePlayTrack(arijitSongs[0], arijitSongs)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 py-3 text-xs font-black text-black shadow-lg shadow-cyan-500/10 active:scale-95 transition-all duration-200"
            >
              <Play className="h-4 w-4 fill-black stroke-black translate-x-[0.5px]" />
              <span>Listen Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY TAB SELECTOR BAR */}
      <div className="flex items-center space-x-2 border-b border-white/[0.06] pb-1">
        {[
          { id: 'home', label: 'Home Dashboard', icon: Grid },
          { id: 'foryou', label: 'For You & Mixes', icon: Sparkles },
          { id: 'explore', label: 'Explore & Concerts', icon: Compass }
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`relative flex items-center space-x-2 px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-colors ${
                isActive ? 'text-cyan-400' : 'text-neutral-400 hover:text-white'
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
              
              {/* Mood Selection Row */}
              <section className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Match Your Mood</h3>
                  <span className="text-[11px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{selectedMood} Active</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {['Coding', 'Focus', 'Workout', 'Happy', 'Sleep', 'Driving', 'Study', 'Rain', 'Party'].map((mood) => {
                    const isActive = selectedMood === mood;
                    const emojis: Record<string, string> = {
                      Coding: '💻', Focus: '🧠', Workout: '⚡', Happy: '😄', Sleep: '😴', Driving: '🚗', Study: '📖', Rain: '🌧️', Party: '🥳'
                    };
                    return (
                      <button
                        key={mood}
                        onClick={() => setSelectedMood(mood)}
                        className={`snap-start flex-shrink-0 flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all border ${
                          isActive 
                            ? 'bg-gradient-to-r from-cyan-400 to-purple-500 border-cyan-400 text-black shadow-lg shadow-cyan-500/10'
                            : 'border-white/[0.06] bg-neutral-900/40 text-neutral-400 hover:text-white hover:border-neutral-700'
                        }`}
                      >
                        <span>{emojis[mood] || '🎵'}</span>
                        <span>{mood}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Mood Songs */}
              <section className="space-y-4 text-left">
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">Active Mood Station</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-5">
                  {getActiveMoodTracks().map((track) => (
                    <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, getActiveMoodTracks())} />
                  ))}
                </div>
              </section>

              {/* Continue Listening */}
              {history.length > 0 && (
                <section className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Clock className="h-4.5 w-4.5" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Recently Played</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {history.slice(0, 4).map((track, i) => (
                      <TrackCard key={`${track.id}-continue-${i}`} track={track} onClick={() => handlePlayTrack(track, history)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Cloud Music uploads */}
              {cloudMusic.length > 0 && (
                <section className="space-y-4 text-left">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Cloud className="h-4.5 w-4.5" />
                    <h3 className="text-sm font-black uppercase tracking-wider">Your Cloud Locker</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {cloudMusic.slice(0, 4).map((track) => (
                      <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, cloudMusic)} />
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* RIGHT COLUMN: CHARTS / TOP HITS & AI DJ DETAILS (4 Columns) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Dynamic AI DJ Panel */}
              <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]/70 p-5 text-left shadow-lg">
                <div className="absolute top-0 right-0 p-3">
                  <button 
                    onClick={() => setShowAiDJDetail(!showAiDJDetail)}
                    className="text-neutral-500 hover:text-white p-1 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Glowing DJ disc */}
                  <div className="relative h-12 w-12 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 p-[1.5px] shadow-[0_0_15px_rgba(0,245,255,0.15)] animate-spin [animation-duration:10s] flex-shrink-0">
                    <div className="h-full w-full rounded-full bg-[#111] flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Personal DJ Session</span>
                    <h4 className="text-sm font-black text-white truncate">AI DJ Saswata</h4>
                  </div>
                </div>

                {/* AI DJ Logic Details */}
                <AnimatePresence>
                  {(showAiDJDetail || true) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-white/[0.05] space-y-2.5 text-xs text-neutral-400 font-semibold"
                    >
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Workspace Vibe</span>
                        <span className="text-white">Coding React Apps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Seed Bias</span>
                        <span className="text-white">Arijit Singh, Weeknd</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Weather Context</span>
                        <span className="text-white">Monsoon Showers 🌧️</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Time Vibe</span>
                        <span className="text-white">Late Night Focus</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* NeoTunes Charts */}
              <section className="space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">Charts (Top Hits)</h3>
                  <TrendingUp className="h-4.5 w-4.5 text-cyan-400" />
                </div>
                <div className="space-y-2.5">
                  {globalHits.map((track, i) => (
                    <div
                      key={`${track.id}-chart`}
                      onClick={() => handlePlayTrack(track, globalHits)}
                      className="flex items-center gap-3.5 rounded-2xl bg-neutral-900/40 border border-white/[0.04] p-3 hover:bg-neutral-850/50 cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-black text-neutral-600 w-5 text-center">#{i + 1}</span>
                      <div className="relative h-10 w-10 rounded-lg flex-shrink-0 overflow-hidden bg-neutral-900">
                        <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="40px" className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-white truncate">{track.title}</p>
                        <p className="text-[10px] text-neutral-400 truncate mt-0.5">{track.artist.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-600" />
                    </div>
                  ))}
                </div>
              </section>

            </div>

          </div>
        )}

        {/* ==================== FOR YOU TAB ==================== */}
        {activeCategory === 'foryou' && (
          <div className="space-y-8">
            
            {/* For You Recommendations */}
            <section className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">Personalized for You</h3>
                <span className="text-xs font-bold text-cyan-400">Weekly Seed</span>
              </div>
              {recsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse aspect-square rounded-2xl bg-neutral-900/40 border border-white/[0.04] p-4 flex flex-col h-56" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {recommendations.slice(0, 12).map((track) => (
                    <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, recommendations)} />
                  ))}
                </div>
              )}
            </section>

            {/* Arijit Singh Corner */}
            <section className="space-y-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">🎤 Artist Spotlight: Arijit Singh</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {arijitSongs.map((track) => (
                  <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, arijitSongs)} />
                ))}
              </div>
            </section>

            {/* AI Mixes Cards */}
            <section className="space-y-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">AI Daily Mixes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
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
                    className="flex flex-col justify-between aspect-square rounded-2xl bg-neutral-900/40 border border-white/[0.04] p-5 cursor-pointer relative overflow-hidden group hover:border-cyan-500/40 hover:-translate-y-1.5 transition-all duration-300"
                  >
                    <div className={`absolute -inset-px -z-10 bg-gradient-to-tr ${mix.gradient} opacity-0 group-hover:opacity-10 rounded-2xl blur-md transition-opacity duration-300`} />
                    <div className={`h-2 w-10 rounded-full bg-gradient-to-r ${mix.gradient} mb-4`} />
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-white">{mix.title}</h4>
                      <p className="text-xs text-neutral-405 font-medium leading-tight">{mix.desc}</p>
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
            
            {/* Trending on YouTube */}
            <section className="space-y-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">🔥 Trending Music</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {trendingYoutube.map((track) => (
                  <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, trendingYoutube)} />
                ))}
              </div>
            </section>

            {/* Live Performances */}
            <section className="space-y-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">⚡ Live Concerts & Session Recordings</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {livePerformances.map((track) => (
                  <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, livePerformances)} />
                ))}
              </div>
            </section>

            {/* Podcasts */}
            <section className="space-y-4 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-neutral-400">🎙️ Trending Podcasts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {podcasts.map((track) => (
                  <TrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, podcasts)} />
                ))}
              </div>
            </section>

          </div>
        )}

      </div>

    </div>
  );
}
