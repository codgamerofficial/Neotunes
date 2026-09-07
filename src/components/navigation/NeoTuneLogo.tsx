'use client';

import React from 'react';

export type LogoVariant =
  | 'full'
  | 'primary'
  | 'mark'
  | 'icon'
  | 'symbol'
  | 'wordmark'
  | 'app-icon'
  | 'marketing';

export type LogoTheme = 'dark' | 'light' | 'monochrome-white' | 'monochrome-black';
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | number;

export interface NeoTuneLogoProps {
  className?: string;
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: LogoSize;
  showTagline?: boolean;
  showText?: boolean;
  animated?: boolean;
  onClick?: () => void;
  href?: string | null;
}

function getSymbolPxSize(size: LogoSize): number {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'sm':
      return 22;
    case 'md':
      return 30;
    case 'lg':
      return 40;
    case 'xl':
      return 56;
    default:
      return 30;
  }
}

export function NeoTunesMark({
  size = 'md',
  theme = 'dark',
  animated = false,
  className = '',
}: {
  size?: LogoSize;
  theme?: LogoTheme;
  animated?: boolean;
  className?: string;
}) {
  const pxSize = getSymbolPxSize(size);
  const gradId = `neotunes-mark-grad-${React.useId().replace(/:/g, '')}`;

  let fillValue = `url(#${gradId})`;
  if (theme === 'monochrome-white' || theme === 'light') {
    fillValue = '#FFFFFF';
  } else if (theme === 'monochrome-black') {
    fillValue = '#000000';
  }

  return (
    <svg
      width={pxSize}
      height={pxSize}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 transition-transform duration-300 ${className}`}
      aria-label="NeoTunes Symbol"
    >
      <defs>
        <linearGradient id={gradId} x1="64" y1="448" x2="448" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DFFF00" />
          <stop offset="60%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M112 416 V176 C112 127.399 151.399 88 200 88 H204 C228.471 88 251.815 99.277 267.098 118.527 L336 205.419 V160 C336 111.399 375.399 72 424 72 H432 V336 C432 384.601 392.601 424 344 424 H340 C315.529 424 292.185 412.723 276.902 393.473 L208 306.581 V352 C208 400.601 168.601 440 120 440 H112 V416 Z M228 196 V316 L316 256 L228 196 Z"
        fill={fillValue}
      />
    </svg>
  );
}

export function NeoTunesWordmark({
  size = 'md',
  theme = 'dark',
  showTagline = false,
  className = '',
}: {
  size?: LogoSize;
  theme?: LogoTheme;
  showTagline?: boolean;
  className?: string;
}) {
  const fontClasses = {
    sm: 'text-base font-extrabold tracking-tight',
    md: 'text-lg font-black tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
    xl: 'text-3xl font-black tracking-tight',
  }[typeof size === 'string' ? size : 'md'] || 'text-lg font-black tracking-tight';

  const neoTextColor =
    theme === 'monochrome-black' || theme === 'light' ? 'text-[#050608]' : 'text-white';

  return (
    <div className={`flex flex-col justify-center leading-none select-none ${className}`}>
      <div className={`flex items-center font-sans ${fontClasses}`}>
        <span className={neoTextColor}>Neo</span>
        <span className="text-[#DFFF00]">Tunes</span>
        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#DFFF00]" />
      </div>
      {showTagline && (
        <span className="text-[9px] font-semibold text-[#9AA1AD] tracking-wide mt-1">
          Music Intelligence
        </span>
      )}
    </div>
  );
}

import Link from 'next/link';

export default function NeoTuneLogo({
  className = '',
  variant = 'full',
  theme = 'dark',
  size = 'md',
  showTagline = false,
  showText = true,
  animated = false,
  onClick,
  href = '/',
}: NeoTuneLogoProps) {
  const isMarkOnly =
    variant === 'mark' || variant === 'icon' || variant === 'symbol' || (!showText && variant !== 'wordmark');

  const content = isMarkOnly ? (
    <NeoTunesMark size={size} theme={theme} animated={animated} />
  ) : variant === 'wordmark' ? (
    <NeoTunesWordmark size={size} theme={theme} showTagline={showTagline} />
  ) : (
    <>
      <div className="mr-2.5 shrink-0">
        <NeoTunesMark size={size} theme={theme} animated={animated} />
      </div>
      {showText && (
        <NeoTunesWordmark size={size} theme={theme} showTagline={showTagline} />
      )}
    </>
  );

  const baseClasses = isMarkOnly
    ? `inline-flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] rounded-xl ${className}`
    : variant === 'wordmark'
    ? `inline-flex items-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] rounded-xl ${className}`
    : `inline-flex items-center cursor-pointer select-none group transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] rounded-xl ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={baseClasses}
        aria-label="NeoTunes Home"
        title="NeoTunes Home"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      className={baseClasses}
      role="button"
      tabIndex={0}
      aria-label="NeoTunes Home"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {content}
    </div>
  );
}
