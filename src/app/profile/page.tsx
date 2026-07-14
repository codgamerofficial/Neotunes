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
  UserCheck 
} from 'lucide-react';
import { usePlaybackStore } from '@/store/playback-store';
import ImageWithFallback from '@/components/ui/ImageWithFallback';

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

  // Fetch user profile on mount
  useEffect(() => {
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

  // Mock listening heatmap data (7 rows for days, 20 columns for weeks)
  const heatmapDays = Array.from({ length: 7 });
  const heatmapWeeks = Array.from({ length: 20 });
  const getHeatmapColor = (row: number, col: number) => {
    const intensity = (row * col + col * 3 + 2) % 5;
    if (intensity === 0) return 'bg-neutral-900';
    if (intensity === 1) return 'bg-cyan-950/40 border-cyan-950/20';
    if (intensity === 2) return 'bg-cyan-800/40 border-cyan-800/20';
    if (intensity === 3) return 'bg-cyan-500/50 border-cyan-500/25';
    return 'bg-gradient-to-br from-cyan-400 to-purple-500';
  };

  return (
    <div className="space-y-10 text-white pb-20 text-left select-none">
      
      {/* A. STUNNING GLASS HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0c0c0c]/85 p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-8 shadow-2xl">
        <div className="absolute inset-0 filter blur-[120px] opacity-10 bg-gradient-to-r from-cyan-500 via-purple-600 to-indigo-600 -z-10" />
        
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Avatar with Custom Animated Glow Ring */}
          <div className="relative h-32 w-32 rounded-full overflow-hidden p-[3px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-indigo-500 flex-shrink-0 animate-glowRing shadow-lg">
            <div className="h-full w-full rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
              {avatarUrl ? (
                <ImageWithFallback src={avatarUrl} alt="User Profile Avatar" fill className="object-cover rounded-full" />
              ) : (
                <span className="text-4xl font-black bg-gradient-to-br from-cyan-400 to-purple-400 bg-clip-text text-transparent uppercase tracking-wide">
                  {displayName ? displayName.slice(0, 2) : 'SD'}
                </span>
              )}
            </div>
            
            {/* Level Badge Overlay */}
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 border border-cyan-400 px-3 py-0.5 text-[9px] font-black text-black uppercase tracking-wider shadow">
              LVL 24
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
                <Sparkles className="h-3 w-3 fill-cyan-400/20 text-cyan-400" />
                <span>Premium Member</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 text-[10px] font-black text-purple-400 uppercase tracking-wider">
                <Flame className="h-3 w-3 fill-purple-400/20 text-purple-400" />
                <span>12 Day Streak</span>
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{displayName || 'Saswata Dey'}</h1>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5 text-xs text-neutral-450 font-semibold">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 142 Followers</span>
              <span>•</span>
              <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> 84 Following</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> India</span>
            </div>

            <p className="text-xs text-neutral-400 max-w-md leading-relaxed font-semibold">
              Music explorer, playlist curator, and AI audio collector. Jamming to lofi beats and high-BPM synthwave coding sessions.
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/settings')}
          className="rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-cyan-400/30 px-6 py-2.5 text-xs font-black text-white transition-all flex items-center space-x-1.5"
        >
          <Edit className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* B. LISTENING WRAPPED EVERY DAY STATS GRID */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Workspace Statistics</h3>
        
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Disc className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { label: 'Total Plays', value: stats?.totalPlays || 0, icon: BarChart3, desc: 'Lifetime track counts' },
              { label: 'Liked Tracks', value: stats?.totalLikes || 0, icon: Heart, desc: 'Pinned favorites' },
              { label: 'Hours Played', value: '48.2 hrs', icon: Flame, desc: 'Listening duration' },
              { label: 'Discovered', value: '38 Artists', icon: Compass, desc: 'New artists this month' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.05] bg-gradient-to-br from-neutral-900/40 to-neutral-950/20 p-5 flex items-center justify-between"
                >
                  <div className="text-left space-y-1.5">
                    <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                    <p className="text-[10px] text-neutral-450 font-semibold">{stat.desc}</p>
                  </div>
                  <Icon className="h-8 w-8 text-neutral-600 opacity-60" />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* C1. GITHUB HEATMAP CALENDAR (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Listening Heatmap</h3>
          <div className="rounded-2xl border border-white/[0.05] bg-neutral-900/10 p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-450">
              <span className="font-semibold">324 plays registered in the last 140 days</span>
              <span className="font-mono text-[10px] uppercase text-cyan-400">Activity Level</span>
            </div>
            
            {/* Heatmap Grid Calendar */}
            <div className="flex gap-[4px] overflow-x-auto pb-2">
              {heatmapWeeks.map((_, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-[4px]">
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

            <div className="flex items-center justify-between text-[9px] text-neutral-500 font-bold uppercase tracking-wider pt-2 border-t border-white/[0.03]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="h-2 w-2 rounded bg-neutral-900" />
                <div className="h-2 w-2 rounded bg-cyan-950/40" />
                <div className="h-2 w-2 rounded bg-cyan-800/40" />
                <div className="h-2 w-2 rounded bg-cyan-500/50" />
                <div className="h-2 w-2 rounded bg-cyan-400" />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* C2. GENRE WHEEL CONIC ACCENT (1/3 width) */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Genre Composition</h3>
          <div className="rounded-2xl border border-white/[0.05] bg-neutral-900/10 p-5 flex flex-col items-center justify-center space-y-4">
            {/* Conic gradient wheel */}
            <div 
              className="h-28 w-28 rounded-full border border-white/[0.08] relative shadow-lg"
              style={{
                background: 'conic-gradient(#00F5FF 0% 35%, #7B61FF 35% 55%, #F43F5E 55% 70%, #10B981 70% 85%, #F59E0B 85% 100%)'
              }}
            >
              {/* Inner cutout to make it a donut chart */}
              <div className="absolute inset-4 rounded-full bg-[#0c0c0c] flex flex-col items-center justify-center">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none">Favorite</span>
                <span className="text-xs font-black text-cyan-400 uppercase tracking-wider mt-1">Lofi Pop</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 w-full text-left pt-2">
              {[
                { name: 'Lofi & Chill', pct: '35%', color: 'bg-cyan-400' },
                { name: 'Hip-Hop', pct: '20%', color: 'bg-purple-500' },
                { name: 'Bollywood Hits', pct: '15%', color: 'bg-rose-500' },
                { name: 'Electronic', pct: '15%', color: 'bg-emerald-500' },
                { name: 'Rock / Indie', pct: '15%', color: 'bg-amber-500' }
              ].map(genreItem => (
                <div key={genreItem.name} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${genreItem.color}`} />
                  <span className="text-[10px] font-bold text-neutral-400 truncate flex-1">{genreItem.name}</span>
                  <span className="text-[10px] font-mono text-neutral-500">{genreItem.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* D1. TOP TRACKS LIST (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">Your Top Tracks</h3>
            <span className="text-[10px] font-mono text-cyan-400">Weekly Stats</span>
          </div>

          {!stats || stats.topTracks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.05] bg-neutral-900/10 py-10 text-center text-sm text-neutral-500">
              Listen to music to generate your favorite track rankings!
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topTracks.slice(0, 5).map((track, idx) => {
                const trackObj = {
                  id: track.id,
                  title: track.title,
                  artist: track.artist,
                  durationMs: track.durationMs,
                  coverUrl: track.coverUrl,
                  sourceType: 'youtube' as const, 
                };

                const badges = [
                  'bg-cyan-400 text-black',
                  'bg-purple-500 text-white',
                  'bg-rose-500 text-white'
                ];

                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(trackObj, stats.topTracks.map(t => ({ ...t, sourceType: 'youtube' as const })))}
                    className="group relative flex items-center justify-between rounded-2xl p-3 border border-white/[0.04] bg-neutral-900/15 hover:bg-neutral-850 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-4 truncate">
                      <span className={`text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center ${badges[idx] || 'bg-neutral-800 text-neutral-450'}`}>
                        {idx + 1}
                      </span>
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-950 border border-white/[0.05]">
                        <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="40px" />
                      </div>
                      <div className="truncate text-left">
                        <p className="truncate text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">{track.title}</p>
                        <p className="truncate text-[10px] text-neutral-450 font-semibold mt-0.5">{track.artist?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3.5">
                      <span className="text-[10px] font-mono text-neutral-500">{track.playCount} plays</span>
                      <button className="h-8 w-8 rounded-full bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-neutral-550 group-hover:text-cyan-400 transition-colors">
                        <Play className="h-3 w-3 fill-current translate-x-[0.5px]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* D2. MOCK ACHIEVEMENTS & GAMIFICATION (1/3 width) */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Achievements</h3>
          <div className="flex flex-col gap-3">
            {[
              { title: "First Vibe", desc: "Listened to your first track", icon: Music, checked: true },
              { title: "Power Session", desc: "Listening for 3+ consecutive hours", icon: Flame, checked: true },
              { title: "Explorer Medal", desc: "Discovered 20+ custom artists", icon: Compass, checked: true },
              { title: "Night Owl Award", desc: "Active listener past 2:00 AM", icon: Award, checked: false }
            ].map((ach, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-xl border flex items-center gap-3.5 ${
                  ach.checked 
                    ? 'border-cyan-500/20 bg-cyan-950/5' 
                    : 'border-white/[0.04] bg-neutral-900/10 opacity-50'
                }`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${ach.checked ? 'bg-cyan-500/10 text-cyan-400' : 'bg-neutral-800 text-neutral-500'}`}>
                  <ach.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold text-white leading-normal">{ach.title}</h4>
                  <p className="text-[10px] text-neutral-450 font-semibold leading-normal">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
