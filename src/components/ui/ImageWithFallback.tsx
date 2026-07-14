'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { Music } from 'lucide-react';

import { MusicCoverArt } from '@/components/ui/MusicCoverArt';

interface ImageWithFallbackProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
}

export default function ImageWithFallback({
  src,
  fallbackSrc = '/images/default-cover.png',
  alt,
  className = '',
  ...props
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState<any>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
  }, [src]);

  const handleError = () => {
    if (retryCount === 0 && fallbackSrc && fallbackSrc !== src) {
      // First retry: Try custom fallback
      setRetryCount(1);
      setImgSrc(fallbackSrc);
    } else if (retryCount === 1) {
      // Second retry: Try generic default cover
      setRetryCount(2);
      setImgSrc('/images/default-cover.png');
    } else {
      // Permanent failure
      setHasError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Shimmer/Skeleton placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-900/60 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
        </div>
      )}

      {/* Actual Image or Fallback */}
      {!hasError && imgSrc ? (
        <Image
          {...props}
          src={imgSrc}
          alt={alt || ''}
          onLoad={() => setIsLoading(false)}
          onError={handleError}
          className={`transition-all duration-300 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        />
      ) : (
        /* Gorgeous custom vector cover art */
        <MusicCoverArt title={alt} subtitle="" type="song" className="absolute inset-0 w-full h-full" iconClassName="h-6 w-6" />
      )}
    </div>
  );
}
