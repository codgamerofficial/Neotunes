'use client';

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Heart, 
  Download, 
  Plus, 
  Sparkles, 
  Volume2, 
  Radio,
  Clock,
  ArrowRight,
  BookmarkPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import ImageWithFallback from './ImageWithFallback';
import { usePlaybackStore } from '@/store/playback-store';

export interface Track {
  id: string;
  title: string;
  artist: { name: string; id?: string; avatarUrl?: string };
  album?: { id?: string; name: string; coverUrl?: string; releaseDate?: string };
  durationMs: number;
  coverUrl?: string;
  sourceType: 'youtube' | 'cloud';
  sourceId?: string;
  isHQ?: boolean;
  explicit?: boolean;
  popularity?: number;
  streamCount?: string; // e.g. "1.2M streams"
  trend?: 'up' | 'down' | 'new' | 'flat';
  aiScore?: number; // e.g. 98 representing 98% AI match
  aiReason?: string; // e.g. "Based on your lofi coding habits"
  genre?: string;
}

interface PremiumTrackCardProps {
  track: Track;
  onClick: () => void;
  variant?: 'square' | 'horizontal' | 'featured' | 'circle' | 'video' | 'compact' | 'glass' | 'stack' | 'aiMatch' | 'live' | 'hero';
  index?: number; // Used for lists/charts index number
}

