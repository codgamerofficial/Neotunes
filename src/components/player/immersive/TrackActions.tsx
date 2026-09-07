'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MoreHorizontal } from 'lucide-react';
import { Track } from '@/types';
import { likedSongsService } from '@/services/likedSongsService';
import { useToast } from '@/components/ui/NeoToast';

interface TrackActionsProps {
  track: Track;
  onOpenOptions: () => void;
  className?: string;
}

export default function TrackActions({
  track,
  onOpenOptions,
  className = '',
}: TrackActionsProps) {
  const { showToast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  useEffect(() => {
    if (!track?.id) return;
    setIsLiked(likedSongsService.isLiked(track.id));

    const handleLikedChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ trackId: string; isLiked: boolean }>;
      if (customEvent.detail && customEvent.detail.trackId === track.id) {
        setIsLiked(customEvent.detail.isLiked);
      }
    };

    window.addEventListener('neotunes_liked_change', handleLikedChange);
    return () => {
      window.removeEventListener('neotunes_liked_change', handleLikedChange);
    };
  }, [track?.id]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 400);

    const nextState = await likedSongsService.toggleLike(track);
    setIsLiked(nextState);
    showToast(nextState ? 'Saved to Liked Songs' : 'Removed from Liked Songs');
  };

  return (
    <div className={`flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      {/* Floating Circular Heart (Like) Button */}
      <button
        onClick={handleLikeToggle}
        aria-label={isLiked ? 'Unlike track' : 'Like track'}
        title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
        className={`w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/12 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ${
          likeAnimating ? 'scale-120' : 'scale-100'
        }`}
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            isLiked ? 'text-white fill-white' : 'text-white/75 hover:text-white'
          }`}
        />
      </button>

      {/* Floating Circular Options (...) Button */}
      <button
        onClick={onOpenOptions}
        aria-label="Track options"
        title="More options"
        className="w-11 h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/12 flex items-center justify-center text-white/75 hover:text-white transition-all cursor-pointer backdrop-blur-md active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
}
