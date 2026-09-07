'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { usePlaybackStore } from '@/store/playback-store';

interface VolumeControlProps {
  className?: string;
}

export default function VolumeControl({
  className = '',
}: VolumeControlProps) {
  const { volume, isMuted, setVolume, toggleMute } = usePlaybackStore();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const effectiveVolume = isMuted ? 0 : volume;
  const volumePercent = Math.round(effectiveVolume * 100);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopoverOpen]);

  // Update volume from pointer position
  const updateVolumeFromClientX = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      setVolume(clamped);
      if (isMuted && clamped > 0) {
        toggleMute();
      }
    },
    [setVolume, isMuted, toggleMute]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateVolumeFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateVolumeFromClientX(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      updateVolumeFromClientX(e.clientX);
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setVolume(Math.min(1, volume + 0.05));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setVolume(Math.max(0, volume - 0.05));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setVolume(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setVolume(1);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
    }
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center select-none ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Volume controls"
    >
      {/* Popover Card (anchored strictly ABOVE the volume trigger when popover is open) */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-60 p-3 rounded-2xl bg-[#11141A]/95 border border-white/15 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-white/70">
            <span className="text-[11px] uppercase tracking-wider font-bold text-white/50">Volume</span>
            <span className="tabular-nums font-mono text-[#DFFF00]">{volumePercent}%</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleMute}
              className="text-white/70 hover:text-white transition-colors cursor-pointer p-1"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon className="w-4 h-4" />
            </button>

            <div
              ref={sliderRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              role="slider"
              aria-label="Volume slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={volumePercent}
              className="relative flex-1 h-4 flex items-center cursor-pointer touch-none group"
            >
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-[#DFFF00] rounded-full transition-all duration-75"
                  style={{ width: `${volumePercent}%` }}
                />
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md pointer-events-none transition-transform group-hover:scale-125"
                style={{ left: `calc(${volumePercent}% - 7px)` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Bar: Clean, sleek horizontal volume slider */}
      <div className="w-full flex items-center gap-2.5 px-2 py-0.5 max-w-[280px]">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          className="text-white/60 hover:text-white transition-colors cursor-pointer p-2 active:scale-90 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
        >
          <VolumeIcon className={`w-4 h-4 ${isMuted || volume === 0 ? 'text-red-400' : ''}`} />
        </button>

        {/* Interactive Volume Slider */}
        <div
          ref={sliderRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="slider"
          aria-label="Volume slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={volumePercent}
          className="relative flex-1 h-4 flex items-center cursor-pointer group touch-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
        >
          <div className="h-1 w-full bg-white/20 group-hover:h-1.5 rounded-full relative overflow-hidden transition-all">
            <div
              className="h-full bg-white group-hover:bg-[#DFFF00] rounded-full transition-all duration-75"
              style={{ width: `${volumePercent}%` }}
            />
          </div>
          {/* Thumb indicator */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-sm pointer-events-none transition-transform ${
              isDragging ? 'scale-125' : 'scale-0 group-hover:scale-100'
            }`}
            style={{ left: `calc(${volumePercent}% - 6px)` }}
          />
        </div>

        {/* Volume Percentage / Max button */}
        <button
          onClick={() => {
            if (volumePercent === 100) setVolume(0.5);
            else setVolume(1);
          }}
          aria-label="Adjust to 100%"
          title="Full Volume"
          className="text-[11px] font-mono text-white/50 hover:text-white tabular-nums w-8 text-right cursor-pointer transition-colors shrink-0"
        >
          {volumePercent}%
        </button>
      </div>
    </div>
  );
}
