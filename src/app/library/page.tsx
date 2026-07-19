'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumTrackCard, { Track } from '@/components/ui/PremiumTrackCard';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
    { id: 'cloud', label: 'Cloud Locker', icon: CloudLightning },
    { id: 'history', label: 'Recently Played', icon: History },
    { id: 'downloaded', label: 'Downloads Cache', icon: Download }
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
      if (c.id === 'downloaded') return { ...c, count: localOfflineUploads.length };
      return c;
    }));
  }, [playlists.length, likedTracks.length, allUploads.length, historyTracks.length, localOfflineUploads.length]);

  // Create Playlist Mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Locker Playlist #${playlists.length + 1}`, description: 'Created inside your premium Library workspace' }),
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
        setInfoMessage({ type: 'info', text: 'Saving locally in browser offline cache...' });
        setUploadProgress(50);
        
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
            artist: 'Offline Locker',
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
            artist: 'Offline Locker',
            album: 'Local Cache',
            duration_ms: 180000,
            file_path: objectUrl,
            isLocalOffline: true
          },
          ...prev
        ]);
        
        setUploadProgress(100);
        setInfoMessage({ type: 'success', text: `Saved "${title}" offline locally!` });
        return;
      }

      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      setUploadProgress(40);

      const { data: storageData, error: storageError } = await supabase.storage
        .from('cloud_songs')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (storageError) throw storageError;
      setUploadProgress(70);

      const res = await fetch('/api/cloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name.replace(/\.[^/.]+$/, ''), 
          artist: 'My Uploads',
          album: 'Cloud Locker',
          durationMs: 180000,
          filePath: fileName,
        }),
      });

      if (!res.ok) throw new Error('Could not persist upload record');

      setUploadProgress(100);
      setInfoMessage({ type: 'success', text: `Uploaded "${file.name.replace(/\.[^/.]+$/, '')}" to cloud locker!` });
      queryClient.invalidateQueries({ queryKey: ['cloud-uploads'] });
    } catch (err: any) {
      console.warn('Cloud upload failed, falling back to IndexedDB:', err);
      try {
        setInfoMessage({ type: 'info', text: 'Cloud upload issue. Falling back to local offline storage...' });
        const db = await openDB();
        const tx = db.transaction('songs', 'readwrite');
        const store = tx.objectStore('songs');
        const localId = `local_${Date.now()}`;
        const title = file.name.replace(/\.[^/.]+$/, '');
        
        await new Promise<void>((resolve, reject) => {
          const putReq = store.put({
            id: localId,
            title,
            artist: 'Offline Locker',
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
            artist: 'Offline Locker',
            album: 'Local Cache',
            duration_ms: 180000,
            file_path: objectUrl,
            isLocalOffline: true
          },
          ...prev
        ]);
        
        setUploadProgress(100);
        setInfoMessage({ type: 'success', text: `Saved "${title}" offline locally!` });
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

  // Drag and Drop playlist addition
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
      
      setInfoMessage({ type: 'success', text: `Added "${track.title}" to playlist successfully!` });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    } catch (err: any) {
      setInfoMessage({ type: 'error', text: `Drop failed: ${err.message}` });
    }
  };

  const handlePlayTrack = (track: Track, tracksList: Track[]) => {
    const mapped = tracksList.map(t => ({
      ...t,
      artist: typeof t.artist === 'string' ? { name: t.artist } : (t.artist || { name: 'Unknown' }),
      sourceType: t.sourceType || 'youtube',
      durationMs: t.durationMs || 180000
    })) as Track[];
    const target = mapped.find(t => t.id === track.id) || {
      ...track,
      artist: typeof track.artist === 'string' ? { name: track.artist } : (track.artist || { name: 'Unknown' }),
      sourceType: track.sourceType || 'youtube',
      durationMs: track.durationMs || 180000
    };
    if (currentTrack?.id === target.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(target, mapped);
    }
  };

  return (
    <div className="space-y-8 text-white pb-20 font-sans text-left select-none w-full relative">
      
      {/* 1. LIBRARY PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#2DD4FF] bg-[#2DD4FF]/10 px-3.5 py-1.5 rounded-full border border-[#2DD4FF]/20">
            <Layers className="h-3.5 w-3.5" />
            <span>NEOTUNES LOCKER</span>
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase">Your Universe Locker</h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-neutral-900/60 border border-white/[0.06] hover:border-[#2DD4FF]/40 px-5 py-3 text-xs font-black uppercase tracking-wider text-neutral-350 hover:text-white transition-all">
            <UploadCloud className="h-4.5 w-4.5" />
            <span>Upload Audio</span>
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => createPlaylistMutation.mutate()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] px-5 py-3 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#2DD4FF]/10"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3px]" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Upload/Alert banners */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`rounded-2xl p-4 text-xs font-bold border text-left ${
              infoMessage.type === 'success' ? 'bg-[#2DD4FF]/10 text-[#2DD4FF] border-[#2DD4FF]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {infoMessage.text}
          </motion.div>
        )}
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-2xl border border-[#2DD4FF]/30 bg-neutral-950/80 p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#2DD4FF]" />
              <span className="text-xs font-bold text-neutral-300">Syncing references to Cloud Bucket...</span>
            </div>
            <div className="w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#2DD4FF] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. COLLECTION STATS BLOCK */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: "Locker Space Usage", value: `${(allUploads.length * 4.2).toFixed(1)} MB`, desc: "In your active cloud" },
          { label: "Liked Tracks count", value: `${likedTracks.length} Songs`, desc: "Syncing with Spotify DNA" },
          { label: "Offline Cache size", value: `${(localOfflineUploads.length * 5).toFixed(1)} MB`, desc: `${localOfflineUploads.length} files saved` },
          { label: "Playlists Owned", value: `${playlists.length} Folders`, desc: "Interactive collections" }
        ].map((stat, i) => (
          <div key={i} className="rounded-[22px] border border-white/[0.04] bg-[#0E0E11]/80 p-5 text-left space-y-1 hover:border-[#2DD4FF]/25 transition-colors shadow-lg">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">{stat.label}</span>
            <p className="text-3xl font-black text-white">{stat.value}</p>
            <p className="text-[10px] text-neutral-400 font-semibold">{stat.desc}</p>
          </div>
        ))}
      </section>

      {/* 3. DUAL PANEL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel: Category Folder Cards (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500 border-b border-white/[0.04] pb-2">Collections</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {collections.map((col) => {
              const Icon = col.icon;
              const isActive = activeTab === col.id;
              
              return (
                <div
                  key={col.id}
                  onClick={() => setActiveTab(col.id)}
                  className={`flex items-center justify-between rounded-2xl p-4 border cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    isActive 
                      ? 'border-[#2DD4FF]/20 bg-gradient-to-r from-[#2DD4FF]/5 to-transparent' 
                      : 'border-white/[0.04] bg-[#0E0E11]/80 hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border transition-all ${
                      isActive 
                        ? 'bg-[#2DD4FF]/10 border-[#2DD4FF]/20 text-[#2DD4FF]' 
                        : 'bg-neutral-900/60 border-white/[0.04] text-neutral-400 group-hover:text-white'
                    }`}>
                      <Icon className="h-5.5 w-5.5" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-white uppercase tracking-wider block">{col.label}</span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{col.count || 0} Elements</span>
                    </div>
                  </div>

                  <span className="text-neutral-600 hover:text-white transition-colors">
                    <ArrowRight className="h-4.5 w-4.5" />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Active Collection Viewport (8 Columns) */}
        <div className="lg:col-span-8 space-y-5">
          
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-450">Active View: {activeTab.toUpperCase()}</h3>
            <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-white/[0.04]">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-[#2DD4FF] text-black shadow' : 'text-neutral-500 hover:text-white'}`} title="Grid layout"><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-[#2DD4FF] text-black shadow' : 'text-neutral-500 hover:text-white'}`} title="List layout"><List className="h-4 w-4" /></button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="min-h-[300px]"
            >
              
              {/* PLAYLISTS COLLECTION */}
              {activeTab === 'playlists' && (
                <div className="space-y-6">
                  {playlists.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <ListMusic className="h-12 w-12 text-neutral-600 mx-auto animate-pulse" />
                      <p className="text-xs font-bold text-neutral-500">Your playlist locker is empty</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {playlists.map((pl: any) => {
                        const isOver = dragOverFolderId === pl.id;
                        return (
                          <div
                            key={pl.id}
                            onDragOver={(e) => handleDragOver(e, pl.id)}
                            onDragLeave={() => setDragOverFolderId(null)}
                            onDrop={(e) => handleDrop(e, pl.id)}
                            onClick={() => router.push(`/playlists/${pl.id}`)}
                            className={`group relative rounded-3xl p-6 border cursor-pointer transition-all duration-300 text-left flex flex-col justify-between min-h-[140px] shadow-lg ${
                              isOver 
                                ? 'border-[#2DD4FF] bg-[#2DD4FF]/10 scale-102 shadow-[0_0_20px_rgba(45,212,255,0.2)]'
                                : 'border-white/[0.06] bg-[#0E0E11]/85 hover:border-[#2DD4FF]/30'
                            }`}
                          >
                            {/* Visual folder tab */}
                            <div className="absolute top-0 left-6 -translate-y-[6px] h-1.5 w-16 bg-[#0E0E11] border-t border-x border-white/[0.06] rounded-t-md" />

                            <div className="space-y-2">
                              <h4 className="text-base font-black text-white group-hover:text-[#2DD4FF] transition-colors truncate">{pl.name}</h4>
                              <p className="text-xs text-neutral-400 font-semibold line-clamp-2 leading-relaxed">{pl.description || 'Custom playlist folder'}</p>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-white/[0.04] text-[10px] text-neutral-550 font-black uppercase tracking-wider">
                              <span>Drag tracks here</span>
                              <span className="bg-neutral-900 px-2.5 py-1 rounded-xl border border-white/[0.06] text-white">Open Folder</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* LIKED TRACKS COLLECTION */}
              {activeTab === 'liked' && (
                <div className="space-y-2">
                  {likedTracks.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <Heart className="h-12 w-12 text-neutral-600 mx-auto animate-pulse" />
                      <p className="text-xs font-bold text-neutral-500 font-sans">No liked songs in locker</p>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {likedTracks.map((track: any) => (
                        <PremiumTrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, likedTracks)} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {likedTracks.map((track: any, i: number) => (
                        <PremiumTrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, likedTracks)} variant="horizontal" index={i + 1} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CLOUD WORKSPACE LOCKER */}
              {activeTab === 'cloud' && (
                <div className="space-y-2">
                  {allUploads.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <CloudLightning className="h-12 w-12 text-neutral-600 mx-auto animate-pulse" />
                      <p className="text-xs font-bold text-neutral-500 font-sans">No cloud uploads detected</p>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {allUploads.map((track) => (
                        <div key={track.id} draggable onDragStart={(e) => handleDragStart(e, track)} className="h-full">
                          <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, allUploads)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {allUploads.map((track, i) => (
                        <div key={track.id} draggable onDragStart={(e) => handleDragStart(e, track)}>
                          <PremiumTrackCard track={track} onClick={() => handlePlayTrack(track, allUploads)} variant="horizontal" index={i + 1} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* HISTORY TRACKS */}
              {activeTab === 'history' && (
                <div className="space-y-2">
                  {historyTracks.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <History className="h-12 w-12 text-neutral-600 mx-auto animate-pulse" />
                      <p className="text-xs font-bold text-neutral-500 font-sans">Recently played tracks will sync here</p>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {historyTracks.map((track: any) => (
                        <PremiumTrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, historyTracks)} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {historyTracks.map((track: any, i: number) => (
                        <PremiumTrackCard key={track.id} track={track} onClick={() => handlePlayTrack(track, historyTracks)} variant="horizontal" index={i + 1} />
                      ))}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
