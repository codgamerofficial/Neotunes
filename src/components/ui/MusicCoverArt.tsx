import React from 'react';
import { Music, Disc, Activity, Play, Heart } from 'lucide-react';

interface MusicCoverArtProps {
  title?: string;
  subtitle?: string;
  genre?: string;
  className?: string;
  iconClassName?: string;
  type?: 'song' | 'playlist' | 'liked';
}

export function MusicCoverArt({
  title = '',
  subtitle = '',
  genre = '',
  className = 'h-full w-full',
  iconClassName = 'h-8 w-8',
  type = 'song',
}: MusicCoverArtProps) {
  // Determine genre or theme from seed string
  const cleanGenre = (genre || title + ' ' + subtitle).toLowerCase();
  
  let gradientId = 'grad-' + Math.random().toString(36).substr(2, 9);
  let stops = { start: '#6366f1', end: '#a855f7' }; // Default indigo -> purple
  let shapes: React.ReactNode = null;
  let Icon = Music;

  if (type === 'liked') {
    // Liked songs gradient (magenta/pink -> violet)
    stops = { start: '#ec4899', end: '#8b5cf6' };
    shapes = (
      <>
        <circle cx="16" cy="16" r="12" fill="white" opacity="0.05" />
        <path d="M12 6C8 6 6 9 6 12C6 17 12 21 16 23C20 21 26 17 26 12C26 9 24 6 20 6C18 6 16.5 7.5 16 8C15.5 7.5 14 6 12 6Z" fill="white" opacity="0.1" />
      </>
    );
    Icon = Heart;
  } else if (cleanGenre.includes('pop')) {
    // Pop: Pink -> Orange gradient with soft circles/blobs
    stops = { start: '#ec4899', end: '#f97316' };
    shapes = (
      <>
        <circle cx="10" cy="10" r="8" fill="white" opacity="0.15" />
        <circle cx="22" cy="22" r="10" fill="white" opacity="0.1" />
        <circle cx="8" cy="24" r="5" fill="white" opacity="0.08" />
      </>
    );
    Icon = Play;
  } else if (cleanGenre.includes('hip-hop') || cleanGenre.includes('rap') || cleanGenre.includes('urban') || cleanGenre.includes('podcast')) {
    // Hip-Hop: Deep purple -> Magenta with bold diagonal rectangles
    stops = { start: '#8b5cf6', end: '#d946ef' };
    shapes = (
      <>
        <polygon points="2,6 30,20 28,24 0,10" fill="white" opacity="0.12" />
        <polygon points="6,2 32,15 30,19 4,6" fill="white" opacity="0.08" />
        <rect x="6" y="18" width="8" height="8" rx="1" transform="rotate(45 10 22)" fill="white" opacity="0.1" />
      </>
    );
    Icon = Disc;
  } else if (cleanGenre.includes('electronic') || cleanGenre.includes('edm') || cleanGenre.includes('house') || cleanGenre.includes('techno') || cleanGenre.includes('dance')) {
    // Electronic: Blue -> Cyan with circuit lines or waveforms
    stops = { start: '#2563eb', end: '#06b6d4' };
    shapes = (
      <>
        <line x1="4" y1="16" x2="28" y2="16" stroke="white" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
        <line x1="16" y1="4" x2="16" y2="28" stroke="white" strokeWidth="1" strokeDasharray="2,2" opacity="0.3" />
        <path d="M4 16 L8 12 L12 20 L16 16 L20 22 L24 10 L28 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
        <circle cx="16" cy="16" r="3" fill="white" opacity="0.2" />
      </>
    );
    Icon = Activity;
  } else if (cleanGenre.includes('rock') || cleanGenre.includes('metal') || cleanGenre.includes('indie')) {
    // Rock: Orange -> Red with sharp angled shapes
    stops = { start: '#f97316', end: '#dc2626' };
    shapes = (
      <>
        <polygon points="16,2 30,16 16,30 2,16" fill="white" opacity="0.08" />
        <polygon points="16,6 26,16 16,26 6,16" fill="white" opacity="0.12" />
        <line x1="2" y1="2" x2="30" y2="30" stroke="white" strokeWidth="1" opacity="0.15" />
      </>
    );
    Icon = Music;
  } else {
    // Default / Chill: Teal -> Green
    stops = { start: '#0ea5e9', end: '#10b981' };
    shapes = (
      <>
        <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="0.75" fill="none" opacity="0.15" />
        <path d="M16 6 A 10 10 0 0 1 26 16" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
        <line x1="8" y1="8" x2="24" y2="24" stroke="white" strokeWidth="1" opacity="0.1" />
      </>
    );
    Icon = Music;
  }

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg shadow-md ${className}`}>
      {/* Background gradient */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops.start} />
            <stop offset="100%" stopColor={stops.end} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" fill={`url(#${gradientId})`} />
        {shapes}
      </svg>

      {/* Glassmorphic Overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] transition-all hover:bg-black/0" />

      {/* Central Icon */}
      <div className="relative z-10 flex h-1/2 w-1/2 items-center justify-center rounded-full bg-black/25 text-white/90 backdrop-blur-md shadow-inner border border-white/10">
        <Icon className={iconClassName} />
      </div>
    </div>
  );
}
