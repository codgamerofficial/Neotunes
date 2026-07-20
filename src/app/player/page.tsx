'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
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
  Sparkles,
  Sliders,
  AlignLeft,
  Volume1,
  Maximize2
} from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

const sampleLyrics: Record<string, LyricLine[]> = {
  'kesariya': [
    { time: 0, text: "🎵 [Flute Intro Melodic Vibe] 🎵" },
    { time: 12, text: "Mujhsa koi khushnaseeb na hoga" },
    { time: 19, text: "Bhed jo dil ka kareeb na hoga" },
    { time: 26, text: "Kesariya tera ishq hai piya" },
    { time: 33, text: "Rang jaaun jo main haath lagaun" },
    { time: 40, text: "Din beete saara teri fikr mein" },
    { time: 47, text: "Rain saari teri khair manaun" }
  ],
  'flowers': [
    { time: 0, text: "🎵 [Upbeat Pop Intro] 🎵" },
    { time: 8, text: "We were good, we were gold" },
    { time: 12, text: "Kinda dream that can't be sold" },
    { time: 16, text: "We were right 'til we weren't" },
    { time: 20, text: "Built a home and watched it burn" },
    { time: 24, text: "I can buy myself flowers" },
    { time: 29, text: "Write my name in the sand" },
    { time: 33, text: "Talk to myself for hours" },
    { time: 38, text: "Say things you don't understand" }
  ]
};

const genericLyrics: LyricLine[] = [
  { time: 0, text: "🎵 [Intro Instrumental Vibe] 🎵" },
  { time: 8, text: "I feel the pulse in the late night code" },
  { time: 15, text: "Neon glows on the screen below" },
  { time: 22, text: "Future sounds are playing in my head" },
  { time: 29, text: "We are chasing light, forgetting what they said" },
  { time: 36, text: "And it goes on and on, this neon dream" },
  { time: 43, text: "Nothing is quite as simple as it seems" },
  { time: 52, text: "🎵 [Synth Instrumental Solo] 🎵" },
  { time: 65, text: "We connect the clouds to the satellite" },
  { time: 72, text: "Unifying frequencies in the night" },
  { time: 80, text: "NeoTunes is taking us to the stars" },
  { time: 90, text: "Singing along under virtual bars" },
  { time: 105, text: "🎵 [Outro Beats Fading] 🎵" }
];

