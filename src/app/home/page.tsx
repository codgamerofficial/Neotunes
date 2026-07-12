'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Play, Pause, Sparkles, Disc, Clock, Music } from 'lucide-react';
import Image from 'next/image';
import { MusicCoverArt } from '@/components/ui/MusicCoverArt';

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

  // 1. Fetch Discover Mix recommendations
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

  // 2. Fetch Recently Played History
  const { data: historyData, isLoading: historyLoading } = useQuery<{ history: Track[] }>({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  const recommendations = recsResponse?.data?.tracks || [];
  const fallbackUsed = recsResponse?.fallbackUsed || false;
  const history = historyData?.history || [];

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handlePlayTrack = (track: Track, list: Track[]) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, list);
    }
  };

  const recsMessage = recsResponse?.message || 'Picked for Your Vibe';

  return (
    <div className="space-y-10 text-white pb-12">
      {/* Dynamic Time-based Greeting & Banner */}
      <div className="flex flex-col space-y-2 text-left relative overflow-hidden p-6 rounded-2xl border border-teal-500/10 bg-gradient-to-r from-neutral-950 via-teal-950/5 to-neutral-950 shadow-[0_0_30px_rgba(20,250,200,0.02)]">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-teal-500/5 blur-3xl" />
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
          {getGreeting()}, {userProfile?.displayName || 'Saswata'}
        </h1>
        <p className="text-neutral-400 text-sm md:text-base font-medium">
          &ldquo;The Future Sounds Better.&rdquo; Here is your personalized soundtrack for today.
        </p>
      </div>

      {/* Grid of recommendations (Discover Mix) */}
      <section id="discover-section-anchor" className="space-y-6 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="h-5 w-5 text-teal-400 fill-teal-400/20" />
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">
              {fallbackUsed ? 'Curated for You' : 'Discover Weekly Mix'}
            </h2>
          </div>
          {fallbackUsed && (
            <span className="liquid-panel self-start inline-flex items-center rounded-full px-3.5 py-1 text-xs font-bold text-teal-400 shadow-[0_0_15px_rgba(0,245,212,0.15)] border border-teal-500/20">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-teal-450 animate-pulse shadow-[0_0_8px_#00f5d4]" />
              {recsMessage}
            </span>
          )}
        </div>
        
        {recsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl bg-neutral-900/40 border border-neutral-800/40 p-4 space-y-4 shadow-md"
              >
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-800" />
                <div className="space-y-2">
                  <div className="h-4 w-3/4 rounded bg-neutral-800" />
                  <div className="h-3 w-1/2 rounded bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="liquid-panel rounded-xl p-8 text-center max-w-md mx-auto border border-neutral-800">
            <Music className="mx-auto h-12 w-12 text-neutral-500 mb-3" />
            <h3 className="text-lg font-bold text-white">No recommendations available</h3>
            <p className="text-sm text-neutral-400 mt-1 font-medium">
              Start playing or liking music to build your personalized discovery mix.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recommendations.slice(0, 10).map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => handlePlayTrack(track, recommendations)}
                  className="liquid-panel liquid-interactive group cursor-pointer rounded-2xl p-4 hover:scale-[1.03] duration-300 hover:shadow-xl hover:shadow-teal-500/5 hover:border-teal-500/25 border border-neutral-900/50"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-950 mb-3.5 shadow-md">
                    {track.coverUrl ? (
                      <Image
                        src={track.coverUrl}
                        alt={track.title}
                        fill
                        sizes="(max-width: 640px) 150px, 200px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <MusicCoverArt
                        title={track.title}
                        className="h-full w-full"
                        iconClassName="h-10 w-10"
                      />
                    )}
                    
                    {/* Floating Hover Play Trigger */}
                    <button
                      className="absolute bottom-2.5 right-2.5 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-black opacity-0 shadow-lg shadow-teal-500/20 transition-all group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 active:scale-95 duration-300 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(track, recommendations);
                      }}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="h-4.5 w-4.5 fill-black stroke-black" />
                      ) : (
                        <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[1px]" />
                      )}
                    </button>
                  </div>
                  <h3 className={`truncate text-sm font-bold text-left tracking-tight mb-0.5 ${isCurrent ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,240,200,0.3)]' : 'text-white'}`}>
                    {track.title}
                  </h3>
                  <p className="truncate text-xs text-neutral-400 text-left font-semibold group-hover:text-neutral-300 transition-colors">{track.artist.name}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recently Played History */}
      <section className="space-y-6">
        <div className="flex items-center space-x-2.5">
          <Clock className="h-5 w-5 text-neutral-400" />
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">Recently Played</h2>
        </div>

        {historyLoading ? (
          <div className="space-y-2.5 max-w-4xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between rounded-lg p-3 bg-neutral-900/20 border border-neutral-850/20">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded bg-neutral-800" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-neutral-800" />
                    <div className="h-3 w-20 rounded bg-neutral-800" />
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="liquid-panel rounded-2xl p-8 text-center max-w-lg mx-auto shadow-2xl relative overflow-hidden group border border-neutral-900/50">
            {/* Glowing background blob */}
            <div className="absolute -inset-px bg-gradient-to-br from-teal-500/5 to-violet-500/5 opacity-50 blur-xl group-hover:opacity-75 transition-opacity" />
            
            <div className="relative space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                <Clock className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white tracking-tight">Your listening history is empty</h3>
                <p className="text-sm text-neutral-400 max-w-xs mx-auto text-center leading-normal font-medium">
                  Songs you play from discovery, search, or playlists will appear here in real-time.
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  onClick={() => router.push('/search')}
                  className="liquid-interactive rounded-full bg-gradient-to-r from-teal-400 to-emerald-450 px-6 py-2 text-xs font-bold text-black hover:scale-105 active:scale-95 shadow-md"
                >
                  Search Music
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('discover-section-anchor');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="liquid-panel liquid-interactive rounded-full px-5 py-2 text-xs font-bold text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
                >
                  Explore Discovery
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {history.slice(0, 5).map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={`${track.id}-${index}`}
                  onClick={() => handlePlayTrack(track, history)}
                  className={`liquid-panel liquid-interactive group flex items-center justify-between rounded-xl p-3 transition-colors cursor-pointer border border-neutral-900/50 hover:border-teal-500/20 ${
                    isCurrent ? 'border-teal-500/20 bg-teal-500/5 shadow-[0_0_15px_rgba(20,250,200,0.02)]' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4 truncate">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-850">
                      {track.coverUrl ? (
                        <Image
                          src={track.coverUrl}
                          alt={track.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <MusicCoverArt
                          title={track.title}
                          className="h-full w-full"
                          iconClassName="h-4.5 w-4.5"
                        />
                      )}
                    </div>
                    <div className="truncate text-left">
                      <p className={`truncate text-sm font-bold ${isCurrent ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,240,200,0.3)]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist.name}</p>
                    </div>
                  </div>
                  
                  {/* Action Play status */}
                  <button className="text-neutral-500 hover:text-teal-400 transition-colors p-2">
                    {isCurrent && isPlaying ? (
                      <Pause className="h-5 w-5 fill-teal-400 text-teal-400" />
                    ) : (
                      <Play className="h-5 w-5 text-neutral-400 group-hover:text-teal-400" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
