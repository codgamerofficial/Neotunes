'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePlaybackStore } from '@/store/playback-store';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
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
  Music,
  Sparkles,
  AlignLeft,
  Share2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Disc,
  Mic2,
} from 'lucide-react';

/* ───────── Types ───────── */
interface LyricLine { time: number; text: string; }
interface DominantColors { primary: string; secondary: string; tertiary: string; }

/* ───────── Mock Lyrics ───────── */
const MOCK_LYRICS: LyricLine[] = [
  { time: 0, text: "🎵 [Instrumental Intro] 🎵" },
  { time: 10, text: "Welcome to NeoTunes" },
  { time: 20, text: "The world's premium AI audio environment" },
  { time: 32, text: "Glow on the horizon, stars in your eyes" },
  { time: 45, text: "Lossless decoders singing sweet replies" },
  { time: 58, text: "🎵 [Guitar Solo Break] 🎵" },
  { time: 70, text: "We trace the waves of the sound stage sound" },
  { time: 80, text: "NeoTunes is taking us to the stars" },
  { time: 90, text: "Singing along under virtual bars" },
  { time: 105, text: "🎵 [Outro Fading] 🎵" },
];

/* ───────── AI Insight Templates ───────── */
const AI_INSIGHTS = [
  "This track matches your late-night coding energy — spatial depth enhanced for deep focus.",
  "Based on your listening patterns, this artist syncs with your rainy day playlist mood.",
  "Your heartbeat tempo preference aligns with this song's 128 BPM — perfect for flow state.",
  "Weather in your area is overcast — NeoTunes AI selected warmer low-end frequencies.",
  "This track shares harmonic DNA with 3 songs you've had on repeat this week.",
  "AI detected your evening wind-down pattern — reverb and spatial staging adjusted.",
];

/* ───────── Color Extraction ───────── */
function extractColorsFromImage(imgUrl: string): Promise<DominantColors> {
  return new Promise((resolve) => {
    const fallback: DominantColors = { primary: '#0ea5e9', secondary: '#8b5cf6', tertiary: '#06b6d4' };
    if (!imgUrl || imgUrl.includes('default-cover')) {
      resolve(fallback);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(fallback); return; }
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Sample regions for dominant colors
        const regions = [
          { sx: 0, sy: 0, ex: size / 2, ey: size / 2 },
          { sx: size / 2, sy: 0, ex: size, ey: size / 2 },
          { sx: 0, sy: size / 2, ex: size, ey: size },
        ];
        const colors = regions.map(r => {
          let rr = 0, gg = 0, bb = 0, count = 0;
          for (let y = r.sy; y < r.ey; y++) {
            for (let x = r.sx; x < r.ex; x++) {
              const i = (y * size + x) * 4;
              rr += data[i]; gg += data[i + 1]; bb += data[i + 2];
              count++;
            }
          }
          return `rgb(${Math.round(rr / count)}, ${Math.round(gg / count)}, ${Math.round(bb / count)})`;
        });
        resolve({ primary: colors[0], secondary: colors[1], tertiary: colors[2] });
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = imgUrl;
  });
}

