'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { useRouter } from 'next/navigation';
import { Play, Pause, Heart, Clock, Disc, ArrowLeft, ArrowUpDown } from 'lucide-react';
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

type SortType = 'newest' | 'plays' | 'added';

export default function LikedPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const [sortBy, setSortBy] = useState<SortType>('newest');

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

  // Sort logic (mock sorting for demo purposes)
  const getSortedTracks = () => {
    if (sortBy === 'plays') {
      return [...tracks].reverse(); // Mock popular sort
    }
    return tracks;
  };

  const sortedTracks = getSortedTracks();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <Disc className="h-10 w-10 animate-spin text-teal-400" />
        <p className="mt-2 text-sm text-neutral-400 font-semibold">Loading your favorite songs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white pb-12 text-left">
      {/* Back button and page banner */}
      <div className="flex items-center space-x-2 text-neutral-400 hover:text-white cursor-pointer transition-colors" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Back</span>
      </div>

      <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-neutral-900 pb-8">
        {/* Heart cover art tile with magenta gradient */}
        <div className="flex-shrink-0 h-36 w-36 shadow-2xl rounded-2xl relative overflow-hidden shadow-pink-500/10">
          <MusicCoverArt type="liked" className="h-full w-full" iconClassName="h-16 w-16 text-white" />
        </div>
        
        <div className="text-center md:text-left space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">Personal Locker</span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Liked Songs</h1>
          <p className="text-sm text-neutral-400 font-medium">Your saved favorites • {tracks.length} tracks</p>
          
          {tracks.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="mt-4 flex items-center space-x-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-350 hover:to-emerald-450 px-6 py-2.5 text-xs font-extrabold text-black active:scale-95 transition-all shadow-md shadow-teal-500/10"
            >
              <Play className="h-4.5 w-4.5 fill-black stroke-black" />
              <span>Play All</span>
            </button>
          )}
        </div>
      </div>

      {/* Tracks Listing */}
      {tracks.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-400 p-8 max-w-lg mx-auto shadow-inner relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-teal-500/5 to-violet-500/5 opacity-50 blur-xl" />
          <div className="relative space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-teal-400 shadow-[0_0_15px_rgba(20,250,200,0.1)]">
              <Heart className="h-6 w-6 fill-none stroke-teal-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">No songs liked yet</h3>
              <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-normal font-medium">
                Save songs from Search or your home page and they will appear here.
              </p>
            </div>
            <button
              onClick={() => router.push('/search')}
              className="rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2 text-xs font-bold text-black active:scale-95 transition-all shadow-md"
            >
              Explore Music
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sorting Buttons */}
          <div className="flex items-center space-x-3 text-xs border-b border-neutral-900 pb-3 justify-end pr-2">
            <span className="text-neutral-500 flex items-center space-x-1 font-bold">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>Sort by:</span>
            </span>
            {(['newest', 'plays', 'added'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortBy(mode)}
                className={`font-bold transition-colors ${
                  sortBy === mode ? 'text-teal-400' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {mode === 'newest' && 'Newest'}
                {mode === 'plays' && 'Most Played'}
                {mode === 'added' && 'Recently Added'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 pl-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 hidden md:table-cell">Album</th>
                  <th className="py-3 px-4 w-16 text-center">
                    <Clock className="h-4 w-4 mx-auto" />
                  </th>
                  <th className="py-3 pr-4 w-16 text-center">Like</th>
                </tr>
              </thead>
              <tbody>
                {sortedTracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  return (
                    <tr
                      key={track.id}
                      onClick={() => handleTrackSelect(track)}
                      className={`group cursor-pointer border-b border-neutral-950 transition-colors hover:bg-neutral-900/40 ${
                        isCurrent ? 'bg-neutral-900/10' : ''
                      }`}
                    >
                      {/* Index / Play action */}
                      <td className="py-3.5 pl-4 text-center text-sm font-bold text-neutral-500">
                        <span className="group-hover:hidden">{idx + 1}</span>
                        <button className="hidden group-hover:inline-block">
                          {isCurrent && isPlaying ? (
                            <Pause className="h-4 w-4 text-teal-400 fill-teal-400" />
                          ) : (
                            <Play className="h-4 w-4 text-teal-400 fill-teal-400" />
                          )}
                        </button>
                      </td>

                      {/* Cover & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3.5 truncate">
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-900 shadow-sm border border-neutral-950">
                            {track.coverUrl ? (
                              <Image
                                src={track.coverUrl}
                                alt={track.title}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <MusicCoverArt title={track.title} className="h-full w-full" iconClassName="h-4.5 w-4.5" />
                            )}
                          </div>
                          <div className="truncate text-left">
                            <p className={`truncate text-sm font-bold ${isCurrent ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,240,200,0.35)] animate-pulse' : 'text-white'}`}>
                              {track.title}
                            </p>
                            <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Album */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-xs text-neutral-400 font-semibold truncate">
                        {track.album?.name || 'Single'}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-center text-xs font-bold font-mono text-neutral-400">
                        {formatDuration(track.durationMs)}
                      </td>

                      {/* Like heart toggle */}
                      <td className="py-3.5 pr-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => unlikeMutation.mutate(track.id)}
                          className="text-teal-400 hover:text-neutral-500 transition-colors p-2"
                        >
                          <Heart className="h-4.5 w-4.5 fill-teal-400 stroke-teal-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
