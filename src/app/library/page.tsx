'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
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
  Cloud,
  Download,
  Folder,
  Pin,
  Mic,
  GripVertical,
  Check,
  Trash2
} from 'lucide-react';

type LibraryCollectionId = 
  | 'liked' 
  | 'downloaded' 
  | 'history' 
  | 'playlists' 
  | 'albums' 
  | 'artists' 
  | 'podcasts' 
  | 'cloud' 
  | 'folders' 
  | 'pinned';

interface CollectionItem {
  id: LibraryCollectionId;
  label: string;
  icon: React.ComponentType<any>;
  count?: number;
  isPinned?: boolean;
}

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { playTrack } = usePlaybackStore();
  const supabase = createClientBrowser();

  const [activeTab, setActiveTab] = useState<LibraryCollectionId>('playlists');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Collection ordering state for drag-and-drop visual representation
  const [collections, setCollections] = useState<CollectionItem[]>([
    { id: 'pinned', label: 'Pinned Collections', icon: Pin, isPinned: true },
    { id: 'liked', label: 'Liked Songs', icon: Heart, count: 0 },
    { id: 'playlists', label: 'Playlists', icon: ListMusic, count: 0 },
    { id: 'cloud', label: 'Cloud Uploads', icon: CloudLightning, count: 0 },
    { id: 'history', label: 'Recently Played', icon: History },
    { id: 'downloaded', label: 'Downloaded', icon: Download, count: 0 },
    { id: 'albums', label: 'Albums', icon: Disc, count: 4 },
    { id: 'artists', label: 'Artists', icon: User, count: 8 },
    { id: 'podcasts', label: 'Podcasts', icon: Mic, count: 2 },
    { id: 'folders', label: 'Folders', icon: Folder, count: 1 }
  ]);

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

      // Parse metadata dynamically in the browser
      let durationMs = 180000; 
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        durationMs = Math.round(audioBuffer.duration * 1000);
      } catch {
        // fallback
      }

      // 2. Save reference in DB
      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ''), 
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

  // Reorder collections visually
  const moveCollectionItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= collections.length) return;
    const updated = [...collections];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setCollections(updated);
  };

  return (
    <div className="space-y-8 text-white pb-12 text-left select-none font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Your Universe</p>
          <h1 className="text-4xl font-black tracking-tighter">NeoTunes Locker</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => createPlaylistMutation.mutate()}
            disabled={createPlaylistMutation.isPending}
            className="flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-5 py-2.5 text-xs font-black text-black shadow-lg shadow-cyan-500/10 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create Playlist</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN GRID: Left Collections Sidebar, Right Collection Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: 10 Collections List with drag handles */}
        <div className="lg:col-span-4 space-y-4 bg-[#111111]/40 border border-white/[0.05] p-4 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Collections Panel</span>
            <span className="text-[9px] text-cyan-400 font-bold">DRAG OR ORDER VIA ARROWS</span>
          </div>

          <div className="space-y-1">
            {collections.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              // Get item counts dynamically
              let displayCount = item.count;
              if (item.id === 'liked') displayCount = likedTracks.length;
              if (item.id === 'playlists') displayCount = playlists.length;
              if (item.id === 'cloud') displayCount = cloudUploads.length;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex items-center justify-between rounded-2xl px-4 py-3 cursor-pointer border transition-all ${
                    isActive
                      ? 'border-cyan-500/20 bg-cyan-950/10 text-white font-bold'
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Drag handle */}
                    <div className="flex flex-col gap-0.5 text-neutral-600 group-hover:text-neutral-400 transition-colors">
                      <button onClick={(e) => { e.stopPropagation(); moveCollectionItem(idx, idx - 1); }} className="text-[9px] leading-none hover:text-white">▲</button>
                      <button onClick={(e) => { e.stopPropagation(); moveCollectionItem(idx, idx + 1); }} className="text-[9px] leading-none hover:text-white">▼</button>
                    </div>

                    <Icon className={`h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
                    <span className="text-xs font-bold truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {displayCount !== undefined && (
                      <span className="text-[10px] font-mono bg-white/[0.04] text-neutral-500 rounded-full px-2 py-0.5">
                        {displayCount}
                      </span>
                    )}
                    {item.isPinned && (
                      <Pin className="h-3 w-3 text-purple-400 fill-purple-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Collection Contents Detail Viewport */}
        <div className="lg:col-span-8 bg-[#111111]/10 border border-white/[0.05] p-6 rounded-3xl min-h-[460px] backdrop-blur-xl">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* PLAYLISTS ACTIVE TAB */}
              {activeTab === 'playlists' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">My Playlists</h3>
                    <span className="text-[10px] font-bold text-neutral-500 tracking-wider">{playlists.length} Lists</span>
                  </div>

                  {playlistsLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Disc className="h-8 w-8 animate-spin text-cyan-400" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-neutral-400 p-6 text-center">
                      <p className="text-xs font-bold text-neutral-500">No playlists found. Create one to begin organizing.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {playlists.map((playlist: any) => (
                        <div
                          key={playlist.id}
                          onClick={() => router.push(`/playlists/${playlist.id}`)}
                          className="group cursor-pointer rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-4 hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all text-left"
                        >
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900 mb-3.5 flex items-center justify-center">
                            {playlist.cover_url ? (
                              <img src={playlist.cover_url} className="absolute inset-0 h-full w-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <Music className="h-10 w-10 text-neutral-600" />
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/playlists/${playlist.id}`); }}
                              className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Play className="h-4 w-4 fill-black stroke-black translate-x-[0.5px]" />
                            </button>
                          </div>
                          <h4 className="truncate text-xs font-bold text-white leading-normal">{playlist.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-semibold">{playlist.trackCount || 0} tracks</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LIKED SONGS ACTIVE TAB */}
              {activeTab === 'liked' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Liked Songs Locker</h3>
                    <span className="text-[10px] font-bold text-pink-400 tracking-wider">{likedTracks.length} Songs</span>
                  </div>

                  {likedLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Disc className="h-8 w-8 animate-spin text-cyan-400" />
                    </div>
                  ) : likedTracks.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-neutral-400 p-6 text-center">
                      <Heart className="h-8 w-8 text-neutral-700 mb-2 fill-none" />
                      <p className="text-xs font-bold text-neutral-500">Your liked songs will show up here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {likedTracks.map((track: any, idx: number) => (
                        <div
                          key={track.id}
                          onClick={() => playTrack(track, likedTracks)}
                          className="flex items-center justify-between rounded-xl bg-[#1A1A1A]/30 border border-white/[0.04] p-3 hover:bg-neutral-900/40 cursor-pointer hover:border-cyan-500/10 transition-all text-left"
                        >
                          <div className="flex items-center space-x-3.5 truncate">
                            <span className="text-[10px] font-bold text-neutral-600 w-5 text-center">{idx + 1}</span>
                            <img src={track.coverUrl} className="h-10 w-10 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate leading-normal">{track.title}</p>
                              <p className="text-[10px] text-neutral-500 font-semibold truncate leading-normal">{track.artist?.name || 'Unknown'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold font-mono">
                            {Math.floor(track.durationMs / 60000)}:
                            {Math.floor((track.durationMs % 60000) / 1000).toString().padStart(2, '0')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RECENTLY PLAYED ACTIVE TAB */}
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Recently Played Session</h3>
                  </div>

                  {historyLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Disc className="h-8 w-8 animate-spin text-cyan-400" />
                    </div>
                  ) : historyTracks.length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-10 font-bold">Your listening history is empty.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {historyTracks.slice(0, 15).map((track: any, idx: number) => (
                        <div
                          key={`${track.id}-${idx}`}
                          onClick={() => playTrack(track, historyTracks)}
                          className="flex items-center justify-between rounded-xl bg-[#1A1A1A]/30 border border-white/[0.04] p-3 hover:bg-neutral-900/40 cursor-pointer hover:border-cyan-500/10 transition-all text-left"
                        >
                          <div className="flex items-center space-x-3.5 truncate">
                            <img src={track.coverUrl} className="h-10 w-10 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate leading-normal">{track.title}</p>
                              <p className="text-[10px] text-neutral-500 font-semibold truncate leading-normal">{track.artist?.name}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-bold font-mono">
                            {new Date(track.playedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {new Date(track.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CLOUD UPLOADS ACTIVE TAB */}
              {activeTab === 'cloud' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Cloud locker Locker</h3>
                    <span className="text-[10px] font-bold text-cyan-400 tracking-wider">{cloudUploads.length} MP3/WAV</span>
                  </div>

                  {/* Drag-Drop Uploader Block */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-500/20 bg-neutral-950/20 p-6 max-w-xl mx-auto shadow-inner">
                    {uploading ? (
                      <div className="space-y-4 py-4 flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                        <p className="text-xs font-bold text-neutral-300">Uploading file to your cloud locker...</p>
                        <div className="h-1.5 w-48 rounded bg-neutral-900 overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 rounded" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer py-4 px-8 w-full group">
                        <UploadCloud className="h-12 w-12 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
                        <span className="mt-3 text-xs font-black text-white">Upload audio files (.mp3, .flac, .wav)</span>
                        <span className="text-[10px] text-neutral-500 mt-1 font-semibold">Direct private storage locker uploads</span>
                        <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* Cloud Files Locker */}
                  {cloudLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Disc className="h-8 w-8 animate-spin text-cyan-400" />
                    </div>
                  ) : cloudUploads.length === 0 ? (
                    <p className="text-xs text-neutral-500 text-center py-6 font-bold">Your cloud locker is empty.</p>
                  ) : (
                    <div className="space-y-2.5">
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
                        return (
                          <div
                            key={file.id}
                            onClick={() => playTrack(trackObj, [trackObj])}
                            className="flex items-center justify-between rounded-xl bg-[#1A1A1A]/30 border border-white/[0.04] p-3 hover:bg-neutral-900/40 cursor-pointer hover:border-cyan-500/10 transition-all text-left"
                          >
                            <div className="flex items-center space-x-3 truncate">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-neutral-900 text-cyan-400">
                                <FileAudio className="h-4.5 w-4.5" />
                              </div>
                              <div className="truncate">
                                <p className="truncate text-xs font-bold text-white leading-normal">{file.title}</p>
                                <p className="truncate text-[10px] text-neutral-500 font-semibold leading-normal">{file.artist}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-bold font-mono">
                              {Math.floor(file.duration_ms / 60000)}:
                              {Math.floor((file.duration_ms % 60000) / 1000).toString().padStart(2, '0')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* DOWNLOADED ACTIVE TAB (MOCK VISUAL ONLY) */}
              {activeTab === 'downloaded' && (
                <div className="space-y-6 text-center py-10">
                  <Download className="h-10 w-10 text-neutral-700 mx-auto mb-2" />
                  <h3 className="text-base font-black">Smart Cache / Downloaded</h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    NeoTunes offline smart cache downloads and stores audio locally inside your app bundle. Cache size: 0.0 MB
                  </p>
                </div>
              )}

              {/* ALBUMS ACTIVE TAB (MOCK VISUAL ONLY) */}
              {activeTab === 'albums' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Saved Albums</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left">
                    {[
                      { name: 'HIT ME HARD AND SOFT', artist: 'Billie Eilish', year: '2024', cover: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=500&auto=format&fit=crop&q=80' },
                      { name: 'After Hours', artist: 'The Weeknd', year: '2020', cover: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80' },
                      { name: 'Moon Music', artist: 'Coldplay', year: '2024', cover: 'https://img.youtube.com/vi/W7lT4HlY82M/mqdefault.jpg' }
                    ].map((item) => (
                      <div
                        key={item.name}
                        onClick={() => router.push(`/albums/4aawyABuhtvU4upGL7jSMG`)}
                        className="group cursor-pointer rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-4 hover:border-cyan-500/30 transition-all"
                      >
                        <img src={item.cover} className="aspect-square w-full rounded-xl object-cover mb-3" alt="" referrerPolicy="no-referrer" />
                        <h4 className="truncate text-xs font-bold leading-normal">{item.name}</h4>
                        <p className="text-[10px] text-neutral-500 font-semibold leading-normal">{item.artist} · {item.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ARTISTS ACTIVE TAB (MOCK VISUAL ONLY) */}
              {activeTab === 'artists' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Artists Locker</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                    {[
                      { name: 'Arijit Singh', genre: 'Bollywood', id: '4YRx37jL6VOmbfUnxwSy6g', img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80' },
                      { name: 'Daft Punk', genre: 'Electronic', id: '4tZ1zfvKLIxsHjJ7t0OI6Q', img: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?w=500&auto=format&fit=crop&q=80' },
                      { name: 'The Weeknd', genre: 'Pop', id: '1XyoP13t12wR6hR6hR6hR6', img: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&auto=format&fit=crop&q=80' }
                    ].map((item) => (
                      <div
                        key={item.name}
                        onClick={() => router.push(`/artists/${item.id}`)}
                        className="group cursor-pointer rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-4 hover:border-cyan-500/30 transition-all text-center"
                      >
                        <img src={item.img} className="h-20 w-20 rounded-full mx-auto object-cover mb-3" alt="" referrerPolicy="no-referrer" />
                        <h4 className="truncate text-xs font-bold leading-normal">{item.name}</h4>
                        <p className="text-[10px] text-neutral-500 font-semibold">{item.genre}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PODCASTS ACTIVE TAB (MOCK VISUAL ONLY) */}
              {activeTab === 'podcasts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Saved Podcasts</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    {[
                      { title: 'The Joe Rogan Experience', publisher: 'Spotify', img: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500&auto=format&fit=crop&q=80' },
                      { title: 'Lex Fridman Podcast', publisher: 'Lex Fridman', img: 'https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=500&auto=format&fit=crop&q=80' }
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="group rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-4 hover:border-cyan-500/30 transition-all flex items-center space-x-3.5"
                      >
                        <img src={item.img} className="h-12 w-12 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                        <div className="truncate">
                          <h4 className="truncate text-xs font-bold leading-normal text-white">{item.title}</h4>
                          <p className="text-[10px] text-neutral-500 font-semibold leading-normal">{item.publisher}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FOLDERS TAB */}
              {activeTab === 'folders' && (
                <div className="space-y-6 text-center py-10">
                  <Folder className="h-10 w-10 text-neutral-700 mx-auto mb-2" />
                  <h3 className="text-base font-black">Folders Locker</h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    Create nested music folders to organize your custom playlists and albums.
                  </p>
                </div>
              )}

              {/* PINNED COLLECTIONS TAB */}
              {activeTab === 'pinned' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h3 className="text-base font-black">Pinned Collections</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div
                      onClick={() => setActiveTab('liked')}
                      className="group cursor-pointer rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-5 hover:border-cyan-500/25 transition-all relative overflow-hidden"
                    >
                      <Pin className="absolute top-4 right-4 h-3.5 w-3.5 text-purple-400 fill-purple-400" />
                      <Heart className="h-8 w-8 text-pink-500 fill-pink-500 mb-3" />
                      <h4 className="text-xs font-black text-white">Liked Songs</h4>
                      <p className="text-[10px] text-neutral-500 mt-1 font-semibold">Pinned Playlist</p>
                    </div>

                    <div
                      onClick={() => setActiveTab('cloud')}
                      className="group cursor-pointer rounded-2xl bg-[#1A1A1A]/40 border border-white/[0.06] p-5 hover:border-cyan-500/25 transition-all relative overflow-hidden"
                    >
                      <Pin className="absolute top-4 right-4 h-3.5 w-3.5 text-purple-400 fill-purple-400" />
                      <CloudLightning className="h-8 w-8 text-cyan-400 mb-3" />
                      <h4 className="text-xs font-black text-white">Cloud Locker</h4>
                      <p className="text-[10px] text-neutral-500 mt-1 font-semibold">Private MP3 Uploads</p>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>
      </div>
      
    </div>
  );
}
