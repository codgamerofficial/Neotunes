'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Speaker, MoreHorizontal, ArrowLeft } from 'lucide-react';

interface PlayerHeaderProps {
  onOpenDevices?: () => void;
  onOpenOptions?: () => void;
  isDesktop?: boolean;
}

export default function PlayerHeader({
  onOpenDevices,
  onOpenOptions,
  isDesktop = false,
}: PlayerHeaderProps) {
  const router = useRouter();

  return (
    <header className="w-full shrink-0 z-20 select-none px-4 sm:px-6 pt-[clamp(4px,1vh,12px)] pb-[clamp(2px,0.5vh,6px)]">
      {/* Mobile Dismiss Pill Handle */}
      {!isDesktop && (
        <div
          onClick={() => router.back()}
          className="w-full py-1 flex justify-center cursor-pointer group"
          aria-label="Dismiss player"
        >
          <div className="w-10 h-1 rounded-full bg-white/30 group-hover:bg-[#DFFF00]/80 transition-colors" />
        </div>
      )}

      {/* Main Top Header Row */}
      <div className="flex items-center justify-between h-10 w-full max-w-5xl mx-auto">
        {/* Left: Back / Minimize Button */}
        <button
          onClick={() => router.back()}
          aria-label="Minimize player"
          className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/80 hover:text-white backdrop-blur-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
        >
          {isDesktop ? <ArrowLeft className="w-4 h-4" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {/* Center: Contextual NOW PLAYING Badge */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#DFFF00]">
            NOW PLAYING
          </span>
        </div>

        {/* Right: Floating Glass Actions */}
        <div className="flex items-center gap-1.5">
          {onOpenDevices && (
            <button
              onClick={onOpenDevices}
              aria-label="Audio Output Devices"
              title="Audio Output Devices"
              className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/80 hover:text-white backdrop-blur-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
            >
              <Speaker className="w-4 h-4" />
            </button>
          )}

          {onOpenOptions && (
            <button
              onClick={onOpenOptions}
              aria-label="Track Options"
              title="Track Options"
              className="w-10 h-10 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/80 hover:text-white backdrop-blur-md active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
