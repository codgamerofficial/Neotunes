'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClientBrowser } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Heart, BarChart3, Compass, Sparkles, Disc, Radio, Music, Edit } from 'lucide-react';
import { usePlaybackStore } from '@/store/playback-store';
import Image from 'next/image';

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

  // 1. Fetch user profile from Supabase Auth & profiles table on mount
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

  // 2. Query stats using React Query
  const { data: stats, isLoading } = useQuery<ProfileStats>({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const res = await fetch('/api/user/stats');
      if (!res.ok) throw new Error('Failed to load profile statistics');
      return res.json();
    },
  });

  return (
    <div className="space-y-10 text-white pb-12 text-left">
      {/* Profile Card Banner */}
      <div className="flex flex-col items-center space-y-5 md:flex-row md:space-y-0 md:space-x-6 border-b border-neutral-900 pb-8">
        {/* Avatar with Glow Accent Ring */}
        <div className="relative h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-teal-400 via-emerald-400 to-violet-500 p-[3px] shadow-[0_0_25px_rgba(20,250,200,0.2)]">
          <div className="h-full w-full rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover rounded-full" />
            ) : (
              <div className="font-black bg-gradient-to-br from-teal-400 to-violet-400 bg-clip-text text-transparent text-4xl select-none">
                {displayName.slice(0, 2).toUpperCase() || 'SD'}
              </div>
            )}
          </div>
        </div>
        
        {/* User Info details */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/25 px-3 py-1 text-xs font-bold text-teal-400 shadow-md">
            <Sparkles className="h-3 w-3 fill-teal-400/25 text-teal-400" />
            <span>Premium Member</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{displayName || 'Saswata Dey'}</h1>
          <p className="text-sm text-neutral-400 font-semibold">{email} • Joined April 2026</p>
        </div>

        {/* Edit Profile outline button */}
        <button
          onClick={() => router.push('/settings')}
          className="liquid-interactive rounded-full border border-teal-500/20 bg-neutral-950 px-5 py-2 text-xs font-bold text-neutral-300 hover:text-teal-400 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all flex items-center space-x-1.5"
        >
          <Edit className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Disc className="h-8 w-8 animate-spin text-teal-400" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { 
                label: 'Total Plays', 
                value: stats?.totalPlays || 0, 
                icon: BarChart3, 
                color: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 text-blue-400' 
              },
              { 
                label: 'Liked Tracks', 
                value: stats?.totalLikes || 0, 
                icon: Heart, 
                color: 'from-pink-500/10 to-purple-500/5 border-pink-500/20 text-pink-400' 
              },
              { 
                label: 'Favorite Genre', 
                value: stats?.favoriteGenre || 'Eclectic', 
                icon: Compass, 
                color: 'from-teal-500/10 to-emerald-500/5 border-teal-500/20 text-teal-400' 
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-2xl border bg-gradient-to-br ${stat.color} p-5 shadow-sm`}
                >
                  <div className="text-left space-y-1">
                    <p className="text-xs text-neutral-500 font-extrabold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-black text-white">{stat.value}</p>
                  </div>
                  <Icon className="h-8 w-8 opacity-80" />
                </div>
              );
            })}
          </section>

          {/* Top Songs section */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center space-x-2.5">
              <Radio className="h-5 w-5 text-teal-400" />
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">Your Top Tracks</h2>
            </div>

            {stats?.topTracks.length === 0 ? (
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950/20 py-10 text-center text-sm text-neutral-500 font-medium">
                Play more music to generate your top tracks!
              </div>
            ) : (
              <div className="space-y-2.5 max-w-3xl">
                {stats?.topTracks.map((track, idx) => {
                  const trackObj = {
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    durationMs: track.durationMs,
                    coverUrl: track.coverUrl,
                    sourceType: 'youtube' as const, 
                  };

                  const rankColors = [
                    'bg-gradient-to-r from-teal-400 to-emerald-400 text-black shadow-md shadow-teal-500/10',
                    'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
                    'bg-neutral-800 text-neutral-400'
                  ];

                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(trackObj, [trackObj])}
                      className="liquid-panel liquid-interactive group flex items-center justify-between rounded-xl p-3 border border-neutral-900/50 hover:border-teal-500/15 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4 truncate">
                        {/* Rank Badge */}
                        <span className={`text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center ${rankColors[idx] || 'bg-neutral-900 text-neutral-500'}`}>
                          {idx + 1}
                        </span>
                        
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
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
                        <div className="truncate text-left">
                          <p className="truncate text-sm font-bold text-white group-hover:text-teal-400 transition-colors">{track.title}</p>
                          <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-neutral-450 font-bold font-mono">
                          {track.playCount} plays
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
