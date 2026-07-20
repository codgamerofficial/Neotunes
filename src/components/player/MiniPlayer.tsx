'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePlaybackStore } from '@/store/playback-store';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  Disc,
  Heart,
  Shuffle,
  Repeat,
  ListMusic,
  Sliders,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutStore } from '@/store/layout-store';
import { getCampaignState } from '@/lib/campaignManager';

export default function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isRightPanelOpen, toggleRightPanel } = useLayoutStore();
  const {
    isPlaying,
    currentTrack,
    volume,
    isMuted,
    progress,
    duration,
    shuffle,
    repeatMode,
    setPlaying,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    setShuffle,
    setRepeatMode,
    setProgress,
  } = usePlaybackStore();

  const [campaignState, setCampaignState] = useState<any>(null);
  useEffect(() => {
    setCampaignState(getCampaignState());
    const interval = setInterval(() => {
      setCampaignState(getCampaignState());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const waveformRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!waveformRef.current) return;
    const canvas = waveformRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw bouncing audio-wave bars
      const barWidth = 3;
      const gap = 2;
      const count = Math.floor(w / (barWidth + gap));
      ctx.fillStyle = 'rgba(0, 245, 255, 0.45)';

      for (let i = 0; i < count; i++) {
        const energy = isPlaying ? 1.0 : 0.15;
        const amplitude = h * 0.7 * energy;
        const barHeight = 2 + Math.max(0, Math.sin(phase + i * 0.15) * amplitude * (Math.random() * 0.4 + 0.8));
        const x = i * (barWidth + gap);
        const y = h - barHeight;

        ctx.fillRect(x, y, barWidth, barHeight);
      }

      phase += isPlaying ? 0.08 : 0.005;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Fetch like status of the current track
  const { data: likedData, refetch: refetchLike } = useQuery({
    queryKey: ['liked-status', currentTrack?.id],
    queryFn: async () => {
      if (!currentTrack?.id) return { liked: false };
      const res = await fetch(`/api/liked?trackId=${currentTrack.id}`);
      if (!res.ok) return { liked: false };
      return res.json();
    },
    enabled: !!currentTrack?.id,
  });

  // Don't render MiniPlayer on auth page, landing page, or full player page
  if (!currentTrack || pathname === '/auth' || pathname === '/' || pathname === '/player') {
    return null;
  }

  const isLiked = likedData?.liked || false;

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTrack) return;
    const method = isLiked ? 'DELETE' : 'POST';
    try {
      const res = await fetch('/api/liked', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: currentTrack.id, track: currentTrack }),
      });
      if (res.ok) {
        refetchLike();
        queryClient.invalidateQueries({ queryKey: ['liked-tracks'] });
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaying(!isPlaying);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    nextTrack();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    prevTrack();
  };

  const handleShuffleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShuffle(!shuffle);
  };

  const handleRepeatToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    let nextMode: 'off' | 'all' | 'one' = 'off';
    if (repeatMode === 'off') nextMode = 'all';
    else if (repeatMode === 'all') nextMode = 'one';
    setRepeatMode(nextMode);
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setProgress(value);
    window.dispatchEvent(new CustomEvent('seek-track', { detail: { time: value } }));
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      onClick={() => router.push('/player')}
      className="fixed bottom-[88px] left-4 right-4 md:bottom-0 md:left-0 md:right-0 z-45 md:z-50 flex h-20 cursor-pointer items-center justify-between px-4 md:px-6 rounded-2xl md:rounded-none border border-white/[0.06] md:border-t md:border-none bg-[#0E111A]/90 md:bg-neutral-950/75 backdrop-blur-2xl transition-all duration-300 shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
    >
      {/* 1. LEFT COLUMN: Artwork, Title, Artist, Like Action */}
      <div className="flex items-center space-x-3 w-full min-w-0 md:w-[30%]">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
          {currentTrack.coverUrl ? (
            <Image
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
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
        <div className="flex-1 min-w-0 text-left">
          <h4 className="truncate text-sm font-bold text-white hover:underline leading-normal">
            {currentTrack.title}
          </h4>
          <p className="truncate text-xs text-neutral-400 hover:text-white leading-normal font-medium">
            {currentTrack.artist.name}
          </p>
        </div>

        {campaignState?.isActive && (
          <Link 
            href="/worldcup" 
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-black text-cyan-450 hover:bg-cyan-500/20 transition-all select-none"
            title="World Cup Final Center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="animate-bounce [animation-duration:2.5s]">⚽</span>
            <span className="hidden lg:inline uppercase text-[9px] tracking-wider font-bold">
              {campaignState.phase === 'countdown' && '12:30 AM'}
              {campaignState.phase === 'live' && '2 - 2 Live'}
              {campaignState.phase === 'champion' && 'ARG CHAMP'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          </Link>
        )}

        <button
          onClick={handleLikeToggle}
          className={`liquid-interactive flex-shrink-0 p-2 transition-colors ${
            isLiked ? 'text-cyan-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-cyan-400 stroke-cyan-400' : ''}`} />
        </button>
      </div>

      {/* 2. CENTER COLUMN: Controls & Progress Bar (Desktop Only) */}
      <div className="hidden md:flex flex-col items-center justify-center space-y-1.5 w-[40%] max-w-xl px-4">
        {/* Playback Controls Row */}
        <div className="flex items-center space-x-5">
          <button
            onClick={handleShuffleToggle}
            className={`liquid-interactive transition-colors ${
              shuffle ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]' : 'text-neutral-400 hover:text-white'
            }`}
            title="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            onClick={handlePrev}
            className="liquid-interactive text-neutral-400 hover:text-white transition-colors"
            title="Previous"
          >
            <SkipBack className="h-5 w-5 fill-neutral-400 hover:fill-white stroke-none" />
          </button>
          <button
            onClick={handlePlayPause}
            className="liquid-interactive flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black hover:scale-105 active:scale-95 shadow-md shadow-cyan-500/10"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-black stroke-black" />
            ) : (
              <Play className="h-4 w-4 fill-black stroke-black translate-x-[0.5px]" />
            )}
          </button>
          <button
            onClick={handleNext}
            className="liquid-interactive text-neutral-400 hover:text-white transition-colors"
            title="Next"
          >
            <SkipForward className="h-5 w-5 fill-neutral-400 hover:fill-white stroke-none" />
          </button>
          <button
            onClick={handleRepeatToggle}
            className={`liquid-interactive relative transition-colors ${
              repeatMode !== 'off' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]' : 'text-neutral-400 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            <Repeat className="h-4 w-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-[8px] font-extrabold text-black">
                1
              </span>
            )}
          </button>
        </div>

        {/* Active Waveform Visualizer */}
        <div className="w-full h-5 flex items-center justify-center relative overflow-hidden pointer-events-none mt-1">
          <canvas ref={waveformRef} width="350" height="20" className="w-full h-full" />
        </div>

        {/* Progress Slider Row */}
        <div className="flex items-center space-x-2.5 w-full text-[10px] font-mono text-neutral-500">
          <span className="w-8 text-right">{formatTime(progress)}</span>
          <div className="relative flex-1 h-1 flex items-center group/progress">
            {/* Track background */}
            <div className="absolute inset-0 bg-neutral-850 rounded-full" />
            {/* Active/Played progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full group-hover/progress:from-cyan-350 group-hover/progress:to-purple-400 shadow-[0_0_8px_rgba(0,245,255,0.4)]"
              style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
            />
            {/* The slider thumb, visible on hover */}
            <div
              className="absolute h-3 w-3 rounded-full bg-white opacity-0 group-hover/progress:opacity-100 shadow-md transition-opacity pointer-events-none"
              style={{
                left: `calc(${duration > 0 ? (progress / duration) * 100 : 0}% - 6px)`,
              }}
            />
            {/* Invisible range input for interaction */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={progress}
              onChange={handleSeekChange}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="w-8 text-left">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. RIGHT COLUMN: Queue, Volume, Maximize, Mobile Controls */}
      <div className="flex items-center justify-end space-x-3 w-auto md:w-[30%]">
        {/* Mobile-Only Play/Pause & Next Button */}
        <div className="flex items-center space-x-2 md:hidden">
          <button
            onClick={handlePlayPause}
            className="liquid-interactive flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black"
          >
            {isPlaying ? (
              <Pause className="h-4.5 w-4.5 fill-black stroke-black" />
            ) : (
              <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />
            )}
          </button>
          <button onClick={handleNext} className="liquid-interactive p-2 text-neutral-400 hover:text-white">
            <SkipForward className="h-5 w-5 fill-neutral-400 stroke-none" />
          </button>
        </div>

        {/* Desktop-Only Queue and Volume controls */}
        <div className="hidden md:flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/library');
            }}
            className="liquid-interactive text-neutral-400 hover:text-white transition-colors p-1"
            title="Queue / Library"
          >
            <ListMusic className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRightPanel();
            }}
            className={`liquid-interactive transition-colors p-1 ${
              isRightPanelOpen ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]' : 'text-neutral-400 hover:text-white'
            }`}
            title="Equalizer, Visualizer & Lyrics"
          >
            <Sliders className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleMute}
              className="liquid-interactive text-neutral-400 hover:text-white transition-colors p-1 flex-shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <div className="relative w-20 h-1 flex items-center group/volume">
              {/* Track background */}
              <div className="absolute inset-0 bg-neutral-850 rounded-full" />
              {/* Active volume progress */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full group-hover/volume:from-cyan-350 group-hover/volume:to-purple-400"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
              {/* Thumb, visible on hover */}
              <div
                className="absolute h-3 w-3 rounded-full bg-white opacity-0 group-hover/volume:opacity-100 shadow-md transition-opacity pointer-events-none"
                style={{
                  left: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)`,
                }}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Maximize Button (Desktop and Mobile) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push('/player');
          }}
          className="liquid-interactive text-neutral-400 hover:text-white transition-colors p-1"
          title="Fullscreen Player"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
