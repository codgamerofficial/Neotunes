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
} from 'lucide-react';
import Image from 'next/image';

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
    <div className="space-y-8 text-white">
      {/* Page header title with action button */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Library</h1>
        {activeTab === 'playlists' && (
          <button
            onClick={() => createPlaylistMutation.mutate()}
            disabled={createPlaylistMutation.isPending}
            className="flex items-center space-x-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Create Playlist</span>
          </button>
        )}
      </div>

      {/* Tabs list bar */}
      <div className="flex border-b border-neutral-900">
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
              className={`relative flex items-center space-x-2 px-4 pb-3.5 text-sm font-semibold transition-all ${
                isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="library-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-500"
                />
              )}
              <Icon className="h-4 w-4" />
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
            <Disc className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
          ) : playlists.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-500">
              <p>No playlists found.</p>
              <button
                onClick={() => createPlaylistMutation.mutate()}
                className="mt-4 rounded-full bg-neutral-900 border border-neutral-800 px-4 py-2 text-xs font-semibold"
              >
                Create your first playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {playlists.map((playlist: any) => (
                <div
                  key={playlist.id}
                  onClick={() => router.push(`/playlists/${playlist.id}`)}
                  className="group cursor-pointer rounded-xl bg-neutral-900/40 border border-neutral-800/40 p-4 transition-all hover:bg-neutral-900 hover:scale-[1.02]"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-800 mb-3 shadow-md">
                    {playlist.cover_url ? (
                      <Image src={playlist.cover_url} alt={playlist.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-500 bg-gradient-to-tr from-neutral-900 to-neutral-800">
                        <Disc className="h-10 w-10" />
                      </div>
                    )}
                    <button
                      className="absolute bottom-2 right-2 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-emerald-500 text-black opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105 active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/playlists/${playlist.id}`);
                      }}
                    >
                      <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[1px]" />
                    </button>
                  </div>
                  <h3 className="truncate text-sm font-semibold text-white text-left">{playlist.name}</h3>
                  <p className="truncate text-xs text-neutral-400 text-left">
                    {playlist.trackCount || 0} tracks
                  </p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Liked Songs Shortcut */}
        {activeTab === 'liked' && (
          likedLoading ? (
            <Disc className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
          ) : likedTracks.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-500">
              <p>You haven&apos;t liked any songs yet.</p>
              <button
                onClick={() => router.push('/search')}
                className="mt-4 rounded-full bg-neutral-900 border border-neutral-800 px-4 py-2 text-xs font-semibold"
              >
                Find songs to like
              </button>
            </div>
          ) : (
            <div
              onClick={() => router.push('/liked')}
              className="glass-panel max-w-md cursor-pointer rounded-xl p-5 flex items-center justify-between hover:bg-neutral-900/60 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <Heart className="h-7 w-7 fill-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold">Liked Songs</h3>
                  <p className="text-xs text-neutral-400">{likedTracks.length} tracks</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-neutral-400" />
            </div>
          )
        )}

        {/* Recently Played History */}
        {activeTab === 'history' && (
          historyLoading ? (
            <Disc className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
          ) : historyTracks.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-800 bg-neutral-950/20 text-neutral-500">
              <p>Your listening history will appear here once you play music.</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl">
              {historyTracks.slice(0, 15).map((track: any, idx: number) => (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track, historyTracks)}
                  className="flex items-center justify-between rounded-lg p-2 hover:bg-neutral-900/40 cursor-pointer"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className="relative h-9 w-9 overflow-hidden rounded bg-neutral-800 flex-shrink-0">
                      {track.coverUrl ? (
                        <Image src={track.coverUrl} alt={track.title} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-neutral-600">
                          <Disc className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="truncate text-left">
                      <p className="truncate text-sm font-semibold">{track.title}</p>
                      <p className="truncate text-xs text-neutral-400">{track.artist.name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {new Date(track.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* Cloud Uploads Panel */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            {/* Uploader Block */}
            <div className="glass-panel flex flex-col items-center justify-center rounded-2xl p-6 border border-dashed border-neutral-800 bg-neutral-950/10 max-w-xl mx-auto">
              {uploading ? (
                <div className="space-y-3 py-4 flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                  <p className="text-sm font-semibold text-neutral-300">Uploading to Cloud Storage...</p>
                  <div className="h-1.5 w-48 rounded bg-neutral-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center cursor-pointer py-4 px-8 w-full group">
                  <UploadCloud className="h-12 w-12 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                  <span className="mt-3 text-sm font-semibold">Upload audio files (.mp3, .wav, .m4a)</span>
                  <span className="text-xs text-neutral-500 mt-1">Direct private storage bucket upload</span>
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
              <Disc className="h-8 w-8 animate-spin text-emerald-500 mx-auto" />
            ) : cloudUploads.length === 0 ? (
              <div className="text-center text-sm text-neutral-500">
                <p>No files uploaded to your cloud locker yet.</p>
              </div>
            ) : (
              <div className="space-y-2 max-w-3xl mx-auto">
                <h3 className="text-left font-bold text-neutral-400 text-xs uppercase tracking-wider mb-3">
                  Your Cloud locker ({cloudUploads.length} files)
                </h3>
                {cloudUploads.map((file: any) => {
                  const trackObj = {
                    id: `cloud_${new Date(file.created_at).getTime()}`, // matching ID conversion
                    title: file.title,
                    artist: { name: file.artist },
                    album: { name: file.album || 'Single' },
                    durationMs: file.duration_ms,
                    sourceType: 'cloud' as const,
                    sourceId: file.file_path,
                  };

                  return (
                    <div
                      key={file.id}
                      onClick={() => playTrack(trackObj, [trackObj])}
                      className="flex items-center justify-between rounded-lg p-2.5 hover:bg-neutral-900/40 cursor-pointer border border-neutral-900/50 bg-neutral-950/20"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-neutral-900 text-emerald-400">
                          <FileAudio className="h-5 w-5" />
                        </div>
                        <div className="truncate text-left">
                          <p className="truncate text-sm font-semibold">{file.title}</p>
                          <p className="truncate text-xs text-neutral-400">{file.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-neutral-500 font-mono">
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
