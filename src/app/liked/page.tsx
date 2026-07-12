'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { Play, Pause, Heart, Trash2, Clock, Disc } from 'lucide-react';
import Image from 'next/image';

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

export default function LikedPage() {
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();

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

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <Disc className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-2 text-sm text-neutral-400">Loading your favorite songs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      {/* Page Banner Header */}
      <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-neutral-900 pb-8">
        <div className="flex h-36 w-36 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/10">
          <Heart className="h-16 w-16 fill-white text-white stroke-[1.5] animate-pulse" />
        </div>
        <div className="text-center md:text-left space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Playlist</span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Liked Songs</h1>
          <p className="text-sm text-neutral-400">
            {tracks.length === 0 ? 'No songs liked yet' : `${tracks.length} songs`}
          </p>
          {tracks.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="mt-4 flex items-center space-x-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95"
            >
              <Play className="h-4.5 w-4.5 fill-black stroke-black" />
              <span>Play All</span>
            </button>
          )}
        </div>
      </div>

      {/* Tracks Table List */}
      {tracks.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/20">
          <p className="text-sm text-neutral-500">Songs you like will appear here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-900 text-xs font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 pl-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 hidden md:table-cell">Album</th>
                <th className="py-3 px-4 w-16 text-center">
                  <Clock className="h-4 w-4 mx-auto" />
                </th>
                <th className="py-3 pr-4 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <tr
                    key={track.id}
                    onClick={() => handleTrackSelect(track)}
                    className={`group cursor-pointer border-b border-neutral-950 transition-colors hover:bg-neutral-900/40 ${
                      isCurrent ? 'bg-neutral-900/20' : ''
                    }`}
                  >
                    {/* Index / Play action indicator */}
                    <td className="py-3.5 pl-4 text-center text-sm font-semibold text-neutral-500">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <button className="hidden group-hover:inline-block">
                        {isCurrent && isPlaying ? (
                          <Pause className="h-4 w-4 text-emerald-400 fill-emerald-400" />
                        ) : (
                          <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" />
                        )}
                      </button>
                    </td>

                    {/* Album Art & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3 truncate">
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-neutral-800">
                          {track.coverUrl ? (
                            <Image
                              src={track.coverUrl}
                              alt={track.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-600">
                              <Disc className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="truncate text-left">
                          <p className={`truncate text-sm font-semibold ${isCurrent ? 'text-emerald-400 animate-pulse' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-neutral-400">{track.artist.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Album Column */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-sm text-neutral-400 truncate">
                      {track.album?.name || 'Single'}
                    </td>

                    {/* Duration Column */}
                    <td className="py-3.5 px-4 text-center text-xs font-mono text-neutral-400">
                      {formatDuration(track.durationMs)}
                    </td>

                    {/* Quick Action Column */}
                    <td className="py-3.5 pr-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => unlikeMutation.mutate(track.id)}
                        className="text-neutral-500 hover:text-red-400 transition-colors p-2"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
