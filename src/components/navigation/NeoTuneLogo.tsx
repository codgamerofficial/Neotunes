import React from 'react';

interface NeoTuneLogoProps {
  className?: string;
  showText?: boolean;
}

export default function NeoTuneLogo({ className = "h-9 w-9", showText = true }: NeoTuneLogoProps) {
  return (
    <div className="flex items-center space-x-3 select-none">
      {/* Logomark */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-neutral-900 to-black p-[1px] shadow-lg shadow-cyan-500/10 border border-white/10 ${className}`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full p-1.5"
        >
          <defs>
            <linearGradient id="neotune-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F5FF" /> {/* Neon Cyan */}
              <stop offset="60%" stopColor="#7B61FF" /> {/* Purple */}
              <stop offset="100%" stopColor="#9d8bff" /> {/* Lighter Purple */}
            </linearGradient>
          </defs>
          {/* Backing N waveform */}
          <rect x="7" y="11" width="3" height="10" rx="1.5" fill="url(#neotune-grad)" opacity="0.4" className="animate-wave-1" />
          <rect x="12" y="7" width="3" height="18" rx="1.5" fill="url(#neotune-grad)" opacity="0.75" className="animate-wave-2" />
          <rect x="17" y="10" width="3" height="12" rx="1.5" fill="url(#neotune-grad)" opacity="0.9" className="animate-wave-3" />
          <rect x="22" y="13" width="3" height="8" rx="1.5" fill="url(#neotune-grad)" opacity="0.5" className="animate-wave-4" />
          
          {/* Play triangle */}
          <path
            d="M11 9.5C11 8.5 12.1 7.9 12.9 8.5L24.5 15.0C25.3 15.4 25.3 16.6 24.5 17.0L12.9 23.5C12.1 24.1 11 23.5 11 22.5V9.5Z"
            fill="url(#neotune-grad)"
            style={{ mixBlendMode: 'screen' }}
          />
        </svg>
      </div>
      {showText && (
        <span className="text-xl font-black tracking-wider text-white">
          Neo<span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Tune</span>
        </span>
      )}
    </div>
  );
}
