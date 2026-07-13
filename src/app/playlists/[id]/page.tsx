'use client';

import React, { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Play,
  Pause,
  Clock,
  Trash2,
  ChevronUp,
  ChevronDown,
  Globe,
  Lock,
  Users,
  Edit2,
  Disc,
  ArrowLeft,
  Music,
} from 'lucide-react';

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

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  is_public: boolean;
  is_collaborative: boolean;
  user_id: string;
  tracks: Track[];
}

export default function PlaylistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Support both Promise and plain object formats for params in Next.js 15
  const resolvedParams = params && typeof (params as any).then === 'function'
    ? use(params)
    : (params as any);
  const id = resolvedParams?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCollaborative, setIsCollaborative] = useState(false);

  // 1. Fetch Playlist & Tracks
  const { data: playlist, isLoading } = useQuery<Playlist>({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const res = await fetch(`/api/playlists/${id}`);
      if (!res.ok) throw new Error('Playlist not found');
      return res.json();
    },
  });

  // 2. Mutations
  const updatePlaylistMutation = useMutation({
    mutationFn: async (updatedData: Partial<Playlist>) => {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_metadata', ...updatedData }),
      });
      if (!res.ok) throw new Error('Failed to update playlist');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
      setEditMode(false);
    },
  });

  const removeTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_track', trackId }),
      });
      if (!res.ok) throw new Error('Failed to remove track');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedTrackIds: string[]) => {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', orderedTrackIds }),
      });
      if (!res.ok) throw new Error('Failed to reorder tracks');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete playlist');
    },
    onSuccess: () => {
      router.push('/library');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    },
  });

  const handlePlayAll = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    playTrack(playlist.tracks[0], playlist.tracks);
  };

  const handleTrackSelect = (track: Track) => {
    if (!playlist) return;
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, playlist.tracks);
    }
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    if (!playlist) return;
    const list = [...playlist.tracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap elements
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const orderedIds = list.map((t) => t.id);
    reorderMutation.mutate(orderedIds);
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlaylistMutation.mutate({
      name,
      description,
      is_public: isPublic,
      is_collaborative: isCollaborative,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <Disc className="h-10 w-10 animate-spin text-teal-400" />
        <p className="mt-2 text-sm text-neutral-400 font-semibold">Loading playlist details...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <p className="text-neutral-400 font-semibold">Playlist not found.</p>
        <button
          onClick={() => router.push('/library')}
          className="mt-4 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2.5 text-xs font-bold text-black active:scale-95 transition-all shadow-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  const tracks = playlist.tracks || [];

  return (
    <div className="space-y-8 text-white pb-12 text-left">
      {/* Back Button Navigation */}
      <div className="flex items-center space-x-2 text-neutral-450 hover:text-white cursor-pointer transition-colors" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Back</span>
      </div>

      {/* Playlist Meta Banner */}
      {!editMode ? (
        <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-neutral-900 pb-8">
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl bg-neutral-900 shadow-xl flex-shrink-0">
            {playlist.coverUrl ? (
              <Image
                src={playlist.coverUrl}
                alt={playlist.name}
                fill
                sizes="144px"
                priority
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                <svg
                  className="h-16 w-16 text-neutral-600"
                  fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                </svg>
              </div>
            )}
          </div>
          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="flex items-center justify-center md:justify-start space-x-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">Playlist</span>
              {playlist.is_public ? (
                <span title="Public Playlist"><Globe className="h-3.5 w-3.5 text-neutral-400" /></span>
              ) : (
                <span title="Private Playlist"><Lock className="h-3.5 w-3.5 text-neutral-400" /></span>
              )}
              {playlist.is_collaborative && (
                <span className="flex items-center space-x-1 rounded bg-teal-500/10 px-1.5 py-0.5 text-[8px] font-bold text-teal-400 border border-teal-500/20 uppercase tracking-wide">
                  <Users className="h-2.5 w-2.5" />
                  <span>Collab</span>
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl bg-gradient-to-r from-white to-neutral-350 bg-clip-text text-transparent">
              {playlist.name}
            </h1>
            <p className="text-sm text-neutral-400 max-w-xl font-medium leading-relaxed">
              {playlist.description || 'No description provided.'}
            </p>
            <p className="text-xs text-neutral-500 font-semibold">
              {tracks.length} songs • Created by {playlist.user_id ? 'You' : 'Collaborator'}
            </p>
            
            {/* Action Row buttons */}
            <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {tracks.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="flex items-center space-x-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-350 hover:to-emerald-450 px-6 py-2.5 text-xs font-extrabold text-black active:scale-95 transition-all shadow-lg shadow-teal-500/10"
                >
                  <Play className="h-4.5 w-4.5 fill-black stroke-black" />
                  <span>Play</span>
                </button>
              )}
              <button
                onClick={() => {
                  setName(playlist.name);
                  setDescription(playlist.description || '');
                  setIsPublic(playlist.is_public);
                  setIsCollaborative(playlist.is_collaborative);
                  setEditMode(true);
                }}
                className="flex items-center space-x-2 rounded-full bg-neutral-900 border border-neutral-800 px-5 py-2.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-850 transition-all"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Info</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this playlist? This action is irreversible.')) {
                    deletePlaylistMutation.mutate();
                  }
                }}
                className="rounded-full bg-red-950/20 border border-red-500/30 px-5 py-2.5 text-xs font-bold text-red-400 hover:bg-red-900/35 transition-colors"
              >
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Playlist Metadata Form */
        <form onSubmit={handleSaveMetadata} className="glass-panel rounded-2xl p-6 max-w-xl space-y-6 border border-neutral-900/50">
          <h2 className="text-lg font-bold tracking-tight">Edit Playlist Details</h2>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Playlist Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-neutral-900/60 border border-neutral-850 px-4.5 py-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 rounded-xl bg-neutral-900/60 border border-neutral-850 px-4.5 py-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all resize-none"
            />
          </div>
          <div className="flex space-x-6 pt-1">
            <label className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-950 text-teal-450 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-semibold text-xs uppercase tracking-wide">Public Playlist</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-950 text-teal-450 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-semibold text-xs uppercase tracking-wide">Collaborative Ready</span>
            </label>
          </div>
          <div className="flex space-x-3 pt-5 border-t border-neutral-900/80">
            <button
              type="submit"
              disabled={updatePlaylistMutation.isPending}
              className="rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2.5 text-xs font-bold text-black active:scale-95 shadow-md transition-all disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-full bg-neutral-900 border border-neutral-800 px-6 py-2.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-850 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Playlist Tracks List Table */}
      {tracks.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-400 p-8 max-w-lg mx-auto shadow-inner relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-teal-500/5 to-violet-500/5 opacity-50 blur-xl" />
          <div className="relative space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-teal-400 shadow-[0_0_15px_rgba(20,250,200,0.1)]">
              <Music className="h-6 w-6 fill-none stroke-teal-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">This playlist has no songs yet</h3>
              <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-normal font-medium">
                Find songs to build your personalized vibe.
              </p>
            </div>
            <button
              onClick={() => router.push('/search')}
              className="rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2 text-xs font-bold text-black active:scale-95 transition-all shadow-md"
            >
              Find Songs to Add
            </button>
          </div>
        </div>
      ) : (
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
                <th className="py-3 px-2 w-20 text-center">Position</th>
                <th className="py-3 pr-4 w-16 text-center">Remove</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <tr
                    key={`${track.id}-${idx}`}
                    onClick={() => handleTrackSelect(track)}
                    className={`group cursor-pointer border-b border-neutral-950 transition-colors hover:bg-neutral-900/40 ${
                      isCurrent ? 'bg-neutral-900/10' : ''
                    }`}
                  >
                    {/* Index / Play indicator */}
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

                    {/* Album Art & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3.5 truncate">
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
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
                          <p className={`truncate text-sm font-bold ${isCurrent ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,240,200,0.35)] animate-pulse' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Album Column */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs text-neutral-400 font-semibold truncate">
                      {track.album?.name || 'Single'}
                    </td>

                    {/* Duration Column */}
                    <td className="py-3.5 px-4 text-center text-xs font-bold font-mono text-neutral-400">
                      {formatDuration(track.durationMs)}
                    </td>

                    {/* Position Reordering controls */}
                    <td className="py-3.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveTrack(idx, 'up')}
                          className="text-neutral-500 hover:text-white disabled:opacity-20 p-1"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          disabled={idx === tracks.length - 1}
                          onClick={() => moveTrack(idx, 'down')}
                          className="text-neutral-500 hover:text-white disabled:opacity-20 p-1"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* Delete Action button */}
                    <td className="py-3.5 pr-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeTrackMutation.mutate(track.id)}
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
