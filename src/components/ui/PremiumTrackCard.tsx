'use client';

import React, { useState } from 'react';
import { Play, Pause, Heart, Download, Plus, Share2, Sparkles, Volume2 } from 'lucide-react';
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
}

interface PremiumTrackCardProps {
  track: Track;
  onClick: () => void;
  variant?: 'square' | 'horizontal' | 'featured' | 'circle' | 'video';
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
    onClick();
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
  // 1. FEATURED 21:9 WIDE CARD
  // ----------------------------------------------------------------------
  if (variant === 'featured') {
    return (
      <motion.div
        whileHover={{ y: -6, scale: 1.01 }}
        onClick={onClick}
        className="group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#101010]/80 backdrop-blur-xl p-6 flex flex-col md:flex-row items-center gap-6 cursor-pointer shadow-2xl hover:border-cyan-500/35 transition-all duration-300 w-full text-left"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="relative h-44 w-44 rounded-2xl overflow-hidden bg-neutral-900 flex-shrink-0 shadow-lg">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <button onClick={handlePlayClick} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow-xl transform scale-90 group-hover:scale-100 transition-transform active:scale-95 duration-300">
              {isCurrentPlaying ? <Pause className="h-6 w-6 fill-black stroke-black" /> : <Play className="h-6 w-6 fill-black stroke-black translate-x-[1px]" />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between h-full space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">Featured Release</span>
              {track.isHQ && <span className="text-[8px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">LOSSLESS</span>}
            </div>
            <h3 className="text-2xl font-black text-white leading-tight group-hover:text-cyan-400 transition-colors">{track.title}</h3>
            <p className="text-sm text-neutral-400 font-bold">{track.artist.name} · {track.album?.name || 'Single'}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-3 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
              <span className="bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.04]">{track.sourceType}</span>
              <span>{formatDuration(track.durationMs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLikeClick} className={`p-2 rounded-full border transition-all ${isLiked ? 'bg-cyan-500/10 border-cyan-500/35 text-cyan-400' : 'border-white/[0.06] bg-neutral-900/40 text-neutral-450 hover:text-white'}`}>
                <Heart className={`h-4.5 w-4.5 ${isLiked ? 'fill-cyan-400' : ''}`} />
              </button>
              <button onClick={handleDownloadClick} className={`p-2 rounded-full border transition-all ${isDownloaded ? 'bg-purple-500/10 border-purple-500/35 text-purple-400' : 'border-white/[0.06] bg-neutral-900/40 text-neutral-450 hover:text-white'}`}>
                <Download className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 2. HORIZONTAL LIST / CHART CARD
  // ----------------------------------------------------------------------
  if (variant === 'horizontal') {
    return (
      <motion.div
        whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.02)' }}
        onClick={onClick}
        className="group flex items-center gap-4 rounded-xl border border-transparent hover:border-white/[0.04] p-2.5 cursor-pointer transition-all duration-300 w-full text-left"
      >
        {index !== undefined && (
          <div className="flex items-center justify-center w-8 flex-shrink-0">
            {track.trend === 'up' && <span className="text-[9px] text-emerald-450 font-bold mr-1">↑</span>}
            {track.trend === 'down' && <span className="text-[9px] text-rose-500 font-bold mr-1">↓</span>}
            {track.trend === 'new' && <span className="text-[8px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded mr-1">NEW</span>}
            <span className="text-sm font-black text-neutral-500">#{index}</span>
          </div>
        )}

        <div className="relative h-11 w-11 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            <button onClick={handlePlayClick} className="text-white transform scale-90 group-hover:scale-100 transition-transform">
              {isCurrentPlaying ? <Pause className="h-4 w-4 fill-white stroke-white" /> : <Play className="h-4 w-4 fill-white stroke-white translate-x-[0.5px]" />}
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-xs font-black truncate leading-normal ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white'}`}>{track.title}</h4>
            {track.explicit && <span className="text-[8px] bg-white/[0.06] border border-white/[0.08] text-neutral-400 font-black px-1 rounded">E</span>}
            {track.isHQ && <span className="text-[8px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 rounded">HQ</span>}
          </div>
          <p className="text-[10px] text-neutral-450 font-bold truncate mt-0.5">{track.artist.name} {track.album?.name && `· ${track.album.name}`}</p>
        </div>

        {/* Animated mini visualizer (Only when playing) */}
        {isCurrentPlaying && (
          <div className="flex items-end gap-0.5 h-3 flex-shrink-0 px-2">
            <div className="w-0.5 bg-cyan-400 rounded-full animate-[equalize_0.6s_infinite_alternate] h-2.5" />
            <div className="w-0.5 bg-cyan-450 rounded-full animate-[equalize_0.8s_infinite_alternate_0.1s] h-3.5" />
            <div className="w-0.5 bg-cyan-400 rounded-full animate-[equalize_0.5s_infinite_alternate_0.2s] h-2" />
          </div>
        )}

        {track.streamCount && (
          <span className="hidden sm:inline text-[10px] font-mono text-neutral-500 font-bold w-20 text-right">{track.streamCount}</span>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handleLikeClick} className={`p-1.5 rounded-full ${isLiked ? 'text-cyan-400' : 'text-neutral-500 hover:text-white'}`}>
            <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-cyan-400' : ''}`} />
          </button>
          <button onClick={handleDownloadClick} className="p-1.5 rounded-full text-neutral-500 hover:text-white">
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-[10px] font-mono text-neutral-500 font-bold w-12 text-right">{formatDuration(track.durationMs)}</span>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 3. CIRCLE ARTIST CARD
  // ----------------------------------------------------------------------
  if (variant === 'circle') {
    return (
      <motion.div
        whileHover={{ y: -6 }}
        onClick={onClick}
        className="group flex flex-col items-center text-center p-3 cursor-pointer rounded-2xl transition-all duration-300"
      >
        <div className="relative h-28 w-28 md:h-32 md:w-32 rounded-full overflow-hidden bg-neutral-900 border border-white/[0.04] group-hover:border-cyan-500/30 group-hover:shadow-[0_0_20px_rgba(0,245,255,0.1)] transition-all duration-500 shadow-md">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.artist.name} fill className="object-cover rounded-full" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 rounded-full">
            <button onClick={handlePlayClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-black shadow-lg">
              <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />
            </button>
          </div>
        </div>
        <h4 className="text-xs font-black text-white mt-4 truncate w-full group-hover:text-cyan-400 transition-colors">{track.artist.name}</h4>
        <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-black mt-1">Verified Artist</span>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 4. VIDEO CARD (16:9)
  // ----------------------------------------------------------------------
  if (variant === 'video') {
    return (
      <motion.div
        whileHover={{ y: -6 }}
        onClick={onClick}
        className="group flex flex-col rounded-2xl bg-neutral-900/30 border border-white/[0.04] hover:border-cyan-500/25 p-3.5 cursor-pointer transition-all duration-300 text-left"
      >
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-900 shadow-md">
          <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <button onClick={handlePlayClick} className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-450 text-black shadow-xl">
              <Play className="h-5 w-5 fill-black stroke-black translate-x-[0.5px]" />
            </button>
          </div>
          <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono font-bold text-white shadow">{formatDuration(track.durationMs)}</span>
        </div>
        <h4 className="text-xs font-black text-white mt-3 truncate group-hover:text-cyan-400 transition-colors leading-normal">{track.title}</h4>
        <p className="text-[10px] text-neutral-455 font-bold truncate mt-1">{track.artist.name} · Music Video</p>
      </motion.div>
    );
  }

  // ----------------------------------------------------------------------
  // 5. SQUARE CARD (STANDARD SPOTIFY/APPLE ALBUM CARD)
  // ----------------------------------------------------------------------
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={onClick}
      className="group relative w-full rounded-2xl bg-[#101010]/50 hover:bg-[#161616]/75 border border-white/[0.04] hover:border-cyan-500/30 overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-300 cursor-pointer p-3.5 flex flex-col h-full text-left"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900 shadow-md">
        <ImageWithFallback src={track.coverUrl || '/images/default-cover.png'} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
        
        {/* Hover Waveform Overlay */}
        <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center items-end gap-0.5 opacity-0 group-hover:opacity-80 transition-opacity duration-300 h-6 pointer-events-none px-4">
          {Array.from({ length: 12 }).map((_, i) => {
            const h = [10, 24, 16, 20, 8, 14, 22, 12, 18, 10, 16, 12][i];
            return (
              <div
                key={i}
                className="w-0.5 bg-cyan-400 rounded-full"
                style={{
                  height: `${h}px`,
                  animation: isCurrentPlaying ? `equalize 0.${5 + (i % 4)}s infinite alternate` : 'none',
                  animationDelay: `${i * 0.05}s`
                }}
              />
            );
          })}
        </div>

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handlePlayClick} className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 shadow-xl transform scale-90 group-hover:scale-100 transition-transform active:scale-95 duration-300">
            {isCurrentPlaying ? <Pause className="h-4.5 w-4.5 fill-black stroke-black" /> : <Play className="h-4.5 w-4.5 fill-black stroke-black translate-x-[0.5px]" />}
          </button>
        </div>

        {/* Audio quality banner overlay */}
        {track.isHQ && (
          <span className="absolute top-2 right-2 rounded-full bg-[#8B5CFF]/15 border border-[#8B5CFF]/30 px-2 py-0.5 text-[8px] font-black text-[#8B5CFF] uppercase tracking-wider">
            Lossless
          </span>
        )}
      </div>

      <div className="mt-3 flex-grow flex flex-col justify-between font-sans">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h4 className={`text-xs font-black leading-tight line-clamp-1 flex-1 ${isCurrent ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.3)]' : 'text-white'}`}>{track.title}</h4>
            {track.explicit && <span className="text-[8px] bg-white/[0.06] border border-white/[0.08] text-neutral-400 font-black px-1 rounded flex-shrink-0">E</span>}
          </div>
          <p className="text-[10px] text-neutral-400 line-clamp-1 font-semibold">{track.artist.name}</p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.03] text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
          <span className="bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.04]">{track.sourceType}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={handleLikeClick} className={`p-1 hover:text-white ${isLiked ? 'text-cyan-400' : 'text-neutral-550'}`}>
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-cyan-400' : ''}`} />
            </button>
            <button onClick={handleDownloadClick} className="p-1 hover:text-white text-neutral-550">
              <Download className="h-3 w-3" />
            </button>
          </div>
          <span className="font-mono">{formatDuration(track.durationMs)}</span>
        </div>
      </div>
    </motion.div>
  );
}