export default function PremiumTrackCard({ track, onClick, variant = 'square', index }: PremiumTrackCardProps) {
  const { currentTrack, isPlaying, playTrack, setPlaying } = usePlaybackStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      setPlaying(!isPlaying);
    } else {
      onClick();
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloaded(!isDownloaded);
  };

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------------------------
  // 1. HERO WIDE CARD
  // ----------------------------------------------------------------------
  if (variant === 'hero') {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        onClick={onClick}
        className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-[#0E111A] via-[#07090D] to-[#150D20] p-6 flex flex-col sm:flex-row items-center gap-6 cursor-pointer shadow-2xl hover:border-[#00F5FF]/30 transition-all duration-300 w-full text-left reflection-overlay"
      >
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-[#00F5FF]/5 blur-[70px] pointer-events-none" />
        <div className="relative h-32 w-32 rounded-2xl overflow-hidden bg-neutral-900 flex-shrink-0 shadow-md">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <button onClick={handlePlayClick} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] text-black shadow-xl transform scale-90 group-hover:scale-100 transition-transform active:scale-95 duration-200">
              {isCurrentPlaying ? <Pause className="h-5 w-5 fill-black stroke-black" /> : <Play className="h-5 w-5 fill-black stroke-black translate-x-[0.5px]" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between h-full space-y-3 min-w-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-wider text-[#00F5FF] bg-[#00F5FF]/10 px-2 py-0.5 rounded-full border border-[#00F5FF]/20">
                AI Space Choice
              </span>
              {track.isHQ && <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">LOSSLESS</span>}
            </div>
            <h3 className="text-xl font-black text-white leading-tight truncate group-hover:text-[#00F5FF] transition-colors">{track.title}</h3>
            <p className="text-xs text-neutral-450 font-bold truncate">{track.artist.name} · {track.album?.name || 'Single'}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-3 text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
              <span className="bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">{track.sourceType}</span>
              <span>{formatDuration(track.durationMs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLikeClick} className={`p-2 rounded-full border transition-all ${isLiked ? 'bg-[#00F5FF]/10 border-[#00F5FF]/30 text-[#00F5FF]' : 'border-white/[0.06] bg-neutral-900/40 text-neutral-500 hover:text-white'}`}>
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-[#00F5FF]' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 2. GLASS CARD
  // ----------------------------------------------------------------------
  if (variant === 'glass') {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        onClick={onClick}
        className="group relative overflow-hidden rounded-[20px] vision-glass p-4 flex flex-col justify-between h-full cursor-pointer hover:border-[#00F5FF]/30 transition-all duration-300 w-full text-left"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900/40">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            <button onClick={handlePlayClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00F5FF] text-black shadow-lg">
              {isCurrentPlaying ? <Pause className="h-4.5 w-4.5 fill-black stroke-black" /> : <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />}
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <h4 className="text-xs font-black text-white truncate">{track.title}</h4>
          <p className="text-[10px] text-neutral-455 font-bold truncate">{track.artist.name}</p>
        </div>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 3. COMPACT CARD
  // ----------------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div 
        onClick={onClick}
        className="group flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors w-full text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-8 w-8 rounded overflow-hidden bg-neutral-900 flex-shrink-0">
            <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <Play className="h-3 w-3 fill-white stroke-white translate-x-[0.5px]" />
            </div>
          </div>
          <div className="min-w-0">
            <h4 className={`text-xs font-black truncate ${isCurrent ? 'text-[#00F5FF]' : 'text-white'}`}>{track.title}</h4>
            <p className="text-[9px] text-neutral-500 font-bold truncate">{track.artist.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {track.isHQ && <span className="text-[7px] text-[#00F5FF] bg-[#00F5FF]/10 px-1 rounded">HQ</span>}
          <span className="text-[9px] font-mono text-neutral-505 font-bold">{formatDuration(track.durationMs)}</span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // 4. STACKED PLAYLIST CARD
  // ----------------------------------------------------------------------
  if (variant === 'stack') {
    return (
      <div className="card-stack w-full">
        <motion.div
          whileHover={{ y: -4 }}
          onClick={onClick}
          className="group relative w-full rounded-2xl bg-[#0E111A]/95 border border-white/[0.06] p-3.5 cursor-pointer text-left hover:border-[#00F5FF]/30 transition-all duration-300"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900">
            <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <button onClick={handlePlayClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#00F5FF] to-[#9B5CFF] text-black shadow-lg">
                <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />
              </button>
            </div>
          </div>
          <h4 className="text-xs font-black text-white mt-3 truncate">{track.title}</h4>
          <p className="text-[9px] text-neutral-500 font-bold truncate mt-0.5">{track.artist.name} · Queue Stack</p>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // 5. AI MATCH CARD
  // ----------------------------------------------------------------------
  if (variant === 'aiMatch') {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        onClick={onClick}
        className="group relative w-full rounded-2xl bg-gradient-to-br from-[#0E111A] to-[#07090D] border border-white/[0.04] p-3.5 flex flex-col justify-between h-full cursor-pointer hover:border-[#9B5CFF]/30 shadow-md transition-all duration-300 text-left"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
          
          {/* AI Match Glow Tag */}
          <span className="absolute top-2 left-2 rounded-full bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] text-black text-[8px] font-black px-2 py-0.5 shadow-md flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 fill-black" />
            <span>{track.aiScore || 98}% Match</span>
          </span>

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            <button onClick={handlePlayClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-lg">
              <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <h4 className="text-xs font-black text-white truncate leading-none">{track.title}</h4>
          <p className="text-[10px] text-neutral-450 font-bold truncate leading-none">{track.artist.name}</p>
          {track.aiReason && (
            <p className="text-[8px] text-[#9B5CFF] font-black uppercase tracking-wider mt-1 truncate">
              {track.aiReason}
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 6. LIVE CARD
  // ----------------------------------------------------------------------
  if (variant === 'live') {
    return (
      <motion.div
        whileHover={{ y: -4 }}
        onClick={onClick}
        className="group relative w-full rounded-2xl bg-[#0E111A]/90 border border-white/[0.04] p-3.5 flex flex-col justify-between h-full cursor-pointer hover:border-[#00F5FF]/30 transition-all duration-300 text-left"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
          
          {/* Pulsing Live Badge */}
          <span className="absolute top-2 right-2 rounded bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white tracking-widest uppercase flex items-center gap-1 shadow-md">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span>Live</span>
          </span>

          {/* Equalizer overlay */}
          <div className="absolute inset-x-0 bottom-2 flex justify-center items-end gap-0.5 h-6 opacity-80 pointer-events-none px-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 bg-[#00F5FF] rounded-full animate-[equalize_0.5s_infinite_alternate]"
                style={{ height: `${[10, 24, 16, 20, 8, 14, 22, 12, 18, 10][i]}px`, animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <h4 className="text-xs font-black text-white truncate">{track.title}</h4>
          <p className="text-[10px] text-neutral-455 font-bold truncate">{track.artist.name} · Station</p>
        </div>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 7. HORIZONTAL CHART / LIST CARD
  // ----------------------------------------------------------------------
  if (variant === 'horizontal') {
    return (
      <motion.div
        whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.01)' }}
        onClick={onClick}
        className="group flex items-center gap-3.5 rounded-xl border border-transparent hover:border-white/[0.03] p-2 cursor-pointer transition-all duration-300 w-full text-left"
      >
        {index !== undefined && (
          <div className="flex items-center justify-center w-7 flex-shrink-0">
            {track.trend === 'up' && <span className="text-[8px] text-emerald-400 font-bold mr-1">▲</span>}
            {track.trend === 'down' && <span className="text-[8px] text-rose-500 font-bold mr-1">▼</span>}
            {track.trend === 'new' && <span className="text-[7px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded mr-1">NEW</span>}
            <span className="text-xs font-black text-neutral-500">#{index}</span>
          </div>
        )}

        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            <button onClick={handlePlayClick} className="text-white transform scale-90 group-hover:scale-100 transition-transform">
              {isCurrentPlaying ? <Pause className="h-4 w-4 fill-white stroke-white" /> : <Play className="h-4 w-4 fill-white stroke-white translate-x-[0.5px]" />}
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className={`text-xs font-black truncate leading-tight ${isCurrent ? 'text-[#00F5FF]' : 'text-white'}`}>{track.title}</h4>
            {track.isHQ && <span className="text-[7px] text-purple-400 bg-purple-500/10 px-1 rounded flex-shrink-0">HQ</span>}
          </div>
          <p className="text-[9px] text-neutral-450 font-bold truncate mt-0.5">{track.artist.name}</p>
        </div>

        {/* Animated mini visualizer (Only when playing) */}
        {isCurrentPlaying && (
          <div className="flex items-end gap-0.5 h-3 flex-shrink-0 px-1.5">
            <div className="w-0.5 bg-[#00F5FF] rounded-full animate-[equalize_0.6s_infinite_alternate] h-2" />
            <div className="w-0.5 bg-[#00F5FF] rounded-full animate-[equalize_0.8s_infinite_alternate_0.1s] h-3" />
            <div className="w-0.5 bg-[#00F5FF] rounded-full animate-[equalize_0.5s_infinite_alternate_0.2s] h-1.5" />
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handleLikeClick} className={`p-1 rounded-full ${isLiked ? 'text-[#00F5FF]' : 'text-neutral-550 hover:text-white'}`}>
            <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-[#00F5FF]' : ''}`} />
          </button>
        </div>

        <span className="text-[9px] font-mono text-neutral-500 font-bold w-10 text-right">{formatDuration(track.durationMs)}</span>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 8. SQUARE CARD (STANDARD ALBUM CARD WITH DETAILED HOVER WAVEFORM)
  // ----------------------------------------------------------------------
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onClick}
      className="group relative w-full rounded-2xl bg-[#0E111A]/50 hover:bg-[#161922]/75 border border-white/[0.04] hover:border-[#00F5FF]/20 overflow-hidden hover:shadow-2xl hover:shadow-[#00F5FF]/5 transition-all duration-300 cursor-pointer p-3 flex flex-col h-full text-left"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900 shadow-md">
        <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-750 ease-out" />
        
        {/* Hover Waveform Overlay */}
        <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center items-end gap-0.5 opacity-0 group-hover:opacity-85 transition-opacity duration-300 h-6 pointer-events-none px-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-[#00F5FF] rounded-full"
              style={{
                height: `${[10, 24, 16, 20, 8, 14, 22, 12, 18, 10, 16, 12][i]}px`,
                animation: isCurrentPlaying ? `equalize 0.${5 + (i % 4)}s infinite alternate` : 'none',
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handlePlayClick} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#00F5FF] to-[#9B5CFF] shadow-xl transform scale-90 group-hover:scale-100 transition-transform active:scale-95 duration-200 text-black">
            {isCurrentPlaying ? <Pause className="h-4.5 w-4.5 fill-black stroke-black" /> : <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />}
          </button>
        </div>

        {track.isHQ && (
          <span className="absolute top-2 right-2 rounded-full bg-[#00F5FF]/10 border border-[#00F5FF]/30 px-2 py-0.5 text-[8px] font-black text-[#00F5FF] uppercase tracking-wider">
            Hi-Res
          </span>
        )}
      </div>

      <div className="mt-3 flex-grow flex flex-col justify-between font-sans min-w-0">
        <div className="space-y-0.5">
          <h4 className={`text-xs font-black leading-tight truncate ${isCurrent ? 'text-[#00F5FF]' : 'text-white'}`}>{track.title}</h4>
          <p className="text-[9px] text-neutral-455 truncate font-semibold">{track.artist.name}</p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.03] text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
          <span className="bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.04]">{track.sourceType}</span>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={handleLikeClick} className={`p-1 hover:text-white ${isLiked ? 'text-[#00F5FF]' : 'text-neutral-550'}`}>
              <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-[#00F5FF]' : ''}`} />
            </button>
          </div>
          <span className="font-mono">{formatDuration(track.durationMs)}</span>
        </div>
      </div>
    </motion.div>
  );
}
