'use client';

import React, { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaybackStore } from '@/store/playback-store';
import { useRouter } from 'next/navigation';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
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
  Plus,
  Search,
  Sparkles,
  Check,
  Loader2
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

  // Recommendations search state
  const [recommendQuery, setRecommendQuery] = useState('');
  const [activeRecommendSearch, setActiveRecommendSearch] = useState('');

  // 1. Fetch Playlist & Tracks
  const { data: playlist, isLoading } = useQuery<Playlist>({
    queryKey: ['playlist', id],
    queryFn: async () => {
      const res = await fetch(`/api/playlists/${id}`);
      if (!res.ok) throw new Error('Playlist not found');
      return res.json();
    },
  });

  // 2. Fetch Recommended Songs Search Results
  const { data: recommendResults, isFetching: isSearchingRecommends } = useQuery<{ songs: Track[] }>({
    queryKey: ['playlist-recommends-search', activeRecommendSearch],
    queryFn: async () => {
      if (!activeRecommendSearch) {
        // Fetch generic recommendations
        const res = await fetch(`/api/search?q=hits`);
        if (!res.ok) return { songs: [] };
        return res.json();
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(activeRecommendSearch)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: true,
  });

  // Mutations
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

  const addTrackMutation = useMutation({
    mutationFn: async (track: Track) => {
      const res = await fetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_track', track }),
      });
      if (!res.ok) throw new Error('Failed to add track');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist', id] });
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

  const handleRecommendSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveRecommendSearch(recommendQuery);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <Disc className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="mt-2 text-sm text-neutral-450 font-semibold">Loading playlist details...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-white">
        <p className="text-neutral-400 font-semibold">Playlist not found.</p>
        <button
          onClick={() => router.push('/library')}
          className="mt-4 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 px-6 py-2.5 text-xs font-black text-black active:scale-95 transition-all shadow-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  const tracks = playlist.tracks || [];
  const recommendList = recommendResults?.songs || [];

  return (
    <div className="space-y-8 text-white pb-20 text-left select-none relative w-full">
      {/* Back Button Navigation */}
      <div className="flex items-center space-x-2 text-neutral-450 hover:text-white cursor-pointer transition-colors" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Back</span>
      </div>

      {/* Playlist Meta Banner */}
      {!editMode ? (
        <div className="flex flex-col items-center space-y-4 md:flex-row md:space-y-0 md:space-x-6 border-b border-white/[0.04] pb-8">
          <div className="relative h-36 w-36 overflow-hidden rounded-2xl bg-neutral-900 shadow-xl flex-shrink-0 border border-white/[0.06]">
            <ImageWithFallback
              src={playlist.coverUrl || ''}
              alt={playlist.name}
              fill
              sizes="144px"
              priority
              className="object-cover"
            />
          </div>
          <div className="text-center md:text-left space-y-2 flex-1">
            <div className="flex items-center justify-center md:justify-start space-x-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">Playlist</span>
              {playlist.is_public ? (
                <span title="Public Playlist"><Globe className="h-3.5 w-3.5 text-neutral-500" /></span>
              ) : (
                <span title="Private Playlist"><Lock className="h-3.5 w-3.5 text-neutral-500" /></span>
              )}
              {playlist.is_collaborative && (
                <span className="flex items-center space-x-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold text-purple-400 border border-purple-500/20 uppercase tracking-wide">
                  <Users className="h-2.5 w-2.5" />
                  <span>Collab</span>
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              {playlist.name}
            </h1>
            <p className="text-sm text-neutral-400 max-w-xl font-semibold leading-relaxed">
              {playlist.description || 'No description provided.'}
            </p>
            <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
              {tracks.length} songs • Created by {playlist.user_id ? 'You' : 'Collaborator'}
            </p>
            
            {/* Action Row buttons */}
            <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {tracks.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-6 py-2.5 text-xs font-black text-black active:scale-95 transition-all shadow-lg"
                >
                  <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />
                  <span>Play Playlist</span>
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
                className="flex items-center space-x-2 rounded-xl bg-neutral-900 border border-white/[0.08] px-5 py-2.5 text-xs font-black text-neutral-300 hover:text-white hover:bg-neutral-850 transition-all"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Details</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this playlist? This action is irreversible.')) {
                    deletePlaylistMutation.mutate();
                  }
                }}
                className="rounded-xl bg-red-950/20 border border-red-500/35 px-5 py-2.5 text-xs font-black text-red-400 hover:bg-red-900/35 transition-colors"
              >
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Playlist Metadata Form */
        <form onSubmit={handleSaveMetadata} className="glass-panel rounded-2xl p-6 max-w-xl space-y-6 border border-white/[0.08] bg-[#0c0c0c]/80 backdrop-blur-xl">
          <h2 className="text-md font-black tracking-tight">Edit Playlist Details</h2>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Playlist Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-neutral-900/60 border border-white/[0.08] px-4.5 py-3.5 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 rounded-xl bg-neutral-900/60 border border-white/[0.08] px-4.5 py-3.5 text-sm text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all resize-none"
            />
          </div>
          <div className="flex space-x-6 pt-1">
            <label className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-white/[0.08] bg-neutral-950 text-cyan-400 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-black text-xs uppercase tracking-wide">Public Playlist</span>
            </label>
            <label className="flex items-center space-x-2 text-sm text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="rounded border-white/[0.08] bg-neutral-950 text-cyan-400 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-black text-xs uppercase tracking-wide">Collaborative Ready</span>
            </label>
          </div>
          <div className="flex space-x-3 pt-5 border-t border-white/[0.08]">
            <button
              type="submit"
              disabled={updatePlaylistMutation.isPending}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 px-6 py-2.5 text-xs font-black text-black active:scale-95 shadow-md transition-all disabled:opacity-50"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="rounded-xl bg-neutral-900 border border-white/[0.08] px-6 py-2.5 text-xs font-black text-neutral-300 hover:text-white hover:bg-neutral-850 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Playlist Tracks List Table */}
      {tracks.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.08] bg-neutral-950/20 text-neutral-450 p-8 max-w-lg mx-auto shadow-inner relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-50 blur-xl" />
          <div className="relative space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-white/[0.08] text-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.1)]">
              <Music className="h-6 w-6 fill-none stroke-cyan-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">This playlist has no songs yet</h3>
              <p className="text-xs text-neutral-450 max-w-xs mx-auto leading-normal font-semibold">
                Use the search tool below to find songs and add them instantly!
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.04] text-xs font-black uppercase tracking-wider text-neutral-500">
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
                    className={`group cursor-pointer border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${
                      isCurrent ? 'bg-cyan-500/5' : ''
                    }`}
                  >
                    {/* Index / Play indicator */}
                    <td className="py-3.5 pl-4 text-center text-sm font-bold text-neutral-550">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <button className="hidden group-hover:inline-block">
                        {isCurrent && isPlaying ? (
                          <Pause className="h-4 w-4 text-cyan-400 fill-cyan-400 stroke-none" />
                        ) : (
                          <Play className="h-4 w-4 text-cyan-400 fill-cyan-400 stroke-none translate-x-[0.5px]" />
                        )}
                      </button>
                    </td>

                    {/* Album Art & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3.5 truncate">
                        <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-white/[0.05]">
                          <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="44px" />
                        </div>
                        <div className="truncate text-left">
                          <p className={`truncate text-sm font-bold ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.35)]' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-neutral-450 font-semibold mt-0.5">{track.artist.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* Album Column */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs text-neutral-450 font-semibold truncate">
                      {track.album?.name || 'Single'}
                    </td>

                    {/* Duration Column */}
                    <td className="py-3.5 px-4 text-center text-xs font-bold font-mono text-neutral-450">
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
                          <ChevronUp className="h-4.5 w-4.5" />
                        </button>
                        <button
                          disabled={idx === tracks.length - 1}
                          onClick={() => moveTrack(idx, 'down')}
                          className="text-neutral-500 hover:text-white disabled:opacity-20 p-1"
                        >
                          <ChevronDown className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>

                    {/* Delete Action button */}
                    <td className="py-3.5 pr-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeTrackMutation.mutate(track.id)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors p-2"
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

      {/* C. SPOTIFY-STYLE TRACK RECOMMENDATION ENGINE */}
      <section className="pt-8 border-t border-white/[0.04] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="space-y-1">
            <h3 className="text-md font-black uppercase tracking-wider text-cyan-405 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5" />
              <span>Recommended Songs</span>
            </h3>
            <p className="text-xs text-neutral-450 font-semibold leading-normal">
              Based on the vibe of this playlist. Find and add more matching songs.
            </p>
          </div>

          <form onSubmit={handleRecommendSearchSubmit} className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-white/[0.08] px-3.5 py-2 max-w-xs w-full focus-within:border-cyan-400/50 transition-colors">
            <Search className="h-4 w-4 text-neutral-500" />
            <input 
              type="text"
              placeholder="Search more songs..."
              className="bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none flex-1"
              value={recommendQuery}
              onChange={e => setRecommendQuery(e.target.value)}
            />
          </form>
        </div>

        {isSearchingRecommends ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-3.5">
            {recommendList.slice(0, 5).map((recTrack) => {
              const alreadyAdded = tracks.some(t => t.id === recTrack.id);
              
              return (
                <div
                  key={recTrack.id}
                  className="flex items-center justify-between rounded-2xl p-3 border border-white/[0.03] bg-neutral-900/10 hover:bg-neutral-850"
                >
                  <div className="flex items-center space-x-3.5 truncate">
                    <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.05] flex-shrink-0">
                      <ImageWithFallback src={recTrack.coverUrl || ''} alt={recTrack.title} fill sizes="44px" />
                    </div>
                    <div className="truncate text-left">
                      <p className="truncate text-xs font-bold text-white leading-normal">{recTrack.title}</p>
                      <p className="truncate text-[10px] text-neutral-455 font-semibold leading-normal mt-0.5">{recTrack.artist.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!alreadyAdded) {
                        addTrackMutation.mutate(recTrack);
                      }
                    }}
                    disabled={alreadyAdded}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                      alreadyAdded 
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                        : 'border-white/[0.08] hover:border-cyan-400 text-neutral-450 hover:text-cyan-400 bg-neutral-950'
                    }`}
                  >
                    {alreadyAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4.5 w-4.5" />}
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
