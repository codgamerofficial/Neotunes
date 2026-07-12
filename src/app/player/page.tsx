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
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white font-sans">
        <Disc className="h-16 w-16 animate-spin text-neutral-600" />
        <p className="mt-4 text-neutral-400 font-semibold">No song selected</p>
        <button
          type="button"
          onClick={() => router.push('/home')}
          className="mt-6 rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
        >
          Go Home
        </button>
      </div>
    );
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
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
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentTrack.title,
        text: `Listen to ${currentTrack.title} on NeoTunes`,
        url: window.location.origin + `/player?trackId=${currentTrack.id}`,
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + `/player?trackId=${currentTrack.id}`);
      alert('Link copied to clipboard!');
    }
  };

  // Thumbnail fallback helpers
  const thumbnail = currentTrack.coverUrl || (currentTrack as any).thumbnail;
  const artistName = currentTrack.artist?.name || (currentTrack as any).channelTitle || (currentTrack as any).artist || 'Unknown Artist';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between px-6 py-6 text-white overflow-hidden font-sans">
      
      {/* Background artwork ambient blur glow */}
      {thumbnail && (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center filter blur-[120px] opacity-25 scale-110 transition-all duration-1000"
          style={{ backgroundImage: `url(${thumbnail})` }}
        />
      )}

      {/* Main Single Column Container */}
      <div className="w-full max-w-[440px] flex flex-col justify-between h-full flex-1">
        
        {/* TOP BAR */}
        <header className="flex items-center justify-between w-full pb-2">
          {/* Collapse button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.05] transition-colors"
            aria-label="Minimise player"
          >
            <ChevronDown className="h-5 w-5 text-white" />
          </button>

          {/* Now Playing label with Equalizer */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-[3px] h-4">
              {[8, 14, 10, 16].map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-emerald-400"
                  style={{
                    height: `${h}px`,
                    transformOrigin: 'bottom',
                    animation: isPlaying ? `equalize 0.8s ease-in-out ${i * 0.15}s infinite alternate` : "none",
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-neutral-400">
              Now Playing
            </span>
          </div>

          {/* Queue toggle */}
          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.05] transition-colors ${
              showQueue ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'
            }`}
            aria-label="Queue"
          >
            <ListMusic className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* MIDDLE CONTENT: ALBUM ART OR QUEUE */}
        <div className="flex-1 flex flex-col justify-center my-4">
          <AnimatePresence mode="wait">
            {!showQueue ? (
              /* ALBUM ART PANEL */
              <motion.div
                key="artwork"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col justify-center px-4"
              >
                {/* Ambient glow behind art */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-emerald-500/15 blur-3xl scale-90" />

                {/* Main artwork container */}
                <div className="relative aspect-square w-full max-w-[340px] mx-auto overflow-hidden rounded-2xl">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={currentTrack.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                      <svg
                        className="h-16 w-16 text-neutral-600"
                        fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                      </svg>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* QUEUE PANEL */
              <motion.div
                key="queue"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-[340px] rounded-3xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-md overflow-hidden text-left"
              >
                <h3 className="mb-3 text-sm font-bold text-white border-b border-white/[0.05] pb-2 flex items-center justify-between">
                  <span>Play Queue</span>
                  <span className="text-xs text-neutral-500 font-semibold">{queue.length} songs</span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
                  {queue.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-neutral-500 font-semibold">
                      Queue is empty
                    </div>
                  ) : (
                    queue.map((track, idx) => {
                      const isActive = track.id === currentTrack.id;
                      const trackArtist = track.artist?.name || (track as any).channelTitle || (track as any).artist || 'Unknown';
                      return (
                        <div
                          key={`${track.id}-${idx}`}
                          onClick={() => {
                            const { playTrack } = usePlaybackStore.getState();
                            playTrack(track, queue);
                          }}
                          className={`flex items-center justify-between rounded-xl p-2.5 transition-all cursor-pointer ${
                            isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3 truncate">
                            <span className="text-[10px] text-neutral-500 font-bold w-4 text-center">{idx + 1}</span>
                            
                            {/* Queue row thumbnail */}
                            <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                              {(track.coverUrl || (track as any).thumbnail) ? (
                                <img
                                  src={track.coverUrl || (track as any).thumbnail}
                                  alt={track.title}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900">
                                  <svg
                                    className="h-4 w-4 text-neutral-600"
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
                              <p className={`truncate text-xs font-bold ${isActive ? 'text-emerald-400' : 'text-white'}`}>
                                {track.title}
                              </p>
                              <p className="truncate text-[10px] text-neutral-500 font-medium">{trackArtist}</p>
                            </div>
                          </div>
                          {isActive && (
                            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider animate-pulse">
                              Playing
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM PART: CONTROLS */}
        <div className="space-y-5">
          
          {/* TRACK INFO */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4 text-left">
              <h2 className="text-lg font-black tracking-tight text-white leading-tight line-clamp-1">
                {currentTrack.title}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-400 font-semibold line-clamp-1">
                {artistName}
              </p>
            </div>

            {/* Like + Share Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleLikeToggle}
                disabled={likeLoading}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all border border-white/[0.05] ${
                  isLiked
                    ? "bg-pink-500/10 text-pink-400 border-pink-500/20"
                    : "bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]"
                }`}
                aria-label="Like song"
              >
                <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-pink-400 stroke-pink-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.05] hover:bg-white/[0.08] transition-all"
                aria-label="Share song"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* PROGRESS BAR */}
          <div className="space-y-1.5">
            <div className="relative group">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress || 0}
                onChange={handleSeek}
                className="w-full h-1 appearance-none rounded-full cursor-pointer bg-white/[0.12] outline-none accent-emerald-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:shadow-black/40
                  [&::-webkit-slider-thumb]:opacity-100
                  [&::-webkit-slider-thumb]:transition-all"
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-neutral-500 tracking-wider">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* PLAYBACK CONTROLS ROW */}
          <div className="flex items-center justify-between px-2">
            {/* Shuffle Button */}
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`p-2 transition-colors ${shuffle ? 'text-emerald-400' : 'text-neutral-500 hover:text-white'}`}
              aria-label="Shuffle"
            >
              <Shuffle className="h-4.5 w-4.5" />
            </button>

            {/* Skip Backward Button */}
            <button
              type="button"
              onClick={prevTrack}
              className="text-neutral-400 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2"
              aria-label="Previous song"
            >
              <SkipBack className="h-6 w-6 fill-current stroke-none" />
            </button>

            {/* Big Play / Pause Button with gradient */}
            <button
              type="button"
              onClick={() => setPlaying(!isPlaying)}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-300 text-black shadow-lg shadow-teal-500/10 transition-all hover:scale-105 active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-black stroke-black" />
              ) : (
                <Play className="h-6 w-6 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>

            {/* Skip Forward Button */}
            <button
              type="button"
              onClick={nextTrack}
              className="text-neutral-400 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2"
              aria-label="Next song"
            >
              <SkipForward className="h-6 w-6 fill-current stroke-none" />
            </button>

            {/* Repeat Button */}
            <button
              type="button"
              onClick={() => {
                if (repeatMode === 'off') setRepeatMode('all');
                else if (repeatMode === 'all') setRepeatMode('one');
                else setRepeatMode('off');
              }}
              className={`relative p-2 transition-colors ${
                repeatMode !== 'off' ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'
              }`}
              aria-label="Repeat"
            >
              <Repeat className="h-4.5 w-4.5" />
              {repeatMode === 'one' && (
                <span className="absolute top-[2px] right-[2px] flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-black text-black">
                  1
                </span>
              )}
            </button>
          </div>

          {/* VOLUME & PLAYBACK SPEED CONTROL PANELS */}
          <div className="pt-4 border-t border-white/[0.05] space-y-4">
            
            {/* Volume Panel */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={toggleMute}
                className="text-neutral-500 hover:text-white transition-colors"
                aria-label="Mute toggle"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 flex-1 appearance-none bg-white/[0.12] rounded-full outline-none accent-emerald-500
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* Playback Speed Selector */}
            <div className="flex items-center justify-center space-x-2 text-[10px] text-neutral-500 font-extrabold uppercase tracking-wider">
              <Gauge className="h-3.5 w-3.5 text-neutral-500" />
              <span>Speed:</span>
              <div className="flex gap-1.5">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-normal transition-colors border ${
                      playbackRate === rate
                        ? 'bg-emerald-500 border-emerald-500 text-black shadow-md shadow-emerald-500/20'
                        : 'border-white/[0.06] hover:bg-white/[0.04] text-neutral-300'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
