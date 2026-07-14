'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePlaybackStore } from '@/store/playback-store';
import { useLayoutStore } from '@/store/layout-store';
import { 
  X, 
  Music, 
  Sparkles, 
  Volume2, 
  Sliders, 
  Eye, 
  Disc, 
  SlidersHorizontal,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageWithFallback from '../ui/ImageWithFallback';

interface LyricLine {
  text: string;
  time: number; // in seconds
}

const mockLyricsDatabase: Record<string, LyricLine[]> = {
  // Kesariya (Arijit Singh)
  '6iBjgI6c7Bnt78v38e4a9v': [
    { text: "Muzhko itna bata de koi", time: 0 },
    { text: "Kaise tujhse dil na lagaye koi", time: 6 },
    { text: "Rabba ne tujhko banane mein", time: 13 },
    { text: "Kardi hai husn ki khaali tijoriyan", time: 19 },
    { text: "Kajal ki siyahi se likhi", time: 26 },
    { text: "Hain tune jaane kitno ki love storiyan", time: 32 },
    { text: "Kesariya tera ishq hai piya", time: 38 },
    { text: "Rang jaaun jo main haath lagaun", time: 45 },
    { text: "Din beete saara teri fikr mein", time: 51 },
    { text: "Rain saari teri khair manaun", time: 58 },
    { text: "Kesariya tera ishq hai piya...", time: 65 }
  ],
  // Blinding Lights (The Weeknd)
  '0VjIjW4GlUZAMYd2vXMi3b': [
    { text: "Yeah...", time: 0 },
    { text: "I've been tryna call", time: 6 },
    { text: "I've been on my own for long enough", time: 10 },
    { text: "Maybe you can show me how to love, maybe", time: 16 },
    { text: "I'm going through withdrawals", time: 22 },
    { text: "You don't even have to do too much", time: 26 },
    { text: "You can turn me on with just a touch, baby", time: 32 },
    { text: "I look around and Sin City's cold and empty", time: 38 },
    { text: "No one's around to judge me", time: 44 },
    { text: "I can't see clearly when you're gone", time: 49 },
    { text: "I said, ooh, I'm blinded by the lights", time: 54 },
    { text: "No, I can't sleep until I feel your touch", time: 60 }
  ],
  // Flowers (Miley Cyrus)
  'it_1674691586': [
    { text: "We were good, we were gold", time: 0 },
    { text: "Kinda dream that can't be sold", time: 4 },
    { text: "We were right 'til we weren't", time: 8 },
    { text: "Built a home and watched it burn", time: 12 },
    { text: "I didn't wanna leave you, I didn't wanna lie", time: 17 },
    { text: "Started to cry but then remembered I...", time: 22 },
    { text: "I can buy myself flowers", time: 27 },
    { text: "Write my name in the sand", time: 32 },
    { text: "Talk to myself for hours", time: 37 },
    { text: "Say things you don't understand", time: 41 },
    { text: "I can take myself dancing", time: 46 },
    { text: "And I can hold my own hand", time: 50 },
    { text: "Yeah, I can love me better than you can", time: 55 }
  ],
  // As It Was (Harry Styles)
  '4D7tIB1C03sfw5k049URrw': [
    { text: "Holdin' me back", time: 0 },
    { text: "Gravity's holdin' me back", time: 3 },
    { text: "I want you to hold out the palm of your hand", time: 6 },
    { text: "Why don't we leave it at that?", time: 10 },
    { text: "Nothin' to say", time: 14 },
    { text: "When everything gets in the way", time: 16 },
    { text: "Seems you cannot be replaced", time: 19 },
    { text: "And I'm the one who will stay, oh-oh-oh", time: 22 },
    { text: "In this world, it's just us", time: 26 },
    { text: "You know it's not the same as it was", time: 30 },
    { text: "In this world, it's just us", time: 34 },
    { text: "You know it's not the same as it was", time: 38 }
  ]
};

// Generic ambient lyrics fallback generator
function generateGenericLyrics(title: string, durationSec: number): LyricLine[] {
  const words = [
    "Feel the rhythm of the neon lights",
    "Writing code in the dead of the night",
    "Vibrations moving through the air",
    "Lost in the music without a care",
    "Bass keeps thumping, treble rises high",
    "Underneath the simulated sky",
    "Gradients shifting from blue to gold",
    "A brand new story waiting to unfold",
    "Saswata's coding mix playing on repeat",
    "Syncing up the pulses to the steady beat",
    "Focus deepens, flow state begins",
    "This is where the magic always wins",
    "Ending section of the track now near",
    "Melody fading, clean and clear"
  ];
  
  if (durationSec <= 0) durationSec = 180;
  const count = words.length;
  const step = durationSec / (count + 1);

  return words.map((text, idx) => ({
    text,
    time: Math.round(step * (idx + 0.5))
  }));
}

export default function RightContextPanel() {
  const { currentTrack, isPlaying, progress, duration } = usePlaybackStore();
  const { 
    isRightPanelOpen, 
    activeTab, 
    eqBass, 
    eqMid, 
    eqTreble, 
    reverb,
    isVisualizerEnabled,
    visualizerStyle,
    setRightPanelOpen, 
    setActiveTab, 
    setEq, 
    setReverb,
    setVisualizerEnabled,
    setVisualizerStyle
  } = useLayoutStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  // Sync lyrics when currentTrack changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([]);
      return;
    }
    const trackId = currentTrack.id;
    if (mockLyricsDatabase[trackId]) {
      setLyrics(mockLyricsDatabase[trackId]);
    } else {
      const durSec = duration || (currentTrack.durationMs / 1000) || 180;
      setLyrics(generateGenericLyrics(currentTrack.title, durSec));
    }
  }, [currentTrack, duration]);

  // Sync active lyric based on player progress
  useEffect(() => {
    if (lyrics.length === 0) {
      setActiveLyricIndex(-1);
      return;
    }
    // Find highest index where lyric.time <= progress
    let foundIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= progress) {
        foundIndex = i;
      } else {
        break;
      }
    }
    setActiveLyricIndex(foundIndex);

    // Scroll active lyric to center
    if (foundIndex !== -1 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.children[foundIndex] as HTMLElement;
      if (activeEl) {
        lyricsContainerRef.current.scrollTo({
          top: activeEl.offsetTop - lyricsContainerRef.current.clientHeight / 2 + activeEl.clientHeight / 2,
          behavior: 'smooth'
        });
      }
    }
  }, [progress, lyrics]);

  // Handle seeking by clicking a lyric line
  const handleLyricClick = (time: number) => {
    window.dispatchEvent(new CustomEvent('seek-track', { detail: { time } }));
  };

  // Canvas visualizer loop
  useEffect(() => {
    if (activeTab !== 'visualizer' || !canvasRef.current || !isVisualizerEnabled) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 320) * window.devicePixelRatio;
      canvas.height = (rect?.height || 260) * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation constants
    let phase = 0;
    const barsCount = 30;
    const barHeights = Array(barsCount).fill(5);
    const targetHeights = Array(barsCount).fill(5);
    
    // Wave particles
    const particles: { x: number; y: number; size: number; speed: number; speedY: number; opacity: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 320,
        y: Math.random() * 260,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.1,
        speedY: Math.random() * 0.4 - 0.2,
        opacity: Math.random() * 0.6 + 0.2
      });
    }

    const draw = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      // Bass, Mid, Treble factors from EQ store (adjusted to 0.4 - 1.6 range)
      const bassFact = 0.4 + (eqBass / 50) * 0.8;
      const midFact = 0.4 + (eqMid / 50) * 0.8;
      const trebleFact = 0.4 + (eqTreble / 50) * 0.8;
      
      // Overall activity speed/amp multiplier
      const energy = isPlaying ? (1 + reverb / 200) : 0.05;

      phase += 0.04 * energy;

      // 1. NEBULA STYLE (Floating particles)
      if (visualizerStyle === 'nebula') {
        const grad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w, h)/1.5);
        grad.addColorStop(0, '#100a20');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Core glow
        ctx.shadowBlur = 40;
        ctx.shadowColor = 'rgba(0, 245, 255, 0.4)';
        ctx.fillStyle = 'rgba(0, 245, 255, 0.03)';
        ctx.beginPath();
        ctx.arc(w/2, h/2, 45 + Math.sin(phase) * 15 * bassFact * energy, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Animate floating stars
        particles.forEach(p => {
          if (isPlaying) {
            p.x += p.speed * energy * midFact;
            p.y += p.speedY * energy * trebleFact;
            if (p.x > w) p.x = 0;
            if (p.y > h || p.y < 0) p.y = Math.random() * h;
          }
          ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + (bassFact - 1) * 0.2), 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 2. BARS STYLE (Frequency Analyzer)
      else if (visualizerStyle === 'bars') {
        const barWidth = w / barsCount - 4;
        
        for (let i = 0; i < barsCount; i++) {
          if (isPlaying) {
            // Simulated frequencies
            const factor = i < 8 ? bassFact : (i < 20 ? midFact : trebleFact);
            targetHeights[i] = (Math.sin(phase + i * 0.2) * 50 + 60) * factor * (Math.random() * 0.4 + 0.8) * energy;
          } else {
            targetHeights[i] = 4;
          }
          // Smooth transition
          barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.2;

          const bh = Math.max(3, barHeights[i]);
          const x = i * (barWidth + 4) + 2;
          const y = h - bh;

          // Gradient bar
          const barGrad = ctx.createLinearGradient(x, y, x, h);
          barGrad.addColorStop(0, '#00f5ff'); // Cyan
          barGrad.addColorStop(0.5, '#a855f7'); // Purple
          barGrad.addColorStop(1, 'rgba(0,0,0,0.1)');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, bh, 3);
          ctx.fill();
        }
      }

      // 3. WAVE STYLE (Neon Sine Waves)
      else if (visualizerStyle === 'wave') {
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f5ff';
        
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h/2 + Math.sin(x * 0.02 + phase) * 35 * midFact * energy 
                      + Math.sin(x * 0.05 - phase * 1.5) * 12 * trebleFact * energy;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw overlapping secondary dark-purple wave
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const y = h/2 + Math.sin(x * 0.015 - phase * 0.7) * 45 * bassFact * energy;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 4. RETRO STYLE (Circular Pulse)
      else if (visualizerStyle === 'retro') {
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = 60 + Math.sin(phase) * 6 * bassFact * energy;
        
        // Draw pulse circle
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a855f7';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw spikes
        const spikes = 60;
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2;
          const factor = i % 2 === 0 ? bassFact : midFact;
          const spikeLen = (Math.sin(phase * 2 + i * 0.5) * 20 + 22) * factor * energy;
          
          const startX = centerX + Math.cos(angle) * radius;
          const startY = centerY + Math.sin(angle) * radius;
          const endX = centerX + Math.cos(angle) * (radius + Math.max(1, spikeLen));
          const endY = centerY + Math.sin(angle) * (radius + Math.max(1, spikeLen));
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [activeTab, isPlaying, visualizerStyle, eqBass, eqMid, eqTreble, reverb, isVisualizerEnabled]);

  if (!isRightPanelOpen) return null;

  return (
    <motion.aside
      initial={{ x: 380, opacity: 0.8 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0.8 }}
      transition={{ type: 'spring', damping: 24, stiffness: 150 }}
      className="hidden lg:flex w-96 flex-col border-l border-neutral-900 bg-neutral-950/80 backdrop-blur-xl h-screen relative z-30 select-none flex-shrink-0"
    >
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-900">
        <div className="flex items-center space-x-2.5">
          <Disc className="h-4.5 w-4.5 text-cyan-400 animate-spin [animation-duration:8s]" />
          <h2 className="text-xs font-black uppercase tracking-wider text-white">Context Centre</h2>
        </div>
        <button 
          onClick={() => setRightPanelOpen(false)}
          className="text-neutral-450 hover:text-white p-1 rounded-lg bg-white/[0.02] border border-white/[0.04] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* TRACK COVER & INFO PIN */}
      {currentTrack ? (
        <div className="p-6 pb-4 flex items-center space-x-4 border-b border-white/[0.02] text-left">
          <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.06] flex-shrink-0 shadow-md">
            <ImageWithFallback src={currentTrack.coverUrl || ''} alt={currentTrack.title} fill sizes="56px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-white truncate leading-snug">{currentTrack.title}</h3>
            <p className="text-xs text-neutral-400 font-semibold truncate mt-0.5">{currentTrack.artist.name}</p>
          </div>
        </div>
      ) : (
        <div className="p-6 pb-4 flex items-center space-x-4 border-b border-white/[0.02] text-left">
          <div className="h-14 w-14 rounded-xl bg-neutral-900 border border-white/[0.06] flex items-center justify-center text-neutral-500">
            <Music className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-neutral-400 truncate">No track selected</h3>
            <p className="text-xs text-neutral-600 font-semibold truncate mt-0.5">Start a dashboard station</p>
          </div>
        </div>
      )}

      {/* TABS SELECTOR */}
      <div className="flex border-b border-neutral-900 px-2 py-1">
        {[
          { id: 'lyrics', label: 'Lyrics', icon: Sparkles },
          { id: 'visualizer', label: 'Visualizer', icon: Eye },
          { id: 'effects', label: 'EQ & FX', icon: Sliders }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors gap-1 ${
                isActive ? 'text-cyan-400' : 'text-neutral-450 hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE VIEWPORT */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        <AnimatePresence mode="wait">
          
          {/* 1. LYRICS PANEL */}
          {activeTab === 'lyrics' && (
            <motion.div
              key="lyrics-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 flex flex-col p-6"
            >
              {currentTrack ? (
                <div 
                  ref={lyricsContainerRef}
                  className="flex-1 overflow-y-auto space-y-7 pr-2 scrollbar-thin text-left font-sans select-none"
                  style={{ scrollPadding: '100px 0px' }}
                >
                  {lyrics.map((line, idx) => {
                    const isActive = idx === activeLyricIndex;
                    const isPassed = idx < activeLyricIndex;
                    return (
                      <p
                        key={idx}
                        onClick={() => handleLyricClick(line.time)}
                        className={`text-lg font-black leading-snug cursor-pointer transition-all duration-300 transform origin-left py-0.5 ${
                          isActive 
                            ? 'text-cyan-400 scale-102 drop-shadow-[0_0_12px_rgba(0,245,255,0.4)] opacity-100' 
                            : isPassed 
                              ? 'text-neutral-300 opacity-70 hover:opacity-100 hover:text-white'
                              : 'text-neutral-600 opacity-40 hover:opacity-100 hover:text-white'
                        }`}
                      >
                        {line.text}
                      </p>
                    );
                  })}
                  {lyrics.length === 0 && (
                    <p className="text-center text-xs font-semibold text-neutral-500 pt-12">
                      Resolving synced lyrics...
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                  <Sparkles className="h-8 w-8 text-neutral-600 animate-pulse" />
                  <p className="text-xs font-bold text-neutral-500">Lyrics will play in real-time</p>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. VISUALIZER PANEL */}
          {activeTab === 'visualizer' && (
            <motion.div
              key="visualizer-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 flex flex-col p-6 space-y-6"
            >
              {/* Preset Selector */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Visualizer Vibe</span>
                <div className="flex bg-neutral-900 border border-white/[0.04] p-0.5 rounded-lg">
                  {(['bars', 'wave', 'retro', 'nebula'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setVisualizerStyle(style)}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                        visualizerStyle === style 
                          ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow' 
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas viewport container */}
              <div className="flex-1 relative rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/80 overflow-hidden min-h-[220px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
                
                {!isVisualizerEnabled && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-center">
                    <p className="text-xs font-bold text-neutral-500">Visualizer disabled in settings</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-neutral-900 pt-4">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase block">Engine Rendering</span>
                  <span className="text-xs font-black text-cyan-400">Canvas 2D @ 60 FPS</span>
                </div>
                <button
                  onClick={() => setVisualizerEnabled(!isVisualizerEnabled)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                    isVisualizerEnabled 
                      ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5' 
                      : 'border-white/[0.06] text-neutral-500'
                  }`}
                >
                  {isVisualizerEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. EQ & FX PANEL */}
          {activeTab === 'effects' && (
            <motion.div
              key="effects-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-0 overflow-y-auto p-6 space-y-6 pr-2 scrollbar-thin text-left"
            >
              {/* Equalizer Sections */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-neutral-450 border-b border-neutral-900 pb-2">
                  <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Equalizer Band Controls</h4>
                </div>

                {[
                  { band: 'bass' as const, label: 'Bass Booster (60Hz - 250Hz)', val: eqBass },
                  { band: 'mid' as const, label: 'Vocal Midrange (500Hz - 2kHz)', val: eqMid },
                  { band: 'treble' as const, label: 'Treble Clarity (4kHz - 16kHz)', val: eqTreble }
                ].map((slider) => (
                  <div key={slider.band} className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-neutral-400">{slider.label}</span>
                      <span className="font-mono text-cyan-400 font-bold">{slider.val}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={slider.val}
                      onChange={(e) => setEq(slider.band, parseInt(e.target.value))}
                      className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                      style={{
                        background: `linear-gradient(to right, #00f5ff 0%, #00f5ff ${slider.val}%, #171717 ${slider.val}%, #171717 100%)`
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Environmental FX */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-neutral-450 border-b border-neutral-900 pb-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Reverb & Atmospheric FX</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-400">Reverb / Concert Hall Size</span>
                    <span className="font-mono text-purple-400 font-bold">{reverb}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={reverb}
                    onChange={(e) => setReverb(parseInt(e.target.value))}
                    className="w-full h-1 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${reverb}%, #171717 ${reverb}%, #171717 100%)`
                    }}
                  />
                </div>

                {/* Preset presets */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { name: 'Flat', bass: 50, mid: 50, treble: 50, reverb: 0 },
                    { name: 'Club Bass', bass: 85, mid: 45, treble: 65, reverb: 30 },
                    { name: 'Acoustic', bass: 40, mid: 70, treble: 75, reverb: 15 }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setEq('bass', preset.bass);
                        setEq('mid', preset.mid);
                        setEq('treble', preset.treble);
                        setReverb(preset.reverb);
                      }}
                      className="bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-white/[0.04] py-2 text-[10px] font-bold text-neutral-400 rounded-xl transition-all"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Audio Switch */}
              <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 flex items-center justify-between mt-4">
                <div className="text-left">
                  <h5 className="text-xs font-bold text-white">3D Spatial Soundstage</h5>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">Simulates surround acoustic expansion</p>
                </div>
                <div className="relative h-6 w-11 bg-neutral-900 rounded-full border border-white/[0.08] p-0.5 cursor-pointer flex items-center justify-start">
                  <div className="h-4.5 w-4.5 rounded-full bg-cyan-400 shadow shadow-cyan-500/20 translate-x-5 transition-transform" />
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
