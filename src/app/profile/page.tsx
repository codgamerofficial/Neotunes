'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClientBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  BarChart3, 
  Compass, 
  Sparkles, 
  Disc, 
  Radio, 
  Music, 
  Edit, 
  Award, 
  Calendar, 
  Users, 
  Play, 
  Flame, 
  MapPin, 
  UserCheck,
  TrendingUp,
  Activity,
  Layers,
  Volume2,
  Loader2
} from 'lucide-react';
import { usePlaybackStore } from '@/store/playback-store';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import { CampaignProfileBadge } from '@/components/campaign/CampaignComponents';
import { getCampaignState } from '@/lib/campaignManager';
import PremiumTrackCard, { Track } from '@/components/ui/PremiumTrackCard';

interface ProfileStats {
  totalLikes: number;
  totalPlays: number;
  topTracks: {
    id: string;
    title: string;
    artist: { name: string };
    durationMs: number;
    coverUrl?: string;
    playCount: number;
  }[];
  favoriteGenre: string;
}

export default function ProfilePage() {
  const supabase = createClientBrowser();
  const { playTrack } = usePlaybackStore();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [joinedAt, setJoinedAt] = useState('');
  const [campaignActive, setCampaignActive] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    setCampaignActive(getCampaignState().isActive);
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setJoinedAt(new Date(user.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' }));
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          setDisplayName(profile.display_name || user.email?.split('@')[0] || 'Saswata Dey');
          setAvatarUrl(profile.avatar_url || '');
        }
      }
    };
    fetchUser();
  }, []);

  // Fetch statistics via React Query
  const { data: stats, isLoading } = useQuery<ProfileStats>({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user/stats');
      if (!res.ok) throw new Error('Failed to load profile statistics');
      return res.json();
    },
  });

  // Mock listening heatmap data (7 rows for days, 22 columns for weeks)
  const heatmapDays = Array.from({ length: 7 });
  const heatmapWeeks = Array.from({ length: 22 });
  const getHeatmapColor = (row: number, col: number) => {
    const intensity = (row * col + col * 3 + 2) % 5;
    if (intensity === 0) return 'bg-neutral-900';
    if (intensity === 1) return 'bg-[#2DD4FF]/10 border-[#2DD4FF]/5';
    if (intensity === 2) return 'bg-[#2DD4FF]/25 border-[#2DD4FF]/10';
    if (intensity === 3) return 'bg-[#9B5CFF]/30 border-[#9B5CFF]/15';
    return 'bg-gradient-to-tr from-[#2DD4FF] to-[#9B5CFF]';
  };

  const handlePlayTrack = (track: any, list: any[]) => {
    const trackObj: Track = {
      id: track.id,
      title: track.title,
      artist: track.artist || { name: 'Unknown' },
      durationMs: track.durationMs || 180000,
      coverUrl: track.coverUrl,
      sourceType: 'youtube'
    };
    const listObj = list.map(t => ({
      id: t.id,
      title: t.title,
      artist: t.artist || { name: 'Unknown' },
      durationMs: t.durationMs || 180000,
      coverUrl: t.coverUrl,
      sourceType: 'youtube' as const
    }));
    playTrack(trackObj, listObj);
  };

  return (
    <div className="space-y-10 text-white pb-20 text-left select-none font-sans w-full relative">
      
      {/* Immersive background glow */}
      <div className="absolute top-0 right-1/4 h-[350px] w-[350px] rounded-full bg-[#9B5CFF]/5 blur-[120px] pointer-events-none -z-10" />

      {/* A. DNA MUSIC PROFILE BANNER */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#0E0E11]/85 p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 shadow-2xl">
        <div className="absolute inset-0 bg-[#000]/10 backdrop-blur-[2px] -z-10" />
        
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Avatar with Custom Animated Glow Ring */}
          <div className="relative h-32 w-32 rounded-full overflow-hidden p-[3.5px] bg-gradient-to-tr from-[#2DD4FF] via-[#9B5CFF] to-[#34D399] flex-shrink-0 shadow-lg">
            <div className="h-full w-full rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="object-cover w-full h-full rounded-full" />
              ) : (
                <span className="text-4xl font-black bg-gradient-to-br from-[#2DD4FF] to-[#9B5CFF] bg-clip-text text-transparent uppercase tracking-wide">
                  {displayName ? displayName.slice(0, 2) : 'SD'}
                </span>
              )}
            </div>
            
            {/* Level Badge Overlay */}
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] px-3.5 py-0.5 text-[9px] font-black text-black uppercase tracking-widest shadow-md">
              LVL 32
            </span>
          </div>

          <div className="space-y-3.5 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2DD4FF]/10 border border-[#2DD4FF]/20 px-3.5 py-1 text-[9px] font-black text-[#2DD4FF] uppercase tracking-wider">
                <Sparkles className="h-3 w-3 text-[#2DD4FF]" />
                <span>Lossless Purist</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#9B5CFF]/10 border border-[#9B5CFF]/20 px-3.5 py-1 text-[9px] font-black text-[#9B5CFF] uppercase tracking-wider">
                <Flame className="h-3 w-3 text-[#9B5CFF]" />
                <span>12 Day Streak</span>
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{displayName || 'Saswata Dey'}</h1>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 text-xs text-neutral-400 font-bold">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> 182 Followers</span>
              <span>•</span>
              <span className="flex items-center gap-1"><UserCheck className="h-4 w-4" /> 94 Following</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Workspace India</span>
            </div>

            <p className="text-xs text-neutral-400 max-w-md leading-relaxed font-semibold">
              Full-Stack Architect & AI Music Curator. Building desktop audio spaces while listening to low-tempo lofi and high-BPM synthwave.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/settings')}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all flex items-center space-x-2"
        >
          <Edit className="h-4 w-4" />
          <span>Preference Center</span>
        </button>
      </div>

      {campaignActive && <CampaignProfileBadge />}

      {/* B. WORKSPACE STATISTICS */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Locker Statistics</h3>
        
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#2DD4FF]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: 'Total Plays Logged', value: stats?.totalPlays || 0, icon: BarChart3, desc: 'Listening records' },
              { label: 'Locker Favorites', value: stats?.totalLikes || 0, icon: Heart, desc: 'Liked tracks' },
              { label: 'Session Hours', value: '54.6 hrs', icon: Flame, desc: 'High fidelity listening' },
              { label: 'Discovered Seeds', value: '45 Artists', icon: Compass, desc: 'Interactive search results' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.04] bg-[#0E0E11]/80 p-5 flex items-center justify-between shadow-lg"
                >
                  <div className="text-left space-y-1.5">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                    <p className="text-[10px] text-neutral-400 font-semibold">{stat.desc}</p>
                  </div>
                  <Icon className="h-8 w-8 text-neutral-600 opacity-40 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* C. HEATMAP & GENRE RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Heatmap Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Listening Heatmap</h3>
          <div className="rounded-[22px] border border-white/[0.04] bg-[#0E0E11]/80 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between text-xs text-neutral-405">
              <span className="font-bold">Registered 324 plays across the last 154 workspace days</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#2DD4FF] font-black">Interactive Calendar</span>
            </div>
            
            {/* Heatmap Grid */}
            <div className="flex gap-[4px] overflow-x-auto pb-2 scrollbar-thin">
              {heatmapWeeks.map((_, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-[4px] flex-shrink-0">
                  {heatmapDays.map((_, rowIdx) => (
                    <div
                      key={rowIdx}
                      className={`h-[12px] w-[12px] rounded-[3px] border border-transparent transition-colors ${getHeatmapColor(rowIdx, colIdx)}`}
                      title={`Activity index: ${rowIdx * colIdx}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] text-neutral-500 font-black uppercase tracking-wider pt-2 border-t border-white/[0.03]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="h-2.5 w-2.5 rounded bg-neutral-900" />
                <div className="h-2.5 w-2.5 rounded bg-[#2DD4FF]/10" />
                <div className="h-2.5 w-2.5 rounded bg-[#2DD4FF]/25" />
                <div className="h-2.5 w-2.5 rounded bg-[#9B5CFF]/30" />
                <div className="h-2.5 w-2.5 rounded bg-[#2DD4FF]" />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Genre Composition Chart */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Genre Radar</h3>
          <div className="rounded-[22px] border border-white/[0.04] bg-[#0E0E11]/80 p-5 flex flex-col items-center justify-center space-y-4 shadow-lg">
            
            {/* Conic donut composition */}
            <div 
              className="h-28 w-28 rounded-full border border-white/[0.08] relative shadow-lg flex-shrink-0"
              style={{
                background: 'conic-gradient(#2DD4FF 0% 35%, #9B5CFF 35% 55%, #FF2D55 55% 70%, #34D399 70% 85%, #F59E0B 85% 100%)'
              }}
            >
              <div className="absolute inset-4 rounded-full bg-[#0E0E11] flex flex-col items-center justify-center">
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest leading-none">Favorite</span>
                <span className="text-xs font-black text-[#2DD4FF] uppercase tracking-wider mt-1">Lofi Chill</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 w-full text-left pt-2">
              {[
                { name: 'Lofi & Chill', pct: '35%', color: 'bg-[#2DD4FF]' },
                { name: 'Hip-Hop', pct: '20%', color: 'bg-[#9B5CFF]' },
                { name: 'Pop Hits', pct: '15%', color: 'bg-[#FF2D55]' },
                { name: 'Electronic', pct: '15%', color: 'bg-[#34D399]' },
                { name: 'Rock / Indie', pct: '15%', color: 'bg-amber-500' }
              ].map(genreItem => (
                <div key={genreItem.name} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${genreItem.color}`} />
                  <span className="text-[10px] font-bold text-neutral-405 truncate flex-1">{genreItem.name}</span>
                  <span className="text-[10px] font-mono text-neutral-500">{genreItem.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* D. TOP TRACKS & MOCK ACHIEVEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* Top Tracks Grid (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Favorite Track DNA</h3>
            <span className="text-[10px] font-mono text-[#2DD4FF]">Weekly Spotlight</span>
          </div>

          {!stats || stats.topTracks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.04] bg-[#0E0E11]/80 py-12 text-center text-xs text-neutral-500 font-bold">
              Listen to tracks to generate favorite rankings.
            </div>
          ) : (
            <div className="space-y-1">
              {stats.topTracks.slice(0, 5).map((track, idx) => (
                <PremiumTrackCard 
                  key={track.id} 
                  track={{
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    durationMs: track.durationMs,
                    coverUrl: track.coverUrl,
                    sourceType: 'youtube',
                    streamCount: `${track.playCount} plays`
                  }} 
                  onClick={() => handlePlayTrack(track, stats.topTracks)} 
                  variant="horizontal"
                  index={idx + 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Gamified Achievements (1/3 width) */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Locker Badges</h3>
          <div className="flex flex-col gap-3">
            {[
              { title: "First Vibe", desc: "Listened to your first track", icon: Music, checked: true },
              { title: "Lossless Purist", desc: "Enabled Lossless playback preset", icon: Volume2, checked: true },
              { title: "Power Session", desc: "Active listening for 3+ hours", icon: Flame, checked: true },
              { title: "Explorer Medal", desc: "Searched 20+ custom artists", icon: Compass, checked: true },
              { title: "Night Owl Award", desc: "Listened to coding mix past 2 AM", icon: Award, checked: false }
            ].map((ach, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                  ach.checked 
                    ? 'border-[#2DD4FF]/25 bg-[#2DD4FF]/5 shadow-sm shadow-[#2DD4FF]/2' 
                    : 'border-white/[0.04] bg-neutral-900/10 opacity-40'
                }`}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ach.checked ? 'bg-[#2DD4FF]/15 text-[#2DD4FF]' : 'bg-neutral-800 text-neutral-500'}`}>
                  <ach.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-left min-w-0">
                  <h4 className="text-xs font-black text-white leading-normal truncate">{ach.title}</h4>
                  <p className="text-[10px] text-neutral-400 font-semibold leading-normal truncate">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
