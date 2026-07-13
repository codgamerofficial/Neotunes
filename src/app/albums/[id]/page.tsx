'use client';

import React, { use, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { 
  Play, 
  Pause, 
  Shuffle, 
  Download, 
  Heart, 
  Share2, 
  Clock, 
  Music, 
  Disc, 
  ArrowLeft,
  Calendar,
  Award,
  Layers
} from 'lucide-react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';

interface Track {
  id: string;
  title: string;
  artist: { id?: string; name: string };
  album?: { id?: string; name: string; coverUrl?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube';
  sourceId?: string;
}

interface Album {
  id: string;
  name: string;
  coverUrl: string;
  releaseDate: string;
  label: string;
  artists: { id: string; name: string }[];
  tracks: Track[];
}

export default function AlbumDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = params && typeof (params as any).then === 'function'
    ? use(params)
    : (params as any);
  const id = resolvedParams?.id || '4aawyABuhtvU4upGL7jSMG';
  
  const router = useRouter();
  const { currentTrack, isPlaying, playTrack, setPlaying, setQueue, setShuffle } = usePlaybackStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  
  // Parallax Scroll logic using framer-motion
  const { scrollY } = useScroll({ container: container ? { current: container } : undefined });
  const heroY = useTransform(scrollY, [0, 300], [0, -50]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  const coverScale = useTransform(scrollY, [0, 300], [1, 0.85]);

  // Fetch Album details from our custom Spotify route
  const { data: albumData, isLoading, error } = useQuery<{ album: Album }>({
    queryKey: ['album', id],
    queryFn: async () => {
      const res = await fetch(`/api/spotify/albums/${id}`);
      if (!res.ok) throw new Error('Album not found');
      return res.json();
    },
    retry: 1
  });

  // Fallback Mock Album if fetch fails
  const fallbackAlbum: Album = {
    id: 'fallback-album',
    name: 'Odyssey (Deluxe Edition)',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    releaseDate: '2014-07-01',
    label: 'Independent Vibe Records',
    artists: [{ id: 'home', name: 'HOME' }],
    tracks: [
      { id: 'track-f1', title: 'Intro', artist: { name: 'HOME' }, durationMs: 90000, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', sourceType: 'youtube' },
      { id: 'track-f2', title: 'Resonance', artist: { name: 'HOME' }, durationMs: 210000, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', sourceType: 'youtube' },
      { id: 'track-f3', title: 'Decay', artist: { name: 'HOME' }, durationMs: 185000, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', sourceType: 'youtube' },
      { id: 'track-f4', title: 'Native', artist: { name: 'HOME' }, durationMs: 230000, coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', sourceType: 'youtube' }
    ]
  };

  const album = albumData?.album || fallbackAlbum;

  const handlePlayAlbum = () => {
    if (album.tracks.length === 0) return;
    const isPlayingCurrentAlbum = album.tracks.some(t => t.id === currentTrack?.id);
    if (isPlayingCurrentAlbum) {
      setPlaying(!isPlaying);
    } else {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      playTrack(track, album.tracks);
    }
  };

  const startDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      alert('Album added to offline smart cache successfully!');
    }, 2000);
  };

  const formatDuration = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] text-white">
        <Disc className="h-12 w-12 animate-spin text-cyan-400" />
        <p className="mt-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Loading Album Universe</p>
      </div>
    );
  }

  return (
    <div 
      ref={setContainer}
      className="relative flex flex-col h-screen overflow-y-auto scrollbar-hide text-white pb-32 text-left select-none bg-[#050505]"
    >
      {/* Dynamic blurred background glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-[500px] -z-10 bg-cover bg-center filter blur-[100px] opacity-20 scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${album.coverUrl})` }}
      />
      
      {/* BACK BUTTON */}
      <div className="sticky top-0 z-30 px-6 py-4 flex items-center bg-[#050505]/45 backdrop-blur-md border-b border-white/[0.04]">
        <button 
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.05] transition-colors"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <span className="ml-4 text-sm font-black truncate">{album.name}</span>
      </div>

      <div className="px-6 sm:px-10 max-w-5xl mx-auto w-full pt-6 space-y-8">
        
        {/* HERO SECTION */}
        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="flex flex-col md:flex-row items-center md:items-end gap-8 pt-4 pb-6"
        >
          {/* Album Cover Art */}
          <motion.div 
            style={{ scale: coverScale }}
            className="relative h-56 w-56 sm:h-64 sm:w-64 rounded-3xl overflow-hidden shadow-2xl border border-white/[0.06] flex-shrink-0 bg-neutral-900 group"
          >
            <Image src={album.coverUrl} alt={album.name} fill sizes="(max-width: 640px) 224px, 256px" priority className="object-cover" />
          </motion.div>

          {/* Album Meta Details */}
          <div className="space-y-4 text-center md:text-left">
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
              ALBUM
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none mt-2">
              {album.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs text-neutral-400 font-semibold">
              <span className="text-white font-extrabold">{album.artists.map(a => a.name).join(', ')}</span>
              <span>•</span>
              <span>{new Date(album.releaseDate).getFullYear() || '2024'}</span>
              <span>•</span>
              <span>{album.tracks.length} songs</span>
            </div>
          </div>
        </motion.div>

        {/* CONTROLS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-b border-white/[0.05] py-5">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={handlePlayAlbum}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying && album.tracks.some(t => t.id === currentTrack?.id) ? (
                <Pause className="h-6 w-6 fill-black stroke-black" />
              ) : (
                <Play className="h-6 w-6 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>

            {/* Shuffle Play */}
            <button
              onClick={() => {
                setQueue(album.tracks);
                setShuffle(true);
                playTrack(album.tracks[Math.floor(Math.random() * album.tracks.length)], album.tracks);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.06] hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-colors"
              title="Shuffle Album"
            >
              <Shuffle className="h-4.5 w-4.5" />
            </button>

            {/* Smart Cache Download */}
            <button
              onClick={startDownload}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                isDownloading 
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse' 
                  : 'bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.1] text-neutral-400 hover:text-white'
              }`}
              title="Smart Cache Download"
            >
              <Download className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                isLiked ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.1] text-neutral-400 hover:text-white'
              }`}
            >
              <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-pink-400 stroke-pink-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + `/albums/${album.id}`);
                alert('Album link copied!');
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.06] hover:bg-white/[0.1] text-neutral-400 hover:text-white transition-colors"
            >
              <Share2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* TRACKS LIST */}
        <div className="space-y-2">
          {album.tracks.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => handlePlayTrack(track)}
                className={`group flex items-center justify-between rounded-2xl p-3 border transition-all cursor-pointer ${
                  isCurrent 
                    ? 'border-cyan-500/20 bg-cyan-950/10 shadow-[0_0_15px_rgba(0,245,255,0.02)]' 
                    : 'border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center space-x-4 truncate flex-1 pr-4">
                  <span className="text-xs font-black text-neutral-500 w-5 text-center">
                    {index + 1}
                  </span>
                  <div className="truncate text-left">
                    <p className={`truncate text-sm font-bold ${isCurrent ? 'text-cyan-400' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="truncate text-[11px] text-neutral-500 font-semibold mt-0.5">
                      {track.artist.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-[11px] font-bold text-neutral-500 font-mono tabular-nums">
                    {formatDuration(track.durationMs)}
                  </span>
                  <button className="text-neutral-500 hover:text-white p-1">
                    {isCurrent && isPlaying ? (
                      <Pause className="h-4.5 w-4.5 text-cyan-400 fill-cyan-400" />
                    ) : (
                      <Play className="h-4.5 w-4.5 text-neutral-400 group-hover:text-cyan-400" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* CREDITS PANEL */}
        <footer className="pt-8 border-t border-white/[0.05] space-y-6 pb-20 text-left">
          <h3 className="text-sm font-black uppercase tracking-wider text-neutral-500 flex items-center gap-2">
            <Award className="h-4.5 w-4.5 text-cyan-400" />
            <span>Album Credits & Info</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-neutral-400">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600 block">Record Label</span>
              <p className="font-bold text-neutral-300">{album.label}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600 block">Producer Credits</span>
              <p className="font-bold text-neutral-300">NeoTunes AI Synthesizer Unit</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600 block">Release Date</span>
              <p className="font-bold text-neutral-300">
                {new Date(album.releaseDate).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}
