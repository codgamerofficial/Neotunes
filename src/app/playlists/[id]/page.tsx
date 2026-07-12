'use client';

import React, { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
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
        <Disc className="h-10 w-10 animate-spin text-emerald-500" />
        <p className="mt-2 text-sm text-neutral-400">Loading playlist details...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <p className="text-neutral-400">Playlist not found.</p>
        <button
          onClick={() => router.push('/library')}
          className="mt-4 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black"
        >
          Go Back
        </button>
      </div>
    );
  }

  const tracks = playlist.tracks || [];

  return (
    <div className="space-y-8 text-white">
      {/* Dynamic Header */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-400">Back</span>
      </div>

      {/* Playlist Meta Banner */}
      {!editMode ? (
        <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-neutral-900 pb-8">
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl bg-neutral-800 shadow-xl border border-neutral-700">
            {playlist.coverUrl ? (
              <Image src={playlist.coverUrl} alt={playlist.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-600 bg-gradient-to-tr from-neutral-900 to-neutral-800">
                <Disc className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="flex items-center justify-center md:justify-start space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Playlist</span>
              {playlist.is_public ? (
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-neutral-400" />
              )}
              {playlist.is_collaborative && <Users className="h-3.5 w-3.5 text-emerald-400" />}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{playlist.name}</h1>
            <p className="text-sm text-neutral-400 max-w-xl">
              {playlist.description || 'No description provided.'}
            </p>
            <p className="text-xs text-neutral-500">
              {tracks.length} songs • Created by {playlist.user_id ? 'You' : 'Collaborator'}
            </p>
            <div className="mt-4 flex items-center justify-center md:justify-start space-x-3">
              {tracks.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="flex items-center space-x-2 rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95"
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
                className="flex items-center space-x-2 rounded-full bg-neutral-900 border border-neutral-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Info</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this playlist? This action is irreversible.')) {
                    deletePlaylistMutation.mutate();
                  }
                }}
                className="rounded-full bg-red-950/20 border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/35 transition-colors"
              >
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Playlist Metadata Metadata Form */
        <form onSubmit={handleSaveMetadata} className="glass-panel rounded-2xl p-6 max-w-xl space-y-4">
          <h2 className="text-lg font-bold">Edit Playlist Details</h2>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block">Playlist Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 text-white resize-none"
            />
          </div>
          <div className="flex space-x-6 pt-2">
            <label className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-950 text-emerald-500"
              />
              <span>Public Playlist</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="rounded border-neutral-800 bg-neutral-950 text-emerald-500"
              />
              <span>Collaborative Ready</span>
            </label>
          </div>
          <div className="flex space-x-3 pt-4 border-t border-neutral-900">
            <button
              type="submit"
              disabled={updatePlaylistMutation.isPending}
              className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-full bg-neutral-900 border border-neutral-800 px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Playlist Tracks list table */}
      {tracks.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/20">
          <p className="text-sm text-neutral-500">This playlist has no songs yet</p>
          <button
            onClick={() => router.push('/search')}
            className="mt-4 rounded-full bg-neutral-900 border border-neutral-800 px-4 py-2 text-xs font-semibold"
          >
            Find Songs to Add
          </button>
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
                <th className="py-3 px-2 w-20 text-center">Position</th>
                <th className="py-3 pr-4 w-16 text-center">Actions</th>
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
                      isCurrent ? 'bg-neutral-900/20' : ''
                    }`}
                  >
                    {/* Index / Play Icon */}
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

                    {/* Position Reordering Controls */}
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

                    {/* Delete Column */}
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
