'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Track } from '@/types';
import { resolveArtwork } from '@/utils/artwork';
import { Artwork } from '@/components/ui/Artwork';
import { ArtworkColorTheme } from '@/utils/artworkColorTheme';

interface ArtworkHeroProps {
  track: Track;
  theme: ArtworkColorTheme;
  isDesktop?: boolean;
  className?: string;
}

export default function ArtworkHero({
  track,
  theme,
  isDesktop = false,
  className = '',
}: ArtworkHeroProps) {
  const artworkUrl = resolveArtwork(track);

  return (
    <div
      className={`relative w-full flex-1 min-h-0 flex items-center justify-center px-4 select-none overflow-hidden ${className}`}
    >
      {/* Ambient halo glow directly beneath the artwork */}
      <div
        className="absolute w-[75%] aspect-square rounded-full filter blur-[60px] opacity-35 pointer-events-none transition-all duration-700 -z-10"
        style={{
          background: theme.glowColor,
        }}
      />

      {/* Main Square Artwork Container: strictly 1:1 square bounded by clamp()-driven max-h */}
      <motion.div
        key={track.id || track.canonicalId}
        initial={{ opacity: 0.85, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`relative aspect-square overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.65)] border border-white/[0.12] shrink-0 w-auto mx-auto ${
          isDesktop
            ? 'rounded-[clamp(16px,2vw,28px)] h-full max-h-[clamp(160px,32vh,380px)] max-w-[clamp(160px,32vh,380px)]'
            : 'rounded-[clamp(14px,4vw,24px)] h-full max-h-[clamp(130px,34vh,340px)] max-w-[min(82vw,340px)]'
        }`}
        style={{
          aspectRatio: '1 / 1',
        }}
      >
        <Artwork
          source={artworkUrl}
          size="full"
          alt={track.title}
          canonicalId={track.id}
          type="track"
          className="w-full h-full object-cover transition-transform duration-700 ease-out aspect-square"
        />

        {/* Soft bottom edge gradient fade matching ambient color */}
        <div
          className="absolute inset-x-0 bottom-0 h-16 sm:h-24 pointer-events-none transition-all duration-700 opacity-50"
          style={{
            background: `linear-gradient(to top, ${theme.secondaryAmbient} 0%, transparent 100%)`,
          }}
        />
      </motion.div>
    </div>
  );
}
