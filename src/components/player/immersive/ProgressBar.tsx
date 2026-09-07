'use client';

import React, { useState, useRef } from 'react';
import { Headphones } from 'lucide-react';
import { usePlaybackStore } from '@/store/playback-store';

interface ProgressBarProps {
  duration: number;
  progress: number;
  onOpenQuality?: () => void;
  className?: string;
}

export default function ProgressBar({
  duration,
  progress,
  onOpenQuality,
  className = '',
}: ProgressBarProps) {
  const { setProgress, audioQuality } = usePlaybackStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const displayDuration = duration > 0 ? duration : 180;
  const currentTime = isDragging && dragTime !== null ? dragTime : progress;
  const remainingTime = Math.max(0, displayDuration - currentTime);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / displayDuration) * 100));

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getSeekTimeFromEvent = (clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * displayDuration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    const newTime = getSeekTimeFromEvent(e.clientX);
    setDragTime(newTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newTime = getSeekTimeFromEvent(e.clientX);
    setDragTime(newTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      const finalSeekTime = getSeekTimeFromEvent(e.clientX);
      setProgress(finalSeekTime);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('seek-track', { detail: { time: finalSeekTime } }));
      }
      setIsDragging(false);
      setDragTime(null);
    }
  };

  // Truthful Audio Stream label (Never fake Lossless or unverified kbps)
  const audioQualityBadge = React.useMemo(() => {
    if (audioQuality === 'lossless') return 'High Fidelity';
    if (audioQuality === 'very_high') return 'HQ Audio';
    return 'Stereo Stream';
  }, [audioQuality]);

  return (
    <div className={`w-full space-y-[clamp(1px,0.3vh,4px)] select-none ${className}`}>
      {/* Scrubber Bar Track */}
      <div
        ref={timelineRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-label="Seek progress"
        aria-valuemin={0}
        aria-valuemax={displayDuration}
        aria-valuenow={currentTime}
        className="relative py-1.5 cursor-pointer group focus:outline-none touch-none"
      >
        {/* Background Track Bar */}
        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden relative group-hover:h-1.5 transition-all">
          {/* Played Progress Fill */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-white rounded-full pointer-events-none transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Thumb Dot Handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.6)] pointer-events-none transition-transform ${
            isDragging ? 'scale-125' : 'scale-100 group-hover:scale-110'
          }`}
          style={{ left: `calc(${progressPercent}% - 7px)` }}
        />
      </div>

      {/* Timestamps & Audio Quality Badge Row */}
      <div className="flex items-center justify-between text-xs font-semibold text-white/70 px-0.5">
        {/* Elapsed Time */}
        <span className="tabular-nums min-w-[34px]">{formatTime(currentTime)}</span>

        {/* Audio Context Badge (Real quality, honest label) */}
        {onOpenQuality ? (
          <button
            onClick={onOpenQuality}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/75 hover:text-white transition-all cursor-pointer text-[11px] font-semibold truncate max-w-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
            title="Audio Quality"
          >
            <Headphones className="w-3.5 h-3.5 shrink-0 text-[#DFFF00]" />
            <span className="truncate">{audioQualityBadge}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-white/60 text-[11px] font-medium">
            <Headphones className="w-3 h-3 text-[#DFFF00]" />
            <span>{audioQualityBadge}</span>
          </div>
        )}

        {/* Remaining Time */}
        <span className="tabular-nums min-w-[34px] text-right">-{formatTime(remainingTime)}</span>
      </div>
    </div>
  );
}
