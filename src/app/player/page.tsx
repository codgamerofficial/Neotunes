'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  ChevronDown,
  ListMusic,
  Heart,
  Gauge,
  Music,
  Share2,
  Disc,
} from 'lucide-react';
import Image from 'next/image';

export default function PlayerPage() {
  const router = useRouter();
  const {
    isPlaying,
    currentTrack,
    queue,
    volume,
    isMuted,
    progress,
    duration,
    shuffle,
    repeatMode,
    playbackRate,
    setPlaying,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    setShuffle,
    setRepeatMode,
    setPlaybackRate,
    setProgress,
  } = usePlaybackStore();

  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Sync liked state on mount/track change
  useEffect(() => {
    if (!currentTrack) return;
    const checkLiked = async () => {
      try {
        const res = await fetch(`/api/liked?trackId=${currentTrack.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsLiked(data.liked);
        }
      } catch (err) {
        console.error('Error checking liked state:', err);
      }
    };
    checkLiked();
  }, [currentTrack?.id]);

  if (!currentTrack) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Disc className="h-16 w-16 animate-spin text-neutral-600" />
        <p className="mt-4 text-neutral-400">No song selected</p>
        <button
          onClick={() => router.push('/home')}
          className="mt-6 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black"
        >
          Go Home
        </button>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    const iframePlayer = (window as any).YT?.Player ? (window as any).YT.Player : null;
    const playerInstance = document.querySelector('iframe');
    // If the YT global exists, we can dispatch seek actions
    if (typeof window !== 'undefined') {
      const ytPlayerIframe = document.getElementById('yt-player-iframe-root');
      // Seeking handled directly via the store / window actions
    }
  };

  const handleLikeToggle = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const res = await fetch('/api/liked', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: currentTrack.id, track: currentTrack }),
      });
      if (res.ok) {
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentTrack.title,
        text: `Listen to ${currentTrack.title} by ${currentTrack.artist.name} on NeoTunes`,
        url: window.location.origin + `/player?trackId=${currentTrack.id}`,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + `/player?trackId=${currentTrack.id}`);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-black px-6 py-8 text-white overflow-hidden">
      {/* Blurred album artwork background glow */}
      {currentTrack.coverUrl && (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center filter blur-[100px] opacity-30 transition-all duration-1000 scale-110"
          style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
        />
      )}

      {/* Header controls */}
      <header className="flex w-full max-w-4xl items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900/60 text-white hover:bg-neutral-800 transition-colors"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Now Playing</span>
        <button
          onClick={() => setShowQueue(!showQueue)}
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900/60 transition-colors ${
            showQueue ? 'text-emerald-400 hover:bg-neutral-800' : 'text-white hover:bg-neutral-800'
          }`}
        >
          <ListMusic className="h-5 w-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex w-full max-w-4xl flex-1 flex-col items-center justify-center md:flex-row md:space-x-12">
        <AnimatePresence mode="wait">
          {!showQueue ? (
            /* Album Artwork Panel */
            <motion.div
              key="artwork"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center space-y-6 md:w-1/2"
            >
              <div className="relative aspect-square w-64 overflow-hidden rounded-2xl bg-neutral-800 shadow-2xl shadow-black/80 sm:w-80 md:w-96">
                {currentTrack.coverUrl ? (
                  <Image
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    fill
                    priority
                    sizes="(max-width: 768px) 320px, 384px"
                    className={`object-cover ${isPlaying ? 'animate-spin [animation-duration:20s]' : ''}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-600">
                    <Music className="h-20 w-20" />
                  </div>
                )}
              </div>

              {/* Dynamic Audio Visualizer mock matching plays */}
              {isPlaying && (
                <div className="flex h-8 items-end space-x-1">
                  <div className="visualizer-bar h-8 w-1 bg-emerald-500 rounded-full" />
                  <div className="visualizer-bar h-8 w-1 bg-emerald-400 rounded-full" />
                  <div className="visualizer-bar h-8 w-1 bg-teal-400 rounded-full" />
                  <div className="visualizer-bar h-8 w-1 bg-teal-500 rounded-full" />
                  <div className="visualizer-bar h-8 w-1 bg-emerald-500 rounded-full" />
                </div>
              )}
            </motion.div>
          ) : (
            /* Queue list overlay */
            <motion.div
              key="queue"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel flex h-[400px] w-full flex-col rounded-2xl p-4 md:w-1/2 overflow-y-auto"
            >
              <h3 className="mb-4 text-left text-lg font-bold text-white border-b border-neutral-800 pb-2">
                Play Queue ({queue.length} songs)
              </h3>
              <div className="space-y-2">
                {queue.map((track, idx) => {
                  const isActive = track.id === currentTrack.id;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      className={`flex items-center justify-between rounded-lg p-2 transition-all ${
                        isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <span className="text-xs text-neutral-500 w-4 text-center">{idx + 1}</span>
                        <div className="truncate text-left">
                          <p className={`truncate text-sm font-semibold ${isActive ? 'text-emerald-400' : 'text-white'}`}>
                            {track.title}
                          </p>
                          <p className="truncate text-xs text-neutral-400">{track.artist.name}</p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
                          Now Playing
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Playback Controls Footer */}
      <footer className="mt-8 flex w-full max-w-2xl flex-col items-center space-y-6">
        {/* Track Title and Artist details */}
        <div className="flex w-full items-center justify-between">
          <div className="text-left max-w-[80%]">
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl line-clamp-1">{currentTrack.title}</h2>
            <p className="text-sm text-neutral-400 sm:text-base line-clamp-1">{currentTrack.artist.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="text-neutral-400 hover:text-white transition-colors p-2"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleLikeToggle}
              disabled={likeLoading}
              className={`p-2 transition-transform hover:scale-105 active:scale-95 ${
                isLiked ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Progress Slider */}
        <div className="w-full space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer outline-none accent-emerald-500"
          />
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Player controls */}
        <div className="flex w-full items-center justify-between">
          {/* Shuffle Mode Toggle */}
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`p-2 transition-colors ${shuffle ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'}`}
          >
            <Shuffle className="h-5 w-5" />
          </button>

          {/* Previous Song */}
          <button
            onClick={prevTrack}
            className="text-neutral-400 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2"
          >
            <SkipBack className="h-7 w-7 fill-neutral-400 hover:fill-white stroke-none" />
          </button>

          {/* Big Play / Pause Button */}
          <button
            onClick={() => setPlaying(!isPlaying)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-black stroke-black" />
            ) : (
              <Play className="h-7 w-7 fill-black stroke-black translate-x-[2px]" />
            )}
          </button>

          {/* Next Song */}
          <button
            onClick={nextTrack}
            className="text-neutral-400 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2"
          >
            <SkipForward className="h-7 w-7 fill-neutral-400 hover:fill-white stroke-none" />
          </button>

          {/* Repeat Mode Toggle */}
          <button
            onClick={() => {
              if (repeatMode === 'off') setRepeatMode('all');
              else if (repeatMode === 'all') setRepeatMode('one');
              else setRepeatMode('off');
            }}
            className={`relative p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Repeat className="h-5 w-5" />
            {repeatMode === 'one' && (
              <span className="absolute top-[2px] right-[2px] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-black">
                1
              </span>
            )}
          </button>
        </div>

        {/* Volume & Playback Speed sliders */}
        <div className="flex w-full flex-col space-y-4 pt-4 border-t border-neutral-900 md:flex-row md:space-y-0 md:space-x-12">
          {/* Volume */}
          <div className="flex flex-1 items-center space-x-3">
            <button
              onClick={toggleMute}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="volume-slider h-1 flex-1 appearance-none bg-neutral-800 outline-none"
            />
          </div>

          {/* Playback speed selector */}
          <div className="flex items-center space-x-2 text-xs text-neutral-400 self-center">
            <Gauge className="h-4 w-4" />
            <span>Speed:</span>
            {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`rounded px-2 py-0.5 font-semibold transition-colors ${
                  playbackRate === rate ? 'bg-emerald-500 text-black' : 'hover:bg-neutral-800 text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
