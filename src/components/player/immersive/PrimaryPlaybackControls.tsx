'use client';

import React from 'react';
import { usePlaybackStore } from '@/store/playback-store';

interface PrimaryPlaybackControlsProps {
  className?: string;
}

export default function PrimaryPlaybackControls({
  className = '',
}: PrimaryPlaybackControlsProps) {
  const { isPlaying, setPlaying, prevTrack, nextTrack } = usePlaybackStore();

  return (
    <div
      className={`w-full flex items-center justify-center gap-[clamp(24px,5vw,48px)] py-[clamp(0px,0.4vh,4px)] select-none ${className}`}
    >
      {/* Previous Track Button (44-48px touch area) */}
      <button
        onClick={prevTrack}
        aria-label="Previous track"
        title="Previous track"
        className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.06] active:scale-90 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
      >
        <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
          <path d="M11 5L3 12L11 19V5ZM20 5L12 12L20 19V5Z" />
        </svg>
      </button>

      {/* Dominant Hero Play / Pause Button with responsive clamp sizing */}
      <button
        onClick={() => setPlaying(!isPlaying)}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
        className={`w-[clamp(56px,7.5vh,76px)] h-[clamp(56px,7.5vh,76px)] min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center transition-all cursor-pointer relative group active:scale-95 shadow-[0_10px_35px_rgba(0,0,0,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050608] shrink-0 ${
          isPlaying
            ? 'bg-[#DFFF00] text-black hover:scale-105 shadow-[0_0_30px_rgba(223,255,0,0.35)]'
            : 'bg-white text-black hover:scale-105 shadow-[0_10px_30px_rgba(255,255,255,0.2)]'
        }`}
      >
        {isPlaying ? (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
            <rect x="5.5" y="4.5" width="4" height="15" rx="1.5" />
            <rect x="14.5" y="4.5" width="4" height="15" rx="1.5" />
          </svg>
        ) : (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-0.5 sm:ml-1" viewBox="0 0 24 24">
            <path d="M6 4.5V19.5C6 20.3 6.9 20.8 7.6 20.4L19.5 12.9C20.2 12.5 20.2 11.5 19.5 11.1L7.6 3.6C6.9 3.2 6 3.7 6 4.5Z" />
          </svg>
        )}
      </button>

      {/* Next Track Button (44-48px touch area) */}
      <button
        onClick={nextTrack}
        aria-label="Next track"
        title="Next track"
        className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.06] active:scale-90 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
      >
        <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
          <path d="M4 5L12 12L4 19V5ZM13 5L21 12L13 19V5Z" />
        </svg>
      </button>
    </div>
  );
}
