'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Play, Pause, Sparkles, Disc, Clock, Music } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: { name: string };
  album?: { name: string; coverUrl?: string };
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
  interface RecommendationsResponse {
    success: boolean;
    data: {
      tracks: Track[];
    };
    fallbackUsed: boolean;
    source: 'spotify' | 'cache' | 'history' | 'liked' | 'catalog' | 'curated';
    message?: string;
  }

  const { data: recsResponse, isLoading: recsLoading } = useQuery<RecommendationsResponse>({
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

  // Fetch user stats for totalPlays and topTracks
  interface ProfileStats {
    totalPlays: number;
    topTracks: {
      id: string;
      title: string;
      artist: { name: string };
      durationMs: number;
      coverUrl?: string;
      playCount: number;
    }[];
  }

  const { data: stats } = useQuery<ProfileStats>({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user/stats');
      if (!res.ok) throw new Error('Failed to load profile statistics');
      return res.json();
    },
  });

  const recommendations = recsResponse?.data?.tracks || [];
  const fallbackUsed = recsResponse?.fallbackUsed || false;
  const history = historyData?.history || [];

  const getTimeOfDayLabel = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Morning';
    if (hr < 17) return 'Afternoon';
    return 'Evening';
  };
  const timeOfDay = getTimeOfDayLabel().toLowerCase();
  const displayName = userProfile?.displayName || 'Saswata';
  const totalPlays = stats?.totalPlays || 0;

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

  const recsMessage = recsResponse?.message || 'Picked for Your Vibe';

  // Deduplicate by track ID
  const uniqueRecommendations = recommendations
    ? Array.from(new Map(recommendations.map(t => [t.id ?? (t as any).videoId, t])).values())
    : [];

  // Prepare trending tracks: use stats.topTracks, and fall back to recommendations if not populated yet
  const trendingTracks = stats?.topTracks && stats.topTracks.length > 0
    ? stats.topTracks.slice(0, 5).map(t => ({
        id: t.id,
        title: t.title,
        artist: t.artist.name,
        thumbnail: t.coverUrl,
        plays: t.playCount
      }))
    : uniqueRecommendations.slice(0, 5).map((t, idx) => ({
        id: t.id,
        title: t.title,
        artist: t.artist?.name || 'Unknown',
        thumbnail: t.coverUrl,
        plays: 1240 - idx * 150
      }));

  // Reusable Track Card component rendered inline for simplicity
  const TrackCard = ({ track, onClick }: { track: Track; onClick: () => void }) => {
    const isCurrent = currentTrack?.id === track.id;
    const thumbnail = track.coverUrl || (track as any).thumbnail || (track as any).cover_url;
    const artistName = track.artist?.name || (track as any).channelTitle || (track as any).artist || 'Unknown';

    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative flex-shrink-0 w-44 snap-start rounded-2xl bg-neutral-950 border border-white/[0.06] overflow-hidden hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-200"
      >
        {/* Cover art */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={track.title}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
              <svg
                className="h-8 w-8 text-neutral-600"
                fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
              {isCurrent && isPlaying ? (
                <Pause className="h-4.5 w-4.5 fill-black stroke-black" />
              ) : (
                <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[1px]" />
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 space-y-0.5 text-left font-sans">
          <p className={`text-sm font-semibold leading-tight line-clamp-1 ${isCurrent ? 'text-emerald-450 drop-shadow-[0_0_8px_rgba(20,240,200,0.3)]' : 'text-white'}`}>
            {track.title}
          </p>
          <p className="text-[11px] text-neutral-500 line-clamp-1">
            {artistName}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-8 text-white pb-12 font-sans">
      {/* A. GREETING HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/15 via-violet-600/10 to-transparent border border-white/[0.06] px-8 py-10 mb-8 text-left">
        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-32 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />

        {/* Greeting */}
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
          {getTimeOfDayLabel()} · NeoTune
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white">
          Good {timeOfDay},<br className="sm:hidden" /> {displayName}
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400 font-semibold leading-relaxed">
          &ldquo;The Future Sounds Better.&rdquo; Here is your personalised soundtrack for today.
        </p>

        {/* Quick stats strip */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs text-neutral-300 border border-white/[0.06] font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {totalPlays} total plays
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-xs text-neutral-300 border border-white/[0.06] font-semibold">
            <span className="h-2 w-2 rounded-full bg-pink-400" />
            Favourite genre: Eclectic
          </div>
        </div>
      </div>

      {/* B. "CURATED FOR YOU" SECTION */}
      <section className="space-y-4 mb-10 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">✦</span>
            <h2 className="text-lg font-bold tracking-tight">Curated for You</h2>
          </div>
          <button type="button" className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-450 hover:bg-emerald-500/20 transition-colors">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {recsMessage}
          </button>
        </div>

        {recsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse w-44 h-56 rounded-2xl bg-neutral-900/40 border border-neutral-800/40" />
            ))}
          </div>
        ) : uniqueRecommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] py-8 text-center text-sm text-neutral-500">
            No recommendations available. Start listening to build your mix!
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {uniqueRecommendations.slice(0, 8).map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onClick={() => handlePlayTrack(track, uniqueRecommendations)}
              />
            ))}
          </div>
        )}
      </section>

      {/* D. SECTION 1 - RECENTLY PLAYED */}
      <section className="space-y-4 mb-10 text-left">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-bold tracking-tight">Recently Played</h2>
        </div>

        {historyLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse w-44 h-56 rounded-2xl bg-neutral-900/40 border border-neutral-800/40" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.01] py-8 text-center text-sm text-neutral-500">
            No recently played songs.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {history.map((track, idx) => (
              <TrackCard
                key={`${track.id}-${idx}`}
                track={track}
                onClick={() => handlePlayTrack(track, history)}
              />
            ))}
          </div>
        )}
      </section>

      {/* D. SECTION 2 - TRENDING TODAY */}
      <section className="space-y-4 mb-10 text-left">
        <h2 className="text-lg font-bold tracking-tight">🔥 Trending Today</h2>
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] divide-y divide-white/[0.04]">
          {trendingTracks.map((track, i) => {
            const fullTrack: Track = {
              id: track.id,
              title: track.title,
              artist: { name: track.artist },
              coverUrl: track.thumbnail,
              durationMs: 180000,
              sourceType: 'youtube'
            };
            return (
              <div
                key={track.id}
                onClick={() => handlePlayTrack(fullTrack, trendingTracks.map(t => ({
                  id: t.id,
                  title: t.title,
                  artist: { name: t.artist },
                  coverUrl: t.thumbnail,
                  durationMs: 180000,
                  sourceType: 'youtube'
                })))}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <span className="w-5 text-center text-sm font-bold text-neutral-600">{i + 1}</span>
                <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-900">
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                      <svg
                        className="h-5 w-5 text-neutral-600"
                        fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-white line-clamp-1">{track.title}</p>
                  <p className="text-xs text-neutral-500">{track.artist}</p>
                </div>
                <span className="text-xs text-neutral-600 tabular-nums font-semibold">{track.plays} plays</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
