'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
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
  Trash2,
  Sparkles,
  PlayCircle,
  Clock,
  Layers,
  LayoutGrid,
  List,
  Calendar,
  AreaChart,
  Grid
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
  | 'pinned'
  | 'ai-mixes';

interface CollectionItem {
  id: LibraryCollectionId;
  label: string;
  icon: React.ComponentType<any>;
  count?: number;
  isPinned?: boolean;
}

interface Track {
  id: string;
  title: string;
  artist: { name: string; id?: string };
  album?: { id?: string; name: string; coverUrl?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window is not defined'));
    const req = window.indexedDB.open('neotunes-offline', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('songs', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const supabase = createClientBrowser();

  const [activeTab, setActiveTab] = useState<LibraryCollectionId>('playlists');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>('grid');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  
  const [localOfflineUploads, setLocalOfflineUploads] = useState<any[]>([]);
  const [infoMessage, setInfoMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  // Load offline local storage tracks on mount
  useEffect(() => {
    const loadOfflineSongs = async () => {
      try {
        const db = await openDB();
        const tx = db.transaction('songs', 'readonly');
        const store = tx.objectStore('songs');
        const req = store.getAll();
        req.onsuccess = () => {
          const songs = req.result || [];
          setLocalOfflineUploads(songs.map(s => {
            const objectUrl = URL.createObjectURL(s.blob);
            return {
              id: s.id,
              title: s.title,
              artist: s.artist,
              album: s.album,
              duration_ms: s.durationMs,
              file_path: objectUrl,
              isLocalOffline: true
            };
          }));
        };
      } catch (err) {
        console.warn('Failed to load offline songs:', err);
      }
    };
    loadOfflineSongs();
  }, []);

  // Collections list with custom visual configuration
  const [collections, setCollections] = useState<CollectionItem[]>([
    { id: 'pinned', label: 'Pinned Items', icon: Pin, isPinned: true },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'liked', label: 'Liked Songs', icon: Heart },
    { id: 'cloud', label: 'Cloud Uploads', icon: CloudLightning },
    { id: 'history', label: 'Recently Played', icon: History },
    { id: 'downloaded', label: 'Downloads', icon: Download },
    { id: 'albums', label: 'Albums', icon: Disc },
    { id: 'artists', label: 'Artists', icon: User },
    { id: 'podcasts', label: 'Podcasts', icon: Mic },
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'ai-mixes', label: 'AI Collections', icon: Sparkles }
  ]);

  // Fetch Playlists
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const res = await fetch('/api/playlists');
      if (!res.ok) throw new Error('Failed to fetch playlists');
      return res.json();
    },
  });

  // Fetch Liked Tracks
  const { data: likedData } = useQuery({
    queryKey: ['liked-songs'],
    queryFn: async () => {
      const res = await fetch('/api/liked');
      if (!res.ok) throw new Error('Failed to fetch liked tracks');
      return res.json();
    },
  });

  // Fetch Listening History
  const { data: historyData } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    },
  });

  // Fetch Cloud Uploads
  const { data: cloudData } = useQuery({
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
  const allUploads = [...localOfflineUploads, ...cloudUploads];

  // Update count indicators dynamically
  useEffect(() => {
    setCollections(prev => prev.map(c => {
      if (c.id === 'playlists') return { ...c, count: playlists.length };
      if (c.id === 'liked') return { ...c, count: likedTracks.length };
      if (c.id === 'cloud') return { ...c, count: allUploads.length };
      if (c.id === 'history') return { ...c, count: historyTracks.length };
      if (c.id === 'downloaded') return { ...c, count: 6 };
      if (c.id === 'albums') return { ...c, count: 4 };
      if (c.id === 'artists') return { ...c, count: 12 };
      if (c.id === 'podcasts') return { ...c, count: 3 };
      if (c.id === 'folders') return { ...c, count: 2 };
      if (c.id === 'ai-mixes') return { ...c, count: 5 };
      return c;
    }));
  }, [playlists.length, likedTracks.length, allUploads.length, historyTracks.length]);

  // Create Playlist Mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `AI Mix Playlist #${playlists.length + 1}`, description: 'Created inside your premium Library workspace' }),
      });
      if (!res.ok) throw new Error('Failed to create playlist');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      router.push(`/playlists/${data.playlist.id}`);
    },
  });

  // Handle Cloud Audio Uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('audio/')) {
      setInfoMessage({ type: 'error', text: 'Please upload a valid audio file.' });
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setInfoMessage(null);

    try {
      let user = null;
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch (authErr) {
        console.warn('Auth check failed:', authErr);
      }

      if (!user) {
        // Guest mode fallback - save in IndexedDB
        setInfoMessage({ type: 'info', text: 'Storing track in local offline workspace...' });
        setUploadProgress(40);
        
        const db = await openDB();
        const tx = db.transaction('songs', 'readwrite');
        const store = tx.objectStore('songs');
        const localId = `local_${Date.now()}`;
        const title = file.name.replace(/\.[^/.]+$/, '');
        
        setUploadProgress(70);
        
        await new Promise<void>((resolve, reject) => {
          const putReq = store.put({
            id: localId,
            title,
            artist: 'Offline Workspace',
            album: 'Local Cache',
            durationMs: 180000,
            blob: file
          });
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        });

        const objectUrl = URL.createObjectURL(file);
        setLocalOfflineUploads(prev => [
          {
            id: localId,
            title,
            artist: 'Offline Workspace',
            album: 'Local Cache',
            duration_ms: 180000,
            file_path: objectUrl,
            isLocalOffline: true
          },
          ...prev
        ]);
        
        setUploadProgress(100);
        setInfoMessage({ type: 'success', text: `Successfully saved "${title}" locally!` });
        return;
      }

      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      setUploadProgress(40);

      const { data: storageData, error: storageError } = await supabase.storage
        .from('cloud_songs')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (storageError) throw storageError;
      setUploadProgress(70);

      // Save upload reference
      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ''), 
          artist: 'My Uploads',
          album: 'Cloud Workspace',
          durationMs: 180000,
          filePath: fileName,
        }),
      });

      if (!res.ok) throw new Error('Could not persist upload record');

      setUploadProgress(100);
      setInfoMessage({ type: 'success', text: `Successfully uploaded "${file.name.replace(/\.[^/.]+$/, '')}" to cloud!` });
      queryClient.invalidateQueries({ queryKey: ['cloud-uploads'] });
    } catch (err: any) {
      console.warn('Cloud upload failed, falling back to local storage:', err);
      try {
        setInfoMessage({ type: 'info', text: 'Cloud upload failed. Storing track locally instead...' });
        const db = await openDB();
        const tx = db.transaction('songs', 'readwrite');
        const store = tx.objectStore('songs');
        const localId = `local_${Date.now()}`;
        const title = file.name.replace(/\.[^/.]+$/, '');
        
        await new Promise<void>((resolve, reject) => {
          const putReq = store.put({
            id: localId,
            title,
            artist: 'Offline Workspace',
            album: 'Local Cache',
            durationMs: 180000,
            blob: file
          });
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        });

        const objectUrl = URL.createObjectURL(file);
        setLocalOfflineUploads(prev => [
          {
            id: localId,
            title,
            artist: 'Offline Workspace',
            album: 'Local Cache',
            duration_ms: 180000,
            file_path: objectUrl,
            isLocalOffline: true
          },
          ...prev
        ]);
        
        setUploadProgress(100);
        setInfoMessage({ type: 'success', text: `Successfully saved "${title}" locally!` });
      } catch (fallbackErr: any) {
        setInfoMessage({ type: 'error', text: `Upload failed: ${err.message}` });
      }
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 3000);
    }
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, track: Track) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(track));
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDrop = async (e: React.DragEvent, targetPlaylistId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    try {
      const trackData = e.dataTransfer.getData('text/plain');
      if (!trackData) return;
      const track = JSON.parse(trackData) as Track;
      
      const res = await fetch(`/api/playlists/${targetPlaylistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_track', track }),
      });
      if (!res.ok) throw new Error('Failed to drop track');
      
      alert(`Successfully added "${track.title}" to your playlist!`);
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    } catch (err: any) {
      alert(`Could not drop track: ${err.message}`);
    }
  };

  const handlePlayTrack = (track: Track, tracksList: Track[]) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, tracksList);
      
      // Log to database listening history
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, track }),
      }).catch((err) => console.warn('Failed to log history:', err));
    }
  };

  return (
    <div className="space-y-8 text-white pb-20 font-sans text-left select-none w-full relative">
      
      {/* 1. LIBRARY PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            <Layers className="h-3 w-3" />
            <span>Workspace</span>
          </p>
          <h1 className="text-4xl font-black tracking-tight">Your Library</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* File input trigger */}
          <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-neutral-900/60 border border-white/[0.08] hover:border-cyan-400/40 px-4 py-2.5 text-xs font-black transition-all">
            <UploadCloud className="h-4 w-4" />
            <span>Upload Track</span>
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => createPlaylistMutation.mutate()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-5 py-2.5 text-xs font-black text-black shadow-md"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* INFO/SUCCESS MESSAGE BANNER */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`rounded-2xl p-4 text-xs font-black border transition-all ${
              infoMessage.type === 'success'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : infoMessage.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}
          >
            {infoMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPLOAD STATUS PANEL */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-2xl border border-cyan-500/30 bg-neutral-950/80 p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              <span className="text-xs font-bold text-neutral-300">Uploading track references to cloud bucket...</span>
            </div>
            <div className="w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. COLLECTION ANALYTICS BLOCK */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: "Total Music Listening", value: "48.2 Hours", desc: "Across 242 plays" },
          { label: "Liked Songs", value: `${likedTracks.length} Tracks`, desc: "In local library" },
          { label: "Offline Cache", value: "2.4 GB", desc: "6 downloaded tracks" },
          { label: "User Playlists", value: `${playlists.length} Playlists`, desc: "Active collections" }
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.05] bg-gradient-to-br from-neutral-900/30 to-neutral-950/20 p-5 text-left space-y-1">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">{stat.label}</span>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-[10px] text-neutral-450 font-semibold">{stat.desc}</p>
          </div>
        ))}
      </section>

      {/* 3. DUAL-PANEL WORKSPACE CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT PANEL: COLLECTIONS NAV */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Collections</h3>
          <div className="flex flex-col gap-1">
            {collections.map((col) => {
              const Icon = col.icon;
              const isActive = activeTab === col.id;
              
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex items-center justify-between rounded-xl px-4.5 py-3 text-xs font-black uppercase tracking-wider transition-all border ${
                    isActive 
                      ? 'bg-gradient-to-r from-cyan-500/10 via-purple-600/10 to-transparent border-cyan-500/35 text-cyan-400' 
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{col.label}</span>
                  </div>
                  {col.count !== undefined && (
                    <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">
                      {col.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL: MAIN VIEWPORT */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* VIEWPORT CONTROLS */}
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
            <h2 className="text-lg font-black text-white">
              {collections.find(c => c.id === activeTab)?.label}
            </h2>

            <div className="flex items-center gap-1 bg-[#111]/60 p-0.5 border border-white/[0.06] rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-neutral-800 text-cyan-400' : 'text-neutral-550 hover:text-white'}`}
                title="Grid View"
              >
                <LayoutGrid className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-neutral-800 text-cyan-400' : 'text-neutral-550 hover:text-white'}`}
                title="List View"
              >
                <List className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-neutral-800 text-cyan-400' : 'text-neutral-550 hover:text-white'}`}
                title="Timeline View"
              >
                <Calendar className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* DYNAMIC LIST/GRID CONTENT */}
          <div className="min-h-[300px]">
            
            {/* PLAYLISTS COLLECTION */}
            {activeTab === 'playlists' && (
              playlists.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/[0.08] p-12 text-center text-sm text-neutral-500">
                  You haven't created any playlists yet. Click "New Playlist" to start.
                </div>
              ) : (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {playlists.map((playlist: any) => (
                      <div
                        key={playlist.id}
                        onClick={() => router.push(`/playlists/${playlist.id}`)}
                        onDragOver={(e) => handleDragOver(e, playlist.id)}
                        onDrop={(e) => handleDrop(e, playlist.id)}
                        className={`group relative rounded-2xl border bg-neutral-900/20 p-5 cursor-pointer hover:scale-102 transition-all text-left ${
                          dragOverFolderId === playlist.id ? 'border-cyan-400 bg-cyan-950/10' : 'border-white/[0.04] hover:border-cyan-500/20'
                        }`}
                      >
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.06] mb-3.5 flex items-center justify-center">
                          <Music className="h-10 w-10 text-neutral-600 group-hover:text-cyan-400 transition-colors" />
                        </div>
                        <h4 className="text-xs font-extrabold text-white truncate group-hover:text-cyan-400 transition-colors leading-tight">
                          {playlist.name}
                        </h4>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-1.5">
                          Playlist · {playlist.description || 'Personal Mix'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {playlists.map((playlist: any) => (
                      <div
                        key={playlist.id}
                        onClick={() => router.push(`/playlists/${playlist.id}`)}
                        onDragOver={(e) => handleDragOver(e, playlist.id)}
                        onDrop={(e) => handleDrop(e, playlist.id)}
                        className={`flex items-center justify-between rounded-xl p-3 border transition-colors cursor-pointer ${
                          dragOverFolderId === playlist.id ? 'border-cyan-400 bg-cyan-950/10' : 'border-white/[0.04] bg-neutral-900/10 hover:bg-neutral-850'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 truncate">
                          <Music className="h-4.5 w-4.5 text-neutral-500" />
                          <p className="text-xs font-bold text-white truncate">{playlist.name}</p>
                        </div>
                        <ChevronRightIcon className="h-4 w-4 text-neutral-650" />
                      </div>
                    ))}
                  </div>
                )
              )
            )}

            {/* LIKED SONGS COLLECTION */}
            {activeTab === 'liked' && (
              likedTracks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/[0.08] p-12 text-center text-sm text-neutral-500">
                  No liked songs found. Hit the heart on any track to save it here!
                </div>
              ) : (
                <div className="space-y-3">
                  {likedTracks.map((track: Track, idx: number) => {
                    const isCurrent = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, track)}
                        onClick={() => handlePlayTrack(track, likedTracks)}
                        className={`group relative flex items-center justify-between rounded-2xl p-3 border transition-all cursor-grab active:cursor-grabbing ${
                          isCurrent 
                            ? 'border-cyan-500/30 bg-cyan-950/10' 
                            : 'border-white/[0.04] bg-neutral-900/15 hover:bg-[#1A1A1A]/40'
                        }`}
                      >
                        <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                          <span className="text-xs font-black text-neutral-500 w-5 text-center">{idx + 1}</span>
                          <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-950 border border-white/[0.06]">
                            <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="44px" />
                          </div>
                          <div className="truncate text-left">
                            <p className={`truncate text-sm font-bold ${isCurrent ? 'text-cyan-400' : 'text-white'}`}>
                              {track.title}
                            </p>
                            <p className="truncate text-xs text-neutral-405 font-semibold mt-0.5">{track.artist?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handlePlayTrack(track, likedTracks)} className="h-8.5 w-8.5 rounded-full bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-neutral-400 hover:text-cyan-400">
                            <Play className="h-3.5 w-3.5 fill-current translate-x-[0.5px]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* CLOUD UPLOADS */}
            {activeTab === 'cloud' && (
              allUploads.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/[0.08] p-12 text-center text-sm text-neutral-500">
                  Drag and drop local MP3/audio files to back up your tracks to the cloud database.
                </div>
              ) : (
                <div className="space-y-3">
                  {allUploads.map((upload: any) => {
                    const trackObj: Track = {
                      id: upload.isLocalOffline ? upload.id : `cloud_${upload.id}`,
                      title: upload.title,
                      artist: { name: upload.artist || 'My Uploads' },
                      durationMs: upload.duration_ms || 180000,
                      sourceType: 'cloud',
                      sourceId: upload.file_path,
                    };
                    const isCurrent = currentTrack?.id === trackObj.id;
                    return (
                      <div
                        key={upload.id}
                        onClick={() => handlePlayTrack(trackObj, [trackObj])}
                        className={`group relative flex items-center justify-between rounded-2xl p-3 border transition-colors cursor-pointer ${
                          isCurrent ? 'border-cyan-500/35 bg-cyan-950/10' : 'border-white/[0.04] bg-neutral-900/15 hover:bg-neutral-850'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 truncate">
                          <FileAudio className="h-5 w-5 text-cyan-400" />
                          <div className="truncate text-left">
                            <p className="text-xs font-bold text-white truncate">{upload.title}</p>
                            <p className="text-[10px] text-neutral-500 font-semibold truncate mt-0.5">
                              {upload.isLocalOffline ? 'Offline Guest Locker' : 'Cloud Storage Audio File'}
                            </p>
                          </div>
                        </div>
                        <PlayCircle className="h-5 w-5 text-neutral-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* RECENTLY PLAYED HISTORY / TIMELINE VIEW */}
            {activeTab === 'history' && (
              historyTracks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/[0.08] p-12 text-center text-sm text-neutral-500">
                  Your listening history will display here. Play some tracks first!
                </div>
              ) : (
                viewMode === 'timeline' ? (
                  <div className="relative border-l border-white/[0.08] ml-4 pl-6 space-y-6 text-left">
                    {historyTracks.slice(0, 8).map((track: Track, i: number) => (
                      <div key={i} className="relative">
                        {/* Dot indicator on timeline */}
                        <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-cyan-400 border border-neutral-950 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
                        </div>
                        <div className="space-y-1 bg-neutral-900/10 border border-white/[0.03] p-3.5 rounded-xl">
                          <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">Today, 2 hours ago</p>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 relative rounded overflow-hidden flex-shrink-0 bg-neutral-950 border border-white/[0.04]">
                              <ImageWithFallback src={track.coverUrl || ''} alt={track.title} fill sizes="36px" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white leading-normal hover:text-cyan-400 cursor-pointer" onClick={() => handlePlayTrack(track, historyTracks)}>{track.title}</p>
                              <p className="text-[10px] text-neutral-455 font-semibold leading-normal">{track.artist?.name}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyTracks.map((track: Track, idx: number) => (
                      <div
                        key={track.id}
                        onClick={() => handlePlayTrack(track, historyTracks)}
                        className="group flex items-center justify-between rounded-xl bg-neutral-900/10 p-3 border border-white/[0.04] hover:bg-neutral-850 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5 truncate">
                          <Clock className="h-4.5 w-4.5 text-neutral-500" />
                          <div className="truncate text-left">
                            <p className="text-xs font-bold text-white truncate">{track.title}</p>
                            <p className="text-[10px] text-neutral-500 font-semibold truncate mt-0.5">{track.artist?.name}</p>
                          </div>
                        </div>
                        <Play className="h-4 w-4 text-neutral-500 group-hover:text-cyan-400" />
                      </div>
                    ))}
                  </div>
                )
              )
            )}

            {/* MOCK AI COLLECTIONS */}
            {activeTab === 'ai-mixes' && (
              <div className="space-y-4 text-left">
                <p className="text-xs text-neutral-400 font-semibold leading-normal">
                  Our system synthesizes real-time behavior mixes based on your listening habits and mood tags.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { title: "Lofi Focus Beats", tags: "Coding · Ambient", bg: "from-cyan-500/10 to-transparent border-cyan-500/20" },
                    { title: "Late Night Drive Synth", tags: "Retro · Synthwave", bg: "from-purple-500/10 to-transparent border-purple-500/20" },
                    { title: "Acoustic Rain Moods", tags: "Calm · Acoustic", bg: "from-teal-500/10 to-transparent border-teal-500/20" },
                    { title: "Gym & Workout Booster", tags: "High Tempo · Bass Boosted", bg: "from-rose-500/10 to-transparent border-rose-500/20" }
                  ].map(mix => (
                    <div
                      key={mix.title}
                      onClick={() => alert(`Generating fresh tracks for "${mix.title}" mix...`)}
                      className={`p-5 rounded-2xl border bg-gradient-to-br ${mix.bg} hover:scale-102 transition-transform cursor-pointer space-y-2`}
                    >
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                      <h4 className="text-sm font-black text-white">{mix.title}</h4>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{mix.tags}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/255/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
