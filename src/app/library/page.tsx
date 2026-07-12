'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion } from 'framer-motion';
import {
  ListMusic,
  Heart,
  History,
  CloudLightning,
  Plus,
  Play,
  UploadCloud,
  FileAudio,
  Loader2,
  Disc,
  ArrowRight,
  Music,
  User,
  Activity,
  Cloud
} from 'lucide-react';

type TabType = 'playlists' | 'liked' | 'history' | 'cloud';

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { playTrack } = usePlaybackStore();
  const supabase = createClientBrowser();

  const [activeTab, setActiveTab] = useState<TabType>('playlists');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 1. Fetch Playlists
  const { data: playlistsData, isLoading: playlistsLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const res = await fetch('/api/playlists');
      if (!res.ok) throw new Error('Failed to fetch playlists');
      return res.json();
    },
  });

  // 2. Fetch Liked Tracks
  const { data: likedData, isLoading: likedLoading } = useQuery({
    queryKey: ['liked-songs'],
    queryFn: async () => {
      const res = await fetch('/api/liked');
      if (!res.ok) throw new Error('Failed to fetch liked tracks');
      return res.json();
    },
  });

  // 3. Fetch Listening History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  // 4. Fetch Cloud Uploads
  const { data: cloudData, isLoading: cloudLoading } = useQuery({
    queryKey: ['cloud-uploads'],
    queryFn: async () => {
      const res = await fetch('/api/cloud');
      if (!res.ok) throw new Error('Failed to fetch cloud uploads');
      return res.json();
    },
  });

  const playlists = playlistsData?.playlists || [];
  const likedTracks = likedData?.tracks || [];
  const historyTracks = historyData?.history || [];
  const cloudUploads = cloudData?.uploads || [];

  // Create Playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `My Playlist #${playlists.length + 1}`, description: 'Created from your library' }),
      });
      if (!res.ok) throw new Error('Failed to create playlist');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      router.push(`/playlists/${data.playlist.id}`);
    },
  });

  // Handle Cloud MP3 Uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Restrict size and audio mime types
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, M4A)');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User session not active');

      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      setUploadProgress(30);

      // 1. Upload to Supabase Storage Bucket
      const { data, error } = await supabase.storage
        .from('cloud_songs')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      setUploadProgress(70);

      // Parse metadata from Audio API dynamically in the browser!
      let durationMs = 180000; // default 3 mins fallback
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        durationMs = Math.round(audioBuffer.duration * 1000);
      } catch {
        // use default duration on decoder failures
      }

      // 2. Save file reference in NeoTunes Database via API
      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ''), // strip extension
          artist: 'My Uploads',
          album: 'Cloud Library',
          durationMs,
          filePath: fileName,
        }),
      });

      if (!res.ok) throw new Error('Failed to process upload reference');

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ['cloud-uploads'] });
    } catch (err: any) {
      alert(err.message || 'Failed to complete cloud upload');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    }
  };

  return (
    <div className="space-y-8 text-white pb-12 text-left">
      {/* Page header title with action button */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Your Library</h1>
        {activeTab === 'playlists' && (
          <button
            onClick={() => createPlaylistMutation.mutate()}
            disabled={createPlaylistMutation.isPending}
            className="flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-350 hover:to-emerald-450 px-5 py-2 text-xs font-bold text-black shadow-lg shadow-teal-500/10 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create Playlist</span>
          </button>
        )}
      </div>

      {/* Tabs list bar */}
      <div className="flex border-b border-neutral-900 overflow-x-auto scrollbar-none">
        {(
          [
            { id: 'playlists', label: 'Playlists', icon: ListMusic },
            { id: 'liked', label: 'Liked Songs', icon: Heart },
            { id: 'history', label: 'History', icon: History },
            { id: 'cloud', label: 'Cloud Uploads', icon: CloudLightning },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-5 pb-3.5 text-sm font-semibold transition-all flex-shrink-0 ${
                isActive ? 'text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="library-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-400 to-emerald-400"
                />
              )}
              <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Viewport sections */}
      <div className="pt-2">
        {/* Playlists View */}
        {activeTab === 'playlists' && (
          playlistsLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Disc className="h-8 w-8 animate-spin text-teal-400" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-400 p-6">
              <p className="font-semibold text-sm">No playlists found</p>
              <button
                onClick={() => createPlaylistMutation.mutate()}
                className="mt-4 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2 text-xs font-bold text-black active:scale-95 transition-all shadow-md shadow-teal-500/10"
              >
                Create your first playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {playlists.map((playlist: any) => (
                <div
                  key={playlist.id}
                  onClick={() => router.push(`/playlists/${playlist.id}`)}
                  className="liquid-panel liquid-interactive group cursor-pointer rounded-2xl p-4 hover:scale-[1.02] border border-neutral-900/50 hover:border-teal-500/20"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900 mb-3 shadow-md">
                    {playlist.cover_url ? (
                      <img
                        src={playlist.cover_url}
                        alt={playlist.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                        <svg
                          className="h-10 w-10 text-neutral-600"
                          fill="none" viewBox="0 0 24 24"
                          stroke="currentColor" strokeWidth={1.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                        </svg>
                      </div>
                    )}
                    <button
                      className="absolute bottom-2.5 right-2.5 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-black opacity-0 shadow-lg shadow-teal-500/20 transition-all group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 active:scale-95 duration-300 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/playlists/${playlist.id}`);
                      }}
                    >
                      <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[1px]" />
                    </button>
                  </div>
                  <h3 className="truncate text-sm font-bold text-white text-left">{playlist.name}</h3>
                  <div className="flex items-center space-x-2.5 mt-0.5">
                    <span className="text-[10px] text-neutral-400 font-semibold">{playlist.trackCount || 0} tracks</span>
                    <span className="text-[10px] text-teal-500 font-extrabold uppercase tracking-wide">Created by You</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Liked Songs Tab */}
        {activeTab === 'liked' && (
          likedLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Disc className="h-8 w-8 animate-spin text-teal-400" />
            </div>
          ) : likedTracks.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-400 p-8 max-w-lg mx-auto shadow-inner relative overflow-hidden group">
              <div className="absolute -inset-px bg-gradient-to-br from-pink-500/5 to-purple-500/5 opacity-50 blur-xl" />
              <div className="relative space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
                  <Heart className="h-6 w-6 fill-pink-500 stroke-pink-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white tracking-tight">You haven&apos;t liked any songs yet</h3>
                  <p className="text-sm text-neutral-400 max-w-xs mx-auto text-center leading-normal font-medium">
                    Songs you like on Home or Search will appear here for easy playback.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/search')}
                  className="rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 px-6 py-2 text-xs font-bold text-black active:scale-95 transition-all shadow-md shadow-teal-500/10"
                >
                  Find songs to like
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => router.push('/liked')}
              className="glass-panel max-w-md cursor-pointer rounded-2xl p-5 flex items-center justify-between hover:border-teal-500/20 hover:bg-neutral-900/40 border border-neutral-900/50 transition-colors shadow-lg shadow-black/10 group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/15">
                  <Heart className="h-7 w-7 fill-white stroke-none" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-white tracking-tight">Liked Songs</h3>
                  <p className="text-xs text-neutral-400 font-semibold">{likedTracks.length} tracks</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-500 group-hover:text-teal-400 transition-colors" />
            </div>
          )
        )}

        {/* Recently Played History */}
        {activeTab === 'history' && (
          historyLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Disc className="h-8 w-8 animate-spin text-teal-400" />
            </div>
          ) : historyTracks.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-400 p-6">
              <p className="font-semibold text-sm">Your listening history will appear here once you play music.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-w-3xl relative pl-4 border-l border-neutral-900 ml-2">
              {historyTracks.slice(0, 15).map((track: any, idx: number) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track, historyTracks)}
                  className="flex items-center justify-between rounded-xl p-2.5 hover:bg-neutral-900/40 cursor-pointer group border border-transparent hover:border-teal-500/15 transition-all"
                >
                  <div className="flex items-center space-x-3.5 truncate">
                    {/* Timestamp Dot */}
                    <div className="absolute left-[7.5px] h-2.5 w-2.5 rounded-full bg-neutral-800 border-2 border-black group-hover:bg-teal-400 transition-colors" />
                    
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-neutral-900 flex-shrink-0">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
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
                    <div className="truncate text-left">
                      <p className="truncate text-sm font-bold text-white group-hover:text-teal-400 transition-colors">{track.title}</p>
                      <p className="truncate text-xs text-neutral-400 font-semibold">{track.artist.name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-bold font-mono">
                    {new Date(track.playedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                    {new Date(track.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Cloud Uploads Panel */}
        {activeTab === 'cloud' && (
          <div className="space-y-8">
            {/* Uploader Block */}
            <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-6 border border-dashed border-teal-500/15 bg-neutral-950/10 max-w-xl mx-auto shadow-[0_0_20px_rgba(20,250,200,0.02)]">
              {uploading ? (
                <div className="space-y-4 py-4 flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
                  <p className="text-sm font-bold text-neutral-300">Uploading to Cloud Storage...</p>
                  <div className="h-1.5 w-48 rounded bg-neutral-900 overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300 rounded" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer py-4 px-8 w-full group">
                  <UploadCloud className="h-12 w-12 text-neutral-500 group-hover:text-teal-400 transition-colors drop-shadow-[0_0_10px_rgba(0,0,0,0.4)]" />
                  <span className="mt-3 text-sm font-bold text-white">Upload audio files (.mp3, .wav, .m4a)</span>
                  <span className="text-xs text-neutral-500 mt-1 font-medium">Direct private storage bucket upload</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Cloud Files Listing */}
            {cloudLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Disc className="h-8 w-8 animate-spin text-teal-400" />
              </div>
            ) : cloudUploads.length === 0 ? (
              <div className="text-center text-sm text-neutral-400 py-10 font-medium">
                No files uploaded to your cloud locker yet. Upload some files above.
              </div>
            ) : (
              <div className="space-y-2.5 max-w-3xl mx-auto">
                <h3 className="text-left font-bold text-neutral-400 text-xs uppercase tracking-wider mb-4 flex items-center space-x-2">
                  <Cloud className="h-4.5 w-4.5 text-teal-400" />
                  <span>Your Cloud locker ({cloudUploads.length} files)</span>
                </h3>
                {cloudUploads.map((file: any) => {
                  const trackObj = {
                    id: `cloud_${new Date(file.created_at).getTime()}`, 
                    title: file.title,
                    artist: { name: file.artist },
                    album: { name: file.album || 'Single' },
                    durationMs: file.duration_ms,
                    sourceType: 'cloud' as const,
                    sourceId: file.file_path,
                  };

                  const isAvailable = file.status === 'processed' || !file.status;
                  const isFailed = file.status === 'failed';
                  const isPending = file.status === 'pending';

                  return (
                    <div
                      key={file.id}
                      onClick={() => isAvailable && playTrack(trackObj, [trackObj])}
                      className={`flex items-center justify-between rounded-xl p-3 border border-neutral-900/50 bg-neutral-950/20 transition-all ${
                        isAvailable ? 'hover:bg-neutral-900/40 cursor-pointer hover:border-teal-500/15' : 'opacity-70 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-neutral-900 text-teal-400 shadow-inner">
                          <FileAudio className="h-5 w-5" />
                        </div>
                        <div className="truncate text-left">
                          <p className="truncate text-sm font-bold text-white">{file.title}</p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="truncate text-xs text-neutral-450 font-semibold">{file.artist}</span>
                            <span className="text-neutral-600">•</span>
                            <span className="text-[9px] font-bold font-mono text-neutral-500">
                              {new Date(file.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {/* Status tag */}
                        {isPending && (
                          <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[8px] font-bold text-teal-400 uppercase tracking-wide shadow-sm animate-pulse">
                            Analyzing
                          </span>
                        )}
                        {isFailed && (
                          <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[8px] font-bold text-red-400 uppercase tracking-wide shadow-sm">
                            Failed
                          </span>
                        )}
                        {isAvailable && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[8px] font-bold text-emerald-400 uppercase tracking-wide shadow-sm">
                            Available
                          </span>
                        )}
                        
                        <span className="text-xs text-neutral-450 font-bold font-mono">
                          {Math.floor(file.duration_ms / 60000)}:
                          {Math.floor((file.duration_ms % 60000) / 1000)
                            .toString()
                            .padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
