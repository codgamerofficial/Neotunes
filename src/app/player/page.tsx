'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Sliders,
  Disc,
  Sparkles,
  AlignLeft,
  Share2,
  HelpCircle,
  Activity,
  MessageSquare,
  Compass,
  Radio,
  Zap,
  Globe
} from 'lucide-react';

interface LyricLine {
  time: number;
  text: string;
}

const MOCK_LYRICS: LyricLine[] = [
  { time: 0, text: "🎵 [Instrumental Intro Beats] 🎵" },
  { time: 10, text: "Welcome to NeoTunes OS v5.0" },
  { time: 20, text: "The world's premium AI audio environment" },
  { time: 32, text: "Glow on the horizon, stars in your eyes" },
  { time: 45, text: "Lossless decoders singing sweet replies" },
  { time: 58, text: "🎵 [Guitar Solo Break] 🎵" },
  { time: 70, text: "We trace the waves of the sound stage sound" },
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

  const [activeTab, setActiveTab] = useState<'cover' | 'lyrics' | 'effects' | 'assistant' | 'comments'>('cover');
  const [showQueue, setShowQueue] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [audioEffects, setAudioEffects] = useState<Record<string, boolean>>({
    bassBoost: true,
    vocalBoost: false,
    concertHall: false,
    spatial3D: true,
  });

  // Mock comments
  const [comments, setComments] = useState([
    { user: "Alex", text: "This mix hits different at 2 AM!", likes: 12 },
    { user: "Sarah", text: "The spatial staging on this is insane 🎧", likes: 8 },
    { user: "Rohan", text: "Pure bliss. NeoTunes AI nailed the vibe.", likes: 15 }
  ]);
  const [newComment, setNewComment] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Find current active lyric line
  const activeLyricIdx = MOCK_LYRICS.findIndex(
    (line, idx) => progress >= line.time && (idx === MOCK_LYRICS.length - 1 || progress < MOCK_LYRICS[idx + 1].time)
  );

  // Sync like state from currentTrack
  useEffect(() => {
    if (!currentTrack) return;
    const checkIsLiked = async () => {
      try {
        const res = await fetch(`/api/liked?trackId=${currentTrack.id}`);
        if (res.ok) {
          const data = await res.json();
          setIsLiked(data.isLiked);
        }
      } catch (err) {
        console.warn('Failed to check like status:', err);
      }
    };
    checkIsLiked();
  }, [currentTrack]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const barsCount = 36;
    const barWidth = 6;
    const gap = 3;
    const heights = Array(barsCount).fill(4);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, 'rgba(0, 245, 255, 0.2)');
      gradient.addColorStop(0.5, 'rgba(155, 92, 255, 0.7)');
      gradient.addColorStop(1, '#00F5FF');

      for (let i = 0; i < barsCount; i++) {
        if (isPlaying) {
          const target = Math.random() * (canvas.height - 4) + 4;
          heights[i] += (target - heights[i]) * 0.25;
        } else {
          heights[i] += (4 - heights[i]) * 0.1;
        }

        const x = i * (barWidth + gap) + (canvas.width - barsCount * (barWidth + gap)) / 2;
        const y = canvas.height - heights[i];
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, heights[i], 3);
        ctx.fill();
      }
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Scroll lyrics container
  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[activeLyricIdx] as HTMLElement;
      if (activeEl) {
        lyricsContainerRef.current.scrollTo({
          top: activeEl.offsetTop - lyricsContainerRef.current.clientHeight / 2 + activeEl.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [activeLyricIdx, activeTab]);

  if (!currentTrack) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-white bg-[#050505] font-sans">
        <Disc className="h-10 w-10 animate-spin text-[#00F5FF]" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-500 animate-pulse">Launching Space Deck...</p>
      </div>
    );
  }

  const handleLikeToggle = async () => {
    if (likeLoading) return;
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
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const toggleEffect = (key: string) => {
    setAudioEffects(prev => ({ ...prev, [key]: !prev[key] }));
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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments(prev => [{ user: "You", text: newComment, likes: 0 }, ...prev]);
    setNewComment("");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between px-4 sm:px-6 py-6 text-white overflow-hidden font-sans select-none bg-[#050505]">
      
      {/* 1. DYNAMIC BACKGROUND AURORA & PARTICLE MOCK */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTrack.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 -z-10 bg-cover bg-center filter blur-[120px] scale-110 pointer-events-none"
          style={{ backgroundImage: `url(${currentTrack.coverUrl || '/images/default-cover.png'})` }}
        />
      </AnimatePresence>

      {/* 2. DUST/PARTICLES EFFECT OVERLAY */}
      <div className="absolute inset-0 -z-10 bg-black/40 pointer-events-none" />
      <div className="absolute inset-0 -z-10 nothing-dots opacity-40 pointer-events-none" />

      {/* Main Column Container */}
      <div className="w-full max-w-5xl flex flex-col justify-between h-full flex-1 gap-6 relative z-10">
        
        {/* TOP BAR */}
        <header className="flex items-center justify-between w-full border-b border-white/[0.05] pb-3.5">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#00F5FF] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[#00F5FF]">
              NeoTunes Space v5
            </span>
          </div>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              showQueue 
                ? 'bg-[#00F5FF]/10 text-[#00F5FF] border-[#00F5FF]/20' 
                : 'bg-white/[0.04] text-white hover:bg-white/[0.08] border-white/[0.06]'
            }`}
          >
            <ListMusic className="h-4.5 w-4.5" />
          </button>
        </header>

        {/* MIDDLE VIEWPORTS */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-4 min-h-0">
          
          {/* LEFT: 3D VINYL DECK & SPECTRUM VISUALIZER */}
          <div className="lg:col-span-5 flex flex-col justify-center items-center">
            
            {/* Immersive Rotating 3D Vinyl */}
            <div className="relative aspect-square w-full max-w-[260px] xs:max-w-[300px] rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/[0.08] bg-[#0A0D14] flex items-center justify-center p-3 reflection-overlay">
              <div className={`relative w-full h-full rounded-full transition-transform duration-1000 flex items-center justify-center bg-neutral-900 border-[10px] border-neutral-950 shadow-inner ${isPlaying ? 'animate-vinyl' : 'animate-vinyl [animation-play-state:paused]'}`}>
                {/* Vinyl grooved circles */}
                <div className="absolute inset-1.5 border border-neutral-850/60 rounded-full" />
                <div className="absolute inset-5 border border-neutral-800/40 rounded-full" />
                <div className="absolute inset-10 border border-neutral-800/30 rounded-full" />
                <div className="absolute inset-16 border border-neutral-800/20 rounded-full" />

                {/* Center Label Cover */}
                <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden border-4 border-neutral-950 bg-black flex-shrink-0 flex items-center justify-center shadow-lg">
                  {currentTrack.coverUrl ? (
                    <Image
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      fill
                      sizes="100px"
                      priority
                      className="object-cover"
                    />
                  ) : (
                    <Music className="h-9 w-9 text-neutral-600" />
                  )}
                  {/* Spindle center hole */}
                  <div className="absolute h-6 w-6 rounded-full bg-[#050505] border-2 border-neutral-950 shadow-inner flex items-center justify-center z-10">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/[0.2]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Reactive Spectrum Canvas */}
            <div className="w-full max-w-[280px] mt-6 h-12 relative">
              <canvas ref={canvasRef} className="w-full h-full" width={280} height={48} />
            </div>
          </div>

          {/* RIGHT: TABS INTERFACE WITH GLASS CARDS */}
          <div className="lg:col-span-7 h-full flex flex-col justify-between min-h-[350px]">
            <div className="rounded-[28px] border border-white/[0.06] bg-[#0E111A]/40 backdrop-blur-2xl p-5 flex flex-col h-[355px] overflow-hidden justify-between text-left">
              
              {/* Tab options bar */}
              <div className="flex border-b border-white/[0.05] pb-2 mb-4 overflow-x-auto scrollbar-hide gap-1.5">
                {[
                  { id: 'cover', label: 'Space', icon: Music },
                  { id: 'lyrics', label: 'Lyrics', icon: AlignLeft },
                  { id: 'effects', label: 'Audio DSP', icon: Sliders },
                  { id: 'assistant', label: 'AI Assistant', icon: Sparkles },
                  { id: 'comments', label: 'Board', icon: MessageSquare }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`relative flex items-center space-x-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg flex-shrink-0 ${
                      activeTab === t.id ? 'text-[#00F5FF] bg-white/[0.03]' : 'text-neutral-500 hover:text-white'
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Viewport viewport */}
              <div className="flex-1 overflow-hidden relative">
                
                {/* NOW PLAYING FEED */}
                {activeTab === 'cover' && (
                  <div className="flex flex-col h-full justify-between py-1.5">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#00F5FF] bg-[#00F5FF]/10 px-2.5 py-0.5 rounded-full border border-[#00F5FF]/20">
                        {currentTrack.sourceType} DECODER ACTIVE
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mt-2.5 truncate">{currentTrack.title}</h2>
                      <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider mt-0.5 truncate">{currentTrack.artist?.name}</p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.01] border border-white/[0.04] p-3 text-left nothing-dots mt-4">
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#00F5FF] flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-[#00F5FF] animate-pulse" />
                        <span>AI Space Match preset details</span>
                      </span>
                      <p className="text-[10px] text-neutral-350 leading-relaxed mt-1 font-bold">
                        Synthesizer mode added spatial width bias to align with rainy afternoon coding streaks in India. Expect 98% resonance confidence.
                      </p>
                    </div>
                  </div>
                )}

                {/* SYNCHRONIZED LYRICS */}
                {activeTab === 'lyrics' && (
                  <div 
                    ref={lyricsContainerRef} 
                    className="h-full overflow-y-auto space-y-4 pr-1 scrollbar-hide pb-20"
                  >
                    {MOCK_LYRICS.map((line, idx) => {
                      const isActive = idx === activeLyricIdx;
                      return (
                        <div
                          key={idx}
                          className={`text-xs font-black transition-all duration-300 py-1 cursor-pointer origin-left ${
                            isActive 
                              ? 'text-[#00F5FF] scale-105 drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]' 
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
                    })}
                  </div>
                )}

                {/* PARAMETRIC DSP */}
                {activeTab === 'effects' && (
                  <div className="grid grid-cols-2 gap-2.5 h-full overflow-y-auto pr-1">
                    {[
                      { key: 'spatial3D', label: 'Spatial 3D Sound', desc: 'Binaural head-stage' },
                      { key: 'bassBoost', label: 'Deep Bass Boost', desc: 'Subwoofer dynamic thud' },
                      { key: 'vocalBoost', label: 'Vocal Presence', desc: 'Accentuates voice clarity' },
                      { key: 'concertHall', label: 'Concert Reverb', desc: 'Adds chamber ambience' }
                    ].map(fx => {
                      const isActive = audioEffects[fx.key];
                      return (
                        <div
                          key={fx.key}
                          onClick={() => toggleEffect(fx.key)}
                          className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${
                            isActive
                              ? 'border-[#00F5FF] bg-[#00F5FF]/5 text-[#00F5FF]'
                              : 'border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] text-neutral-450 hover:text-white'
                          }`}
                        >
                          <h4 className="text-[10px] font-black uppercase tracking-wider">{fx.label}</h4>
                          <p className="text-[8px] text-neutral-500 font-bold mt-0.5 leading-normal">{fx.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AI COMPANION */}
                {activeTab === 'assistant' && (
                  <div className="flex flex-col h-full justify-between py-1 text-xs">
                    <div className="bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl space-y-2">
                      <div className="flex items-center gap-1 text-[#00F5FF] font-black uppercase text-[8px] tracking-wider">
                        <Sparkles className="h-3 w-3" />
                        <span>NeoTune AI Conversation preset</span>
                      </div>
                      <p className="text-neutral-350 leading-relaxed font-bold text-[10px]">
                        &ldquo;I have disabled high frequency noise and enabled Spatial stage presets for your headphones. The energy index is perfectly balanced for focus work.&rdquo;
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ask AI DJ to adjust EQ, change vibes..." 
                        className="flex-1 bg-black border border-white/[0.05] rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-[#00F5FF]" 
                      />
                      <button className="rounded-xl bg-[#00F5FF] text-black px-4 py-2 font-black uppercase text-[9px]">Send</button>
                    </div>
                  </div>
                )}

                {/* COMMENTS BOARD */}
                {activeTab === 'comments' && (
                  <div className="flex flex-col h-full justify-between py-1">
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-2">
                      {comments.map((c, i) => (
                        <div key={i} className="p-2 rounded-xl bg-white/[0.01] border border-white/[0.03] text-left">
                          <div className="flex justify-between text-[8px] text-neutral-500 font-black uppercase tracking-wider">
                            <span>{c.user}</span>
                            <span>{c.likes} Likes</span>
                          </div>
                          <p className="text-[10px] text-neutral-300 font-bold mt-0.5 leading-normal">{c.text}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add to the board..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        className="flex-1 bg-black border border-white/[0.05] rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-[#00F5FF]"
                      />
                      <button type="submit" className="rounded-xl bg-[#00F5FF] text-black px-4 py-2 font-black uppercase text-[9px]">Post</button>
                    </form>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM PART: PLAYER CONTROLS */}
        <div className="space-y-5">
          
          {/* PROGRESS SLIDER */}
          <div className="space-y-1">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress || 0}
                onChange={handleSeek}
                className="w-full h-1 appearance-none rounded-full cursor-pointer bg-white/[0.12] outline-none accent-[#00F5FF]
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white"
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold text-neutral-500 tracking-widest font-mono">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* MAIN MEDIA PLAY ACTIONS BAR */}
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`p-2 transition-colors ${shuffle ? 'text-[#00F5FF]' : 'text-neutral-500 hover:text-white'}`}
            >
              <Shuffle className="h-5 w-5" />
            </button>

            <button onClick={prevTrack} className="text-neutral-450 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2">
              <SkipBack className="h-7 w-7 fill-current stroke-none" />
            </button>

            <button
              onClick={() => setPlaying(!isPlaying)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] text-black shadow-lg shadow-[#00F5FF]/10 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 fill-black stroke-black" />
              ) : (
                <Play className="h-7 w-7 fill-black stroke-black translate-x-[1px]" />
              )}
            </button>

            <button onClick={nextTrack} className="text-neutral-455 hover:text-white transition-transform hover:scale-105 active:scale-95 p-2">
              <SkipForward className="h-7 w-7 fill-current stroke-none" />
            </button>

            <button
              onClick={() => {
                if (repeatMode === 'off') setRepeatMode('all');
                else if (repeatMode === 'all') setRepeatMode('one');
                else setRepeatMode('off');
              }}
              className={`relative p-2 transition-colors ${repeatMode !== 'off' ? 'text-[#00F5FF]' : 'text-neutral-500 hover:text-white'}`}
            >
              <Repeat className="h-5 w-5" />
              {repeatMode === 'one' && (
                <span className="absolute top-[2px] right-[2px] flex h-3 w-3 items-center justify-center rounded-full bg-[#00F5FF] text-[7px] font-black text-black">
                  1
                </span>
              )}
            </button>
          </div>

          {/* LOWER DECK: LIKE, VOLUME, SPEED */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-white/[0.04] items-center">
            
            {/* LIKE */}
            <div className="flex justify-center md:justify-start">
              <button
                onClick={handleLikeToggle}
                disabled={likeLoading}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all border ${
                  isLiked
                    ? 'bg-pink-500/10 border-pink-500/25 text-pink-400'
                    : 'border-white/[0.05] bg-white/[0.02] text-neutral-450 hover:text-white'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-pink-400 stroke-pink-400' : ''}`} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>
            </div>

            {/* VOLUME */}
            <div className="flex items-center space-x-3 max-w-xs mx-auto w-full justify-center">
              <button onClick={toggleMute} className="text-neutral-500 hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="h-1 flex-1 appearance-none bg-white/[0.12] rounded-full outline-none accent-[#00F5FF]
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white"
              />
            </div>

            {/* PLAYBACK SPEED */}
            <div className="flex items-center justify-center md:justify-end gap-1">
              {[0.75, 1, 1.25, 1.5].map(rate => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`rounded-lg px-2.5 py-1 text-[8px] font-black uppercase border transition-colors ${
                    playbackRate === rate
                      ? 'bg-[#00F5FF] border-[#00F5FF] text-black'
                      : 'border-white/[0.04] hover:bg-white/[0.02] text-neutral-450 hover:text-white'
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueue(false)}
              className="fixed inset-0 z-40 bg-black"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm border-l border-white/[0.08] bg-[#0E111A]/95 backdrop-blur-2xl p-5 shadow-2xl flex flex-col justify-between text-left"
            >
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Upcoming Queue</h3>
                  <span className="text-[9px] text-neutral-500 font-mono font-bold">{queue.length} Songs</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                  {queue.map((track, idx) => {
                    const isActive = track.id === currentTrack.id;
                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        onClick={() => playTrack(track, queue)}
                        className={`flex items-center justify-between rounded-xl p-2.5 transition-all cursor-pointer border ${
                          isActive 
                            ? 'bg-[#00F5FF]/10 border-[#00F5FF]/20 text-[#00F5FF]' 
                            : 'border-transparent hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 truncate">
                          <span className="text-[9px] text-neutral-500 font-bold w-4 text-center">{idx + 1}</span>
                          <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg">
                            <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
                          </div>
                          <div className="truncate text-left">
                            <p className="truncate text-xs font-black uppercase tracking-wider text-white leading-normal">{track.title}</p>
                            <p className="truncate text-[9px] text-neutral-500 font-bold uppercase tracking-wider leading-normal mt-0.5">{track.artist?.name}</p>
                          </div>
                        </div>
                        {isActive && <span className="text-[8px] font-black uppercase tracking-wider animate-pulse text-[#00F5FF]">Playing</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/[0.05] pt-3 mt-3">
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-full rounded-xl border border-white/[0.08] hover:border-white/[0.15] py-2.5 text-[10px] font-black uppercase transition-all text-neutral-300 hover:text-white text-center"
                >
                  Close Queue
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