/* ───────── Organic Waveform Component ───────── */
function OrganicWaveform({ isPlaying, colors }: { isPlaying: boolean; colors: DominantColors }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      if (isPlaying) phaseRef.current += 0.02;

      // Draw 3 layered organic waveforms
      const layers = [
        { amplitude: isPlaying ? 12 : 2, freq: 0.015, speed: 1, alpha: 0.6, color: colors.primary },
        { amplitude: isPlaying ? 8 : 1.5, freq: 0.025, speed: 1.4, alpha: 0.4, color: colors.secondary },
        { amplitude: isPlaying ? 5 : 1, freq: 0.035, speed: 0.8, alpha: 0.25, color: colors.tertiary },
      ];

      layers.forEach(layer => {
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        for (let x = 0; x <= w; x++) {
          const noise = isPlaying ? Math.sin(x * 0.1 + phaseRef.current * 3) * 2 : 0;
          const y = h / 2 + Math.sin(x * layer.freq + phaseRef.current * layer.speed) * layer.amplitude + noise;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = layer.color;
        ctx.globalAlpha = layer.alpha;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Mirror below
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        for (let x = 0; x <= w; x++) {
          const noise = isPlaying ? Math.sin(x * 0.1 + phaseRef.current * 3) * 2 : 0;
          const y = h / 2 - Math.sin(x * layer.freq + phaseRef.current * layer.speed) * layer.amplitude * 0.6 - noise * 0.5;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = layer.color;
        ctx.globalAlpha = layer.alpha * 0.5;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, colors]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

/* ───────── Ambient Particles ───────── */
function AmbientParticles({ colors }: { colors: DominantColors }) {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.3 + 0.05,
      color: [colors.primary, colors.secondary, colors.tertiary][i % 3],
    })), [colors]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            filter: `blur(${p.size > 2 ? 1 : 0}px)`,
          }}
          animate={{
            y: [0, -40, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity * 0.5, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════ */
/*           MAIN PLAYER PAGE             */
/* ═══════════════════════════════════════ */
export default function PlayerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    isPlaying, currentTrack, queue, volume, isMuted,
    progress, duration, shuffle, repeatMode, playbackRate,
    setPlaying, setVolume, toggleMute, nextTrack, prevTrack,
    setShuffle, setRepeatMode, setPlaybackRate, setProgress, playTrack,
  } = usePlaybackStore();

  /* ── State ── */
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [dominantColors, setDominantColors] = useState<DominantColors>({
    primary: '#0ea5e9', secondary: '#8b5cf6', tertiary: '#06b6d4',
  });
  const [aiInsight, setAiInsight] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  /* ── Derived ── */
  const activeLyricIdx = MOCK_LYRICS.findIndex(
    (line, idx) => progress >= line.time && (idx === MOCK_LYRICS.length - 1 || progress < MOCK_LYRICS[idx + 1].time)
  );

  const coverUrl = currentTrack?.coverUrl || '/images/default-cover.png';

  /* ── Extract colors when track changes ── */
  useEffect(() => {
    if (!currentTrack?.coverUrl) return;
    extractColorsFromImage(currentTrack.coverUrl).then(setDominantColors);
    setAiInsight(AI_INSIGHTS[Math.floor(Math.random() * AI_INSIGHTS.length)]);
  }, [currentTrack?.coverUrl]);

  /* ── Check like status ── */
  useEffect(() => {
    if (!currentTrack) return;
    (async () => {
      try {
        const res = await fetch(`/api/liked?trackId=${currentTrack.id}`);
        if (res.ok) { const data = await res.json(); setIsLiked(data.isLiked); }
      } catch { /* ignore */ }
    })();
  }, [currentTrack]);

  /* ── Scroll lyrics ── */
  useEffect(() => {
    if (showLyrics && lyricsContainerRef.current) {
      const el = lyricsContainerRef.current.children[activeLyricIdx] as HTMLElement;
      if (el) {
        lyricsContainerRef.current.scrollTo({
          top: el.offsetTop - lyricsContainerRef.current.clientHeight / 2 + el.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeLyricIdx, showLyrics]);

  /* ── Parallax mouse tracking ── */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!playerRef.current) return;
    const rect = playerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  /* ── Handlers ── */
  const handleLikeToggle = async () => {
    if (likeLoading || !currentTrack) return;
    setLikeLoading(true);
    try {
      const res = await fetch('/api/liked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: currentTrack.id, track: currentTrack }),
      });
      if (res.ok) {
        setIsLiked(!isLiked);
        queryClient.invalidateQueries({ queryKey: ['liked-songs'] });
      }
    } catch { /* ignore */ } finally { setLikeLoading(false); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    window.dispatchEvent(new CustomEvent('seek-track', { detail: { time } }));
  };

  const formatTime = (t: number) => {
    if (isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  /* ── Loading State ── */
  if (!currentTrack) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-white bg-[#07090D]">
        <Disc className="h-10 w-10 animate-spin text-cyan-400" />
        <p className="mt-4 text-xs font-medium tracking-widest text-white/30 uppercase animate-pulse">Loading Player…</p>
      </div>
    );
  }

  /* ── Parallax offsets ── */
  const parallaxX = (mousePos.x - 0.5) * 12;
  const parallaxY = (mousePos.y - 0.5) * 8;

  return (
    <div
      ref={playerRef}
      onMouseMove={handleMouseMove}
      className="relative flex flex-col h-screen text-white overflow-hidden select-none"
      style={{ background: '#07090D' }}
    >

      {/* ═══ LAYER 0: DYNAMIC AURORA BACKGROUND ═══ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTrack.id + '-bg'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 z-0"
        >
          {/* Blurred artwork backdrop */}
          <div
            className="absolute inset-0 scale-[1.3] opacity-[0.18]"
            style={{
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(100px) saturate(1.8)',
            }}
          />

          {/* Aurora gradient orbs */}
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background: `radial-gradient(circle, ${dominantColors.primary}, transparent 70%)`,
              top: '-10%',
              left: '-10%',
              filter: 'blur(80px)',
            }}
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full opacity-15"
            style={{
              background: `radial-gradient(circle, ${dominantColors.secondary}, transparent 70%)`,
              bottom: '-5%',
              right: '-15%',
              filter: 'blur(90px)',
            }}
            animate={{ x: [0, -30, 20, 0], y: [0, 20, -40, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full opacity-10"
            style={{
              background: `radial-gradient(circle, ${dominantColors.tertiary}, transparent 70%)`,
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              filter: 'blur(100px)',
            }}
            animate={{ scale: [1, 1.2, 0.9, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Ambient fog overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#07090D]/60 via-transparent to-[#07090D]/90" />

          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          }} />
        </motion.div>
      </AnimatePresence>

      {/* Ambient Particles */}
      <AmbientParticles colors={dominantColors} />

      {/* ═══ LAYER 1: MAIN CONTENT ═══ */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ── TOP BAR ── */}
        <motion.header
          initial={false}
          animate={{ opacity: immersiveMode ? 0 : 1, y: immersiveMode ? -20 : 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between px-5 sm:px-8 pt-5 pb-2 flex-shrink-0"
        >
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl transition-all active:scale-90"
          >
            <ChevronDown className="h-5 w-5 text-white/70" />
          </button>

          <div className="flex items-center gap-1.5 opacity-60">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/50">NeoTunes AI</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setImmersiveMode(!immersiveMode)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-xl transition-all active:scale-90"
            >
              {immersiveMode ? <Minimize2 className="h-4 w-4 text-white/70" /> : <Maximize2 className="h-4 w-4 text-white/70" />}
            </button>
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl transition-all active:scale-90 ${
                showQueue ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70'
              }`}
            >
              <ListMusic className="h-4.5 w-4.5" />
            </button>
          </div>
        </motion.header>

        {/* ── SCROLLABLE CONTENT AREA ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 overflow-hidden">

          {/* HERO ARTWORK */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack.id + '-art'}
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{
                opacity: showLyrics ? 0.3 : 1,
                scale: showLyrics ? 0.6 : (isPlaying ? 1 : 0.96),
                y: showLyrics ? -60 : 0,
              }}
              exit={{ opacity: 0, scale: 0.85, y: -20 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative flex-shrink-0"
              style={{
                transform: `perspective(1200px) rotateY(${parallaxX * 0.3}deg) rotateX(${-parallaxY * 0.3}deg) translateX(${parallaxX}px) translateY(${parallaxY}px)`,
                transition: 'transform 0.15s ease-out',
              }}
            >
              {/* Ambient glow behind artwork */}
              <div
                className="absolute -inset-12 rounded-[60px] opacity-40 blur-[60px] pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse, ${dominantColors.primary}, ${dominantColors.secondary}, transparent)`,
                }}
              />

              {/* Reflection/Shadow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[75%] h-12 rounded-full blur-2xl opacity-30"
                style={{ background: dominantColors.primary }}
              />

              {/* Main artwork container */}
              <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl shadow-black/50">
                <ImageWithFallback
                  src={coverUrl}
                  alt={currentTrack.title}
                  fill
                  sizes="(max-width: 640px) 260px, (max-width: 768px) 320px, (max-width: 1024px) 380px, 420px"
                  priority
                  className="object-cover"
                />

                {/* Subtle inner border */}
                <div className="absolute inset-0 rounded-[28px] sm:rounded-[36px] border border-white/[0.08] pointer-events-none" />

                {/* Top highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ORGANIC WAVEFORM beneath artwork */}
          <motion.div
            initial={false}
            animate={{
              opacity: immersiveMode || showLyrics ? 0.5 : 1,
              height: showLyrics ? 16 : 36,
            }}
            className="w-full max-w-[320px] sm:max-w-[380px] mt-5 flex-shrink-0"
          >
            <OrganicWaveform isPlaying={isPlaying} colors={dominantColors} />
          </motion.div>

          {/* ── FULLSCREEN LYRICS OVERLAY ── */}
          <AnimatePresence>
            {showLyrics && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8"
              >
                <div
                  ref={lyricsContainerRef}
                  className="h-[55vh] w-full max-w-lg overflow-y-auto scrollbar-hide flex flex-col items-center justify-start pt-[25vh] pb-[25vh] space-y-6"
                >
                  {MOCK_LYRICS.map((line, idx) => {
                    const isActive = idx === activeLyricIdx;
                    const distance = Math.abs(idx - activeLyricIdx);
                    return (
                      <motion.div
                        key={idx}
                        initial={false}
                        animate={{
                          opacity: isActive ? 1 : Math.max(0.15, 0.5 - distance * 0.12),
                          scale: isActive ? 1.08 : 1,
                          filter: isActive ? 'blur(0px)' : `blur(${Math.min(distance * 0.8, 3)}px)`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={`text-center cursor-pointer transition-colors ${
                          isActive ? 'text-white font-bold text-2xl sm:text-3xl' : 'text-white/50 font-medium text-lg sm:text-xl'
                        }`}
                        onClick={() => {
                          setProgress(line.time);
                          window.dispatchEvent(new CustomEvent('seek-track', { detail: { time: line.time } }));
                        }}
                      >
                        {line.text}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── BOTTOM CONTROL DOCK ── */}
        <motion.div
          initial={false}
          animate={{ opacity: immersiveMode ? 0.15 : 1, y: immersiveMode ? 20 : 0 }}
          transition={{ duration: 0.4 }}
          className="flex-shrink-0 px-5 sm:px-8 pb-6 sm:pb-8"
        >
          {/* Track Info */}
          <motion.div
            initial={false}
            animate={{ opacity: showLyrics ? 0 : 1, height: showLyrics ? 0 : 'auto' }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <motion.h1
                  key={currentTrack.id + '-title'}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xl sm:text-2xl font-bold text-white truncate leading-tight"
                >
                  {currentTrack.title}
                </motion.h1>
                <motion.p
                  key={currentTrack.id + '-artist'}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-sm text-white/50 font-medium truncate mt-0.5"
                >
                  {currentTrack.artist?.name}
                </motion.p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleLikeToggle}
                  disabled={likeLoading}
                  className="p-2 transition-all active:scale-90"
                >
                  <Heart className={`h-5 w-5 transition-colors ${
                    isLiked ? 'fill-rose-400 stroke-rose-400 text-rose-400' : 'text-white/40 hover:text-white/70'
                  }`} />
                </button>
                <button className="p-2 text-white/40 hover:text-white/70 transition-colors active:scale-90">
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* AI Insight Card */}
            <motion.div
              key={currentTrack.id + '-insight'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-3 flex items-start gap-2.5 rounded-2xl bg-white/[0.04] backdrop-blur-sm px-3.5 py-2.5 border border-white/[0.06]"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                {aiInsight}
              </p>
            </motion.div>
          </motion.div>

          {/* Progress Bar */}
          <div className="space-y-1.5 mb-5">
            <div className="relative h-1 w-full bg-white/[0.08] rounded-full overflow-hidden group cursor-pointer">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${dominantColors.primary}, ${dominantColors.secondary})`,
                }}
                layout
                transition={{ duration: 0.1 }}
              />
              {/* Glow dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-white/30 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPercent}% - 6px)` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress || 0}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium text-white/25 tabular-nums tracking-wider">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`p-2 transition-all active:scale-90 ${shuffle ? 'text-cyan-400' : 'text-white/30 hover:text-white/60'}`}
            >
              <Shuffle className="h-5 w-5" />
            </button>

            <button
              onClick={prevTrack}
              className="p-2 text-white/60 hover:text-white transition-all active:scale-90"
            >
              <SkipBack className="h-6 w-6 fill-current" />
            </button>

            <button
              onClick={() => setPlaying(!isPlaying)}
              className="relative flex h-[56px] w-[56px] items-center justify-center rounded-full transition-all active:scale-90 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${dominantColors.primary}, ${dominantColors.secondary})`,
                boxShadow: `0 8px 32px ${dominantColors.primary}40`,
              }}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-white stroke-white text-white" />
              ) : (
                <Play className="h-6 w-6 fill-white stroke-white text-white translate-x-[1px]" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-2 text-white/60 hover:text-white transition-all active:scale-90"
            >
              <SkipForward className="h-6 w-6 fill-current" />
            </button>

            <button
              onClick={() => {
                if (repeatMode === 'off') setRepeatMode('all');
                else if (repeatMode === 'all') setRepeatMode('one');
                else setRepeatMode('off');
              }}
              className={`relative p-2 transition-all active:scale-90 ${repeatMode !== 'off' ? 'text-cyan-400' : 'text-white/30 hover:text-white/60'}`}
            >
              <Repeat className="h-5 w-5" />
              {repeatMode === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-[7px] font-bold text-black">1</span>
              )}
            </button>
          </div>

          {/* Contextual Actions Bar */}
          <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-white/[0.04]">
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase transition-all ${
                showLyrics ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-white/30 hover:text-white/50'
              }`}
            >
              <Mic2 className="h-3.5 w-3.5" />
              <span>Lyrics</span>
            </button>

            {/* Volume control inline */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white/30 hover:text-white/60 transition-colors p-1">
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range" min="0" max="1" step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-0.5 appearance-none bg-white/[0.1] rounded-full outline-none accent-white/50
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-2.5
                  [&::-webkit-slider-thumb]:w-2.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white/60"
              />
            </div>

            {/* Speed */}
            <button
              onClick={() => {
                const speeds = [1, 1.25, 1.5, 0.75];
                const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
                setPlaybackRate(speeds[nextIdx]);
              }}
              className="text-[10px] font-semibold tracking-wider text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded-full"
            >
              {playbackRate}x
            </button>

            <button className="p-1.5 text-white/30 hover:text-white/50 transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ═══ QUEUE DRAWER ═══ */}
      <AnimatePresence>
        {showQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueue(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-[#0B0E15]/95 backdrop-blur-2xl border-l border-white/[0.06] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white">Up Next</h3>
                <span className="text-[10px] text-white/25 font-medium tabular-nums">{queue.length} tracks</span>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide">
                {queue.map((track, idx) => {
                  const isActive = track.id === currentTrack.id;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => playTrack(track, queue)}
                      className={`flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-all ${
                        isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="text-[10px] text-white/20 font-medium w-5 text-center tabular-nums">{idx + 1}</span>
                      <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden">
                        <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-cyan-400' : 'text-white/80'}`}>{track.title}</p>
                        <p className="text-[10px] text-white/30 truncate">{track.artist?.name}</p>
                      </div>
                      {isActive && (
                        <div className="flex gap-0.5">
                          {[1,2,3].map(i => (
                            <motion.div
                              key={i}
                              className="w-0.5 bg-cyan-400 rounded-full"
                              animate={{ height: [4, 12, 6, 10, 4] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white/50 hover:text-white/70 transition-all text-center"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
