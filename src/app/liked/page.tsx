'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { useRouter } from 'next/navigation';
import { Play, Pause, Heart, Clock, Disc, ArrowLeft, ArrowUpDown, Sparkles, Music } from 'lucide-react';
import { MusicCoverArt } from '@/components/ui/MusicCoverArt';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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

type SortType = 'newest' | 'plays' | 'added';

export default function LikedPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [selectedVibe, setSelectedVibe] = useState('All');

  // 1. Fetch Liked Songs using React Query
  const { data, isLoading } = useQuery<{ tracks: Track[] }>({
    queryKey: ['liked-songs'],
    queryFn: async () => {
      const res = await fetch('/api/liked');
      if (!res.ok) throw new Error('Failed to fetch liked songs');
      return res.json();
    },
  });

  const tracks = data?.tracks || [];

  // 2. Unlike track mutation
  const unlikeMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const res = await fetch('/api/liked', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });
      if (!res.ok) throw new Error('Failed to unlike track');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liked-songs'] });
    },
  });

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    playTrack(tracks[0], tracks);
  };

  const handleTrackSelect = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, tracks);
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSortedTracks = () => {
    let result = [...tracks];
    // Filter by vibe
    if (selectedVibe !== 'All') {
      result = result.filter(t => 
        t.title.toLowerCase().includes(selectedVibe.toLowerCase()) || 
        t.artist.name.toLowerCase().includes(selectedVibe.toLowerCase())
      );
    }
    // Mock sort
    if (sortBy === 'plays') {
      return result.reverse();
    }
    return result;
  };

  const sortedTracks = getSortedTracks();
  const firstCoverUrl = tracks[0]?.coverUrl;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <Disc className="h-10 w-10 animate-spin text-[#00F5FF]" />
        <p className="mt-2 text-xs font-black uppercase tracking-widest text-neutral-450 animate-pulse">Synchronizing Locker...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white pb-36 sm:pb-12 text-left relative">
      
      {/* Immersive blurred backdrop using first track thumbnail */}
      {firstCoverUrl && (
        <div 
          className="absolute top-0 left-0 right-0 h-[300px] -z-10 bg-cover bg-center opacity-10 filter blur-[100px] pointer-events-none scale-105"
          style={{ backgroundImage: `url(${firstCoverUrl})` }}
        />
      )}

      {/* Back button and page banner */}
      <div className="flex items-center space-x-2 text-neutral-500 hover:text-white cursor-pointer transition-colors" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-wider">Back to dock</span>
      </div>

      <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-white/[0.04] pb-8 relative">
        {/* Heart cover art tile with premium cyan/blue gradient */}
        <div className="flex-shrink-0 h-32 w-32 md:h-36 md:w-36 shadow-2xl rounded-2xl relative overflow-hidden bg-gradient-to-tr from-[#00F5FF]/10 to-[#9B5CFF]/15 border border-white/[0.08] flex items-center justify-center">
          <Heart className="h-14 w-14 fill-none stroke-[#00F5FF]" />
          {/* Subtle audio bars animation overlay */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3">
            <span className="w-0.5 h-full bg-[#00F5FF] animate-wave-1 rounded-full" />
            <span className="w-0.5 h-full bg-[#9B5CFF] animate-wave-2 rounded-full" />
            <span className="w-0.5 h-full bg-[#00F5FF] animate-wave-3 rounded-full" />
          </div>
        </div>
        
        <div className="text-center md:text-left space-y-2">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00F5FF] bg-[#00F5FF]/10 px-3 py-1 rounded-full border border-[#00F5FF]/20">Personal Vault</span>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl uppercase mt-1">Liked Songs</h1>
          <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider">Your saved favorites · {tracks.length} tracks</p>
          
          {tracks.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="mt-4 flex items-center space-x-2 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] hover:from-cyan-350 hover:to-purple-450 px-6 py-3 text-xs font-black uppercase text-black active:scale-95 transition-all shadow-md shadow-cyan-500/10"
            >
              <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />
              <span>Play Vault</span>
            </button>
          )}
        </div>
      </div>

      {/* Tracks Listing */}
      {tracks.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0A0D14]/30 text-neutral-400 p-8 max-w-lg mx-auto shadow-inner relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-[#00F5FF]/5 to-[#9B5CFF]/5 opacity-50 blur-xl" />
          <div className="relative space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 border border-white/[0.06] text-[#00F5FF] shadow-[0_0_15px_rgba(0,245,255,0.15)]">
              <Heart className="h-5 w-5 fill-none stroke-[#00F5FF]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">No songs liked yet</h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-normal font-bold">
                Save songs from Search or your home dashboard and they will appear here.
              </p>
            </div>
            <button
              onClick={() => router.push('/search')}
              className="rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] px-6 py-2.5 text-xs font-black uppercase text-black active:scale-95 transition-all"
            >
              Explore Music
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Vibe Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['All', 'Kesariya', 'Tum', 'Apna', 'Espresso', 'Flowers'].map((vibe) => (
              <button
                key={vibe}
                onClick={() => setSelectedVibe(vibe)}
                className={`rounded-lg px-4.5 py-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
                  selectedVibe === vibe 
                    ? 'bg-[#00F5FF]/10 border-[#00F5FF]/30 text-[#00F5FF]' 
                    : 'border-white/[0.04] bg-[#0E0E11]/80 text-neutral-500 hover:text-white'
                }`}
              >
                {vibe === 'All' ? 'All Vibes' : vibe}
              </button>
            ))}
          </div>

          {/* Sorting Buttons */}
          <div className="flex items-center space-x-3 text-[10px] uppercase font-black tracking-wider justify-between pr-2 border-b border-white/[0.04] pb-3">
            <span className="text-neutral-500 flex items-center space-x-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort by</span>
            </span>
            <div className="flex space-x-3.5">
              {(['newest', 'plays', 'added'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortBy(mode)}
                  className={`transition-colors ${
                    sortBy === mode ? 'text-[#00F5FF]' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {mode === 'newest' && 'Newest'}
                  {mode === 'plays' && 'Most Played'}
                  {mode === 'added' && 'Recently Added'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {sortedTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => handleTrackSelect(track)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border border-transparent cursor-pointer transition-all duration-200 group ${
                    isCurrent ? 'bg-[#00F5FF]/5 border-[#00F5FF]/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <span className={`text-[10px] font-bold font-mono w-4 text-left ${isCurrent ? 'text-[#00F5FF]' : 'text-neutral-600'}`}>
                      {idx + 1}
                    </span>
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900 border border-white/[0.04]">
                      {track.coverUrl ? (
                        <Image
                          src={track.coverUrl}
                          alt={track.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                          <Music className="h-5 w-5 text-neutral-600" />
                        </div>
                      )}
                    </div>
                    <div className="truncate text-left">
                      <p className={`truncate text-sm font-black tracking-wide ${isCurrent ? 'text-[#00F5FF] drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="truncate text-[10px] text-neutral-450 font-bold uppercase tracking-wider mt-0.5">{track.artist.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-bold font-mono text-neutral-500 hidden sm:inline">
                      {formatDuration(track.durationMs)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        unlikeMutation.mutate(track.id);
                      }}
                      className="text-[#00F5FF] hover:text-neutral-500 transition-colors p-1"
                    >
                      <Heart className="h-4.5 w-4.5 fill-[#00F5FF] stroke-[#00F5FF]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