export default function PlayerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
    playTrack,
  } = usePlaybackStore();

  const [activeTab, setActiveTab] = useState<'cover' | 'lyrics' | 'effects'>('cover');
  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [dynamicLyrics, setDynamicLyrics] = useState<LyricLine[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  
  // Audio effects state
  const [audioEffects, setAudioEffects] = useState<Record<string, boolean>>({
    bassBoost: false,
    vocalBoost: false,
    nightMode: false,
    concertHall: false,
    spatialAudio: true,
    neoSurround: false,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync liked state
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

  // Fetch Synced Lyrics from LRCLIB
  useEffect(() => {
    if (!currentTrack) {
      setDynamicLyrics(null);
      return;
    }

    setDynamicLyrics(null);
    setLyricsLoading(true);

    const fetchLyrics = async () => {
      try {
        const titleQuery = currentTrack.title;
        const artistQuery = currentTrack.artist?.name || 'Unknown';
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${titleQuery} ${artistQuery}`)}`;
        
        const res = await fetch(searchUrl);
        if (!res.ok) throw new Error('Search failed');
        const searchResults = await res.json();
        
        if (searchResults && searchResults.length > 0) {
          const bestMatch = searchResults[0];
          if (bestMatch.syncedLyrics) {
            // Parse synced lyrics string (e.g. "[00:12.34] Lyric text")
            const lines = bestMatch.syncedLyrics.split('\n').map((line: string) => {
              const match = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)/);
              if (match) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const time = min * 60 + sec;
                return { time, text: match[4].trim() };
              }
              return null;
            }).filter((l: any): l is LyricLine => l !== null);

            if (lines.length > 0) {
              setDynamicLyrics(lines);
              setLyricsLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('LRCLIB fetch failed, falling back to local dataset:', err);
      }

      // Local mock fallback if API fails
      setTimeout(() => {
        const key = currentTrack.title.toLowerCase();
        if (key.includes('kesariya')) {
          setDynamicLyrics(sampleLyrics.kesariya);
        } else if (key.includes('flowers')) {
          setDynamicLyrics(sampleLyrics.flowers);
        } else {
          setDynamicLyrics(genericLyrics);
        }
        setLyricsLoading(false);
      }, 500);
    };

    fetchLyrics();
  }, [currentTrack?.id]);

  // Audio visualizer canvas effect
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw futuristic visualizer waves
      ctx.lineWidth = 1.5;
      const count = 4;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, 'rgba(0, 245, 255, 0)');
        grad.addColorStop(0.5, i % 2 === 0 ? 'rgba(0, 245, 255, 0.4)' : 'rgba(123, 97, 255, 0.4)');
        grad.addColorStop(1, 'rgba(0, 245, 255, 0)');
        ctx.strokeStyle = grad;

        const amplitude = isPlaying ? (12 - i * 2) : 2;
        const frequency = 0.015 + i * 0.005;

        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin(phase + x * frequency) * amplitude * Math.sin(x * Math.PI / w);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      phase += isPlaying ? 0.08 : 0.005;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Scroll lyrics container as time progresses
  const getActiveLyricIndex = () => {
    if (!dynamicLyrics) return -1;
    let activeIdx = -1;
    for (let i = 0; i < dynamicLyrics.length; i++) {
      if (progress >= dynamicLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  };

  const activeLyricIdx = getActiveLyricIndex();

  useEffect(() => {
    if (activeLyricIdx !== -1 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIdx] as HTMLElement;
      if (activeEl) {
        lyricsContainerRef.current.scrollTo({
          top: activeEl.offsetTop - 120,
          behavior: 'smooth',
        });
      }
    }
  }, [activeLyricIdx]);

  if (!currentTrack) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-white bg-[#050505] select-none">
        <Disc className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="mt-4 text-xs font-black tracking-widest text-neutral-500 uppercase">Searching for active stream...</p>
      </div>
    );
  }

  const handleLikeToggle = async () => {
    setLikeLoading(true);
    const method = isLiked ? 'DELETE' : 'POST';
    try {
      const res = await fetch('/api/liked', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: currentTrack.id, track: currentTrack }),
      });
      if (res.ok) {
        setIsLiked(!isLiked);
        queryClient.invalidateQueries({ queryKey: ['liked-songs'] });
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const toggleEffect = (key: string) => {
    setAudioEffects(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    window.dispatchEvent(new CustomEvent('seek-track', { detail: { time } }));
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const thumbnail = currentTrack.coverUrl;
  const artistName = currentTrack.artist?.name || 'Unknown Artist';
  const activeLyrics = dynamicLyrics || [];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between px-6 py-6 text-white overflow-hidden font-sans select-none bg-[#050505]">
      
      {/* 1. DYNAMIC BACKGROUND: SOFT BLURRED ALBUM ART GLOW */}
      <AnimatePresence mode="wait">
        {thumbnail && (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 -z-10 bg-cover bg-center filter blur-[120px] scale-110 pointer-events-none"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />
        )}
      </AnimatePresence>

      {/* Main Double Column Layout Container */}
      <div className="w-full max-w-5xl flex flex-col justify-between h-full flex-1 gap-6 relative z-10">
        
        {/* TOP BAR */}
        <header className="flex items-center justify-between w-full border-b border-white/[0.05] pb-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.05] transition-colors"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400">
              NeoTunes Space
            </span>
          </div>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              showQueue 
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                : 'bg-white/[0.06] text-white hover:bg-white/[0.1] border-white/[0.05]'
            }`}
          >
            <ListMusic className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* MIDDLE SECTION: ALBUM VIEW OR TABS PANEL */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 items-center my-4">
          
          {/* LEFT: 3D SPINNING VINYL RECORD & AUDIO REACTIVE VISUALIZER (5 Columns) */}
          <div className="md:col-span-5 flex flex-col justify-center items-center">
            
            {/* Spinning Vinyl Cover Art */}
            <div className="relative aspect-square w-full max-w-[280px] xs:max-w-[320px] rounded-full overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.85)] border border-white/[0.08] bg-black group flex items-center justify-center">
              
              {/* Spinning Vinyl Record Body */}
              <div className={`relative w-full h-full rounded-full transition-transform duration-1000 flex items-center justify-center bg-neutral-900 border-[10px] border-neutral-950 ${isPlaying ? 'animate-vinyl' : 'animate-vinyl [animation-play-state:paused]'}`}>
                {/* Vinyl grooved circles */}
                <div className="absolute inset-2 border border-neutral-800/40 rounded-full" />
                <div className="absolute inset-6 border border-neutral-800/35 rounded-full" />
                <div className="absolute inset-10 border border-neutral-800/30 rounded-full" />
                <div className="absolute inset-14 border border-neutral-800/25 rounded-full" />
                <div className="absolute inset-20 border border-neutral-800/20 rounded-full" />

                {/* Center Core Label */}
                <div className="relative w-[110px] h-[110px] rounded-full overflow-hidden border-4 border-neutral-950 bg-black flex-shrink-0 flex items-center justify-center">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={currentTrack?.title || "Album Cover"}
                      fill
                      sizes="110px"
                      priority
                      className="object-cover"
                    />
                  ) : (
                    <Music className="h-10 w-10 text-neutral-600" />
                  )}
                  {/* Small Center Spindle Hole */}
                  <div className="absolute h-5.5 w-5.5 rounded-full bg-[#050505] border-2 border-neutral-950 shadow-inner flex items-center justify-center z-10">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/[0.1]" />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Reactive Visualizer Canvas */}
            <div className="w-full max-w-[340px] mt-8 h-12 relative">
              <canvas ref={canvasRef} className="w-full h-full" width={340} height={48} />
              {!isPlaying && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                  Visualizer Idle
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: GLASS CARD WITH TABS (Lyrics / Controls / Effects) (7 Columns) */}
          <div className="md:col-span-7 h-full flex flex-col justify-between">
            <div className="rounded-3xl border border-white/[0.06] bg-[#111111]/40 backdrop-blur-2xl p-6 flex flex-col h-[380px] overflow-hidden justify-between">
              
              {/* Tab Selector bar */}
              <div className="flex border-b border-white/[0.05] pb-2 mb-4">
                {[
                  { id: 'cover', label: 'Now Playing', icon: Music },
                  { id: 'lyrics', label: 'Synced Lyrics', icon: AlignLeft },
                  { id: 'effects', label: 'Audio Effects', icon: Sliders }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`relative flex items-center space-x-2 px-4 py-1.5 text-xs font-bold transition-all ${
                      activeTab === t.id ? 'text-white' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    {activeTab === t.id && (
                      <motion.div layoutId="player-tab-active" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00F5FF]" />
                    )}
                    <t.icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Viewport panels */}
              <div className="flex-1 overflow-hidden relative">
                
                {/* NOW PLAYING METADATA TAB */}
                {activeTab === 'cover' && (
                  <div className="flex flex-col h-full justify-between py-2 text-left">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">Source: {currentTrack.sourceType}</span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mt-3">{currentTrack.title}</h2>
                      <p className="text-xs sm:text-sm text-neutral-400 font-bold uppercase tracking-wider mt-1">{artistName}</p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 text-left nothing-dots">
                      <span className="text-[9px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                        <span>AI DJ Insights</span>
                      </span>
                      <p className="text-[11px] text-neutral-305 leading-relaxed mt-1.5 font-bold">
                        This track matches your late-night coding flow. Based on your favorite artists, this track is recommended for rainy weather focus.
                      </p>
                    </div>
                  </div>
                )}

                {/* APPLE MUSIC FLOATING LYRICS TAB */}
                {activeTab === 'lyrics' && (
                  <div 
                    ref={lyricsContainerRef} 
                    className="h-full overflow-y-auto space-y-4 pr-2 scrollbar-hide mask-fade pb-20 text-left"
                  >
                    {lyricsLoading ? (
                      <div className="flex flex-col items-center justify-center h-[280px] space-y-3">
                        <Disc className="h-8 w-8 animate-spin text-cyan-400" />
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest animate-pulse">Syncing Original Lyrics...</span>
                      </div>
                    ) : activeLyrics.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[280px] space-y-2 text-center text-neutral-500 py-10">
                        <Music className="h-8 w-8 text-neutral-600 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-wider">No Lyrics Found</p>
                        <p className="text-[10px]">Could not retrieve synced lyrics for this track</p>
                      </div>
                    ) : (
                      activeLyrics.map((line, idx) => {
                        const isActive = idx === activeLyricIdx;
                        return (
                          <div
                            key={idx}
                            className={`text-sm font-black transition-all duration-300 py-1.5 cursor-pointer origin-left ${
                              isActive 
                                ? 'text-cyan-450 scale-105 drop-shadow-[0_0_10px_rgba(0,245,255,0.4)]' 
                                : 'text-neutral-500 hover:text-white'
                            }`}
                            onClick={() => {
                              setProgress(line.time);
                              window.dispatchEvent(new CustomEvent('seek-track', { detail: { time: line.time } }));
                            }}
                          >
                            {line.text}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* AUDIO EFFECTS DASHBOARD TAB */}
                {activeTab === 'effects' && (
                  <div className="grid grid-cols-2 gap-3 h-full overflow-y-auto pr-1">
                    {[
                      { key: 'spatialAudio', label: 'Spatial Audio 3D', desc: 'Immersive sound stage' },
                      { key: 'bassBoost', label: 'Bass Boost', desc: 'Extra low-end thud' },
                      { key: 'vocalBoost', label: 'Vocal Enhancer', desc: 'Crisp vocals' },
                      { key: 'concertHall', label: 'Concert Hall', desc: 'Large space reverb' },
                      { key: 'nightMode', label: 'Late Night EQ', desc: 'Compress dynamics' },
                      { key: 'neoSurround', label: 'Neo Surround', desc: 'Binaural width' }
                    ].map(fx => {
                      const isActive = audioEffects[fx.key];
                      return (
                        <div
                          key={fx.key}
                          onClick={() => toggleEffect(fx.key)}
                          className={`rounded-2xl border p-3.5 text-left cursor-pointer transition-all ${
                            isActive
                              ? 'border-cyan-400 bg-cyan-950/10 text-cyan-400 shadow-md shadow-cyan-500/5'
                              : 'border-white/[0.05] bg-white/[0.01] hover:border-white/[0.1] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <h4 className="text-[11px] font-black uppercase tracking-wider">{fx.label}</h4>
                          <p className="text-[9px] text-neutral-500 font-bold mt-0.5">{fx.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PART: CONTROLS */}
        <div className="space-y-6">
          
          {/* PROGRESS SLIDER */}
          <div className="space-y-1.5">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress || 0}
                onChange={handleSeek}
                className="w-full h-1 appearance-none rounded-full cursor-pointer bg-white/[0.12] outline-none accent-cyan-400
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-neutral-500 tracking-wider">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* MAIN PLAYER ACTIONS BAR */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`p-2 transition-colors ${shuffle ? 'text-cyan-400' : 'text-neutral-500 hover:text-white'}`}
            >
              <Shuffle className="h-5 w-5" />
            </button>

            <button onClick={prevTrack} className="text-neutral-450 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2">
              <SkipBack className="h-7 w-7 fill-current stroke-none" />
            </button>

            <button
              onClick={() => setPlaying(!isPlaying)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 fill-black stroke-black" />
              ) : (
                <Play className="h-7 w-7 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>

            <button onClick={nextTrack} className="text-neutral-450 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2">
              <SkipForward className="h-7 w-7 fill-current stroke-none" />
            </button>

            <button
              onClick={() => {
                if (repeatMode === 'off') setRepeatMode('all');
                else if (repeatMode === 'all') setRepeatMode('one');
                else setRepeatMode('off');
              }}
              className={`relative p-2 transition-colors ${repeatMode !== 'off' ? 'text-cyan-400' : 'text-neutral-455 hover:text-white'}`}
            >
              <Repeat className="h-5 w-5" />
              {repeatMode === 'one' && (
                <span className="absolute top-[2px] right-[2px] flex h-3 w-3 items-center justify-center rounded-full bg-cyan-400 text-[7px] font-black text-black">
                  1
                </span>
              )}
            </button>
          </div>

          {/* LOWER DECK: LIKE, VOLUME, SPEED */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-white/[0.05] items-center">
            
            {/* LIKE / SHARE */}
            <div className="flex gap-4 justify-center md:justify-start">
              <button
                onClick={handleLikeToggle}
                disabled={likeLoading}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all border ${
                  isLiked
                    ? 'bg-pink-500/10 border-pink-500/25 text-pink-400'
                    : 'border-white/[0.05] bg-white/[0.02] text-neutral-450 hover:text-white'
                }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-pink-400 stroke-pink-400' : ''}`} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>
            </div>

            {/* VOLUME */}
            <div className="flex items-center space-x-3 max-w-xs mx-auto w-full justify-center">
              <button onClick={toggleMute} className="text-neutral-500 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 flex-1 appearance-none bg-white/[0.12] rounded-full outline-none accent-cyan-400
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* PLAYBACK SPEED */}
            <div className="flex items-center justify-center md:justify-end gap-1.5">
              {[0.75, 1, 1.25, 1.5].map(rate => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase border transition-colors ${
                    playbackRate === rate
                      ? 'bg-cyan-400 border-cyan-400 text-black font-black'
                      : 'border-white/[0.06] hover:bg-white/[0.04] text-neutral-450 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* 4. QUEUE DRAWER: SLIDE FROM RIGHT */}
      <AnimatePresence>
        {showQueue && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueue(false)}
              className="fixed inset-0 z-40 bg-black"
            />

            {/* Queue Panel drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm border-l border-white/[0.08] bg-[#0E111A]/95 backdrop-blur-2xl p-6 shadow-2xl flex flex-col justify-between text-left"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 mb-4">
                  <h3 className="text-base font-black uppercase tracking-wider">Upcoming Queue</h3>
                  <span className="text-[10px] text-neutral-500 font-mono font-bold">{queue.length} Songs</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                  {queue.map((track, idx) => {
                    const isActive = track.id === currentTrack.id;
                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        onClick={() => {
                          playTrack(track, queue);
                        }}
                        className={`flex items-center justify-between rounded-xl p-2.5 transition-all cursor-pointer border ${
                          isActive 
                            ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                            : 'border-transparent hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 truncate">
                          <span className="text-[10px] text-neutral-500 font-bold w-4 text-center">{idx + 1}</span>
                          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg">
                            {track.coverUrl ? (
                              <Image
                                  src={track.coverUrl}
                                  alt={track.title}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                                <Music className="h-4.5 w-4.5 text-neutral-600" />
                              </div>
                            )}
                          </div>
                          <div className="truncate text-left">
                            <p className="truncate text-xs font-black uppercase tracking-wider text-white leading-normal">{track.title}</p>
                            <p className="truncate text-[9px] text-neutral-500 font-bold uppercase tracking-wider leading-normal mt-0.5">{track.artist?.name}</p>
                          </div>
                        </div>
                        {isActive && <span className="text-[8px] font-black uppercase tracking-wider animate-pulse text-cyan-400">Playing</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/[0.05] pt-4 mt-4">
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-full rounded-xl border border-white/[0.1] hover:border-white/[0.2] py-3 text-xs font-black uppercase transition-all text-neutral-300 hover:text-white text-center"
                >
                  Close Drawer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
