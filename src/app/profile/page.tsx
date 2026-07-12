'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClientBrowser } from '@/lib/supabase-browser';
import { User, Heart, BarChart3, Compass, Sparkles, Disc, Radio, Music } from 'lucide-react';
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
          setDisplayName(profile.display_name || user.email?.split('@')[0] || 'User');
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
    <div className="space-y-10 text-white pb-12">
      {/* Profile Card Banner */}
      <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-neutral-900 pb-8">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-emerald-500 bg-neutral-900 shadow-xl">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-emerald-400 text-3xl">
              {displayName.slice(0, 2).toUpperCase() || 'NT'}
            </div>
          )}
        </div>
        <div className="text-center md:text-left space-y-1.5">
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Sparkles className="h-3 w-3 fill-emerald-400/20" />
            <span>Premium Member</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{displayName}</h1>
          <p className="text-sm text-neutral-400">{email} • Joined {joinedAt}</p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Disc className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'Total Plays', value: stats?.totalPlays || 0, icon: BarChart3, color: 'text-blue-400 bg-blue-500/5' },
              { label: 'Liked Tracks', value: stats?.totalLikes || 0, icon: Heart, color: 'text-rose-400 bg-rose-500/5' },
              { label: 'Favorite Genre', value: stats?.favoriteGenre || 'Eclectic', icon: Compass, color: 'text-amber-400 bg-amber-500/5' },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-xl border border-neutral-900 p-5 shadow-sm ${stat.color}`}
                >
                  <div className="text-left space-y-1">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                  </div>
                  <Icon className="h-7 w-7 opacity-80" />
                </div>
              );
            })}
          </section>

          {/* Top Songs section */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center space-x-2">
              <Radio className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">Your Top Tracks</h2>
            </div>

            {stats?.topTracks.length === 0 ? (
              <div className="rounded-xl border border-neutral-900 bg-neutral-950/20 py-8 text-center text-sm text-neutral-500">
                Play more music to generate your top tracks!
              </div>
            ) : (
              <div className="space-y-2 max-w-3xl">
                {stats?.topTracks.map((track, idx) => {
                  const trackObj = {
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    durationMs: track.durationMs,
                    coverUrl: track.coverUrl,
                    sourceType: 'youtube' as const, // default fallback
                  };

                  return (
                    <div
                      key={track.id}
                      onClick={() => playTrack(trackObj, [trackObj])}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-neutral-900/40 cursor-pointer"
                    >
                      <div className="flex items-center space-x-4 truncate">
                        <span className="text-sm font-semibold text-neutral-500 w-5 text-center">{idx + 1}</span>
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-800">
                          {track.coverUrl ? (
                            <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-600 bg-neutral-900">
                              <Music className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="truncate text-left">
                          <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                          <p className="truncate text-xs text-neutral-400">{track.artist.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-neutral-500 font-mono">
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
