'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, Clock, ArrowRight, Trophy, Vote, Check, Activity, Info } from 'lucide-react';
import { getCampaignState, CampaignState } from '@/lib/campaignManager';

// ----------------------------------------------------------------------
// 1. HELPERS: COUNTDOWN CLOCK CALCULATION
// ----------------------------------------------------------------------
interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

function calculateTimeLeft(targetDateStr: string): TimeLeft {
  const difference = +new Date(targetDateStr) - +new Date();
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    totalMs: difference
  };
}

// Countdown Card component
export function CampaignCountdown({ targetDate, onComplete }: { targetDate: string; onComplete?: () => void }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(targetDate);
      setTimeLeft(remaining);
      if (remaining.totalMs <= 0) {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.totalMs <= 0) return null;

  const timeBlocks = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hrs', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds }
  ];

  return (
    <div className="flex gap-3">
      {timeBlocks.map((block) => (
        <div key={block.label} className="flex flex-col items-center">
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0c0c]/90 px-3.5 py-2.5 shadow-lg min-w-[54px]">
            <motion.span 
              key={block.value}
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-lg font-black text-white block text-center font-mono leading-none"
            >
              {block.value.toString().padStart(2, '0')}
            </motion.span>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/[0.04]" />
          </div>
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mt-1.5">{block.label}</span>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. HERO BANNER FOR HOME PAGE
// ----------------------------------------------------------------------
export function CampaignHeroBanner() {
  const router = useRouter();
  const [state, setState] = useState<CampaignState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setState(getCampaignState());
    const interval = setInterval(() => {
      setState(getCampaignState());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  if (!state || !state.isActive) return null;

  const isLive = state.phase === 'live';
  const isChampion = state.phase === 'champion';

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden rounded-[28px] border border-white/[0.08] px-8 py-14 text-left shadow-2xl transition-all duration-500 select-none group min-h-[420px] flex items-center justify-between"
    >
      {/* 25-Second Slow Zoom Background Image */}
      <motion.div
        animate={{ scale: [1.02, 1.07, 1.02] }}
        transition={{
          duration: 25,
          ease: 'linear',
          repeat: Infinity,
        }}
        className="absolute inset-0 bg-cover bg-center -z-20 pointer-events-none"
        style={{ backgroundImage: `url('/api/campaign/assets/legends_collide_banner.svg')` }}
      />

      {/* Animated Soft Blue/Purple Gradient Overlay for High Readability */}
      <motion.div
        animate={{ opacity: [0.8, 0.9, 0.8] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-[#0b162c]/85 to-[#3b0a0f]/35 -z-10 pointer-events-none"
      />

      {/* Animated Floating Dust Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-10, -120],
              x: [0, (i % 2 === 0 ? 30 : -30)],
              opacity: [0, 0.4, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 8 + i * 2,
              ease: 'linear',
              delay: i * 0.5
            }}
            className="absolute rounded-full bg-cyan-400/25 blur-[1px]"
            style={{
              bottom: '10%',
              left: `${10 + i * 6}%`,
              width: `${3 + (i % 3)}px`,
              height: `${3 + (i % 3)}px`
            }}
          />
        ))}
      </div>

      {/* Volumetric Spotlight Parallax Background */}
      <motion.div 
        animate={{
          x: mousePos.x * 20,
          y: mousePos.y * 20
        }}
        className="pointer-events-none absolute -right-16 -top-16 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl -z-10 opacity-60"
      />
      <motion.div 
        animate={{
          x: mousePos.x * -20,
          y: mousePos.y * -20
        }}
        className="pointer-events-none absolute -bottom-24 right-48 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl -z-10 opacity-40"
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10 w-full">
        
        {/* Left Column info */}
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 bg-cyan-500/10 px-3.5 py-1.5 rounded-full border border-cyan-500/20">
              <Sparkles className="h-3 w-3 animate-spin [animation-duration:10s]" />
              <span>⚽ FIFA WORLD CUP FINAL</span>
            </span>

            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3.5 py-1.5 rounded-full border border-rose-500/20 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>LIVE MATCH</span>
              </span>
            )}

            {isChampion && (
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
                <Trophy className="h-3 w-3 text-amber-400" />
                <span>CHAMPIONS MODE</span>
              </span>
            )}
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none text-white max-w-2xl uppercase">
            {isChampion ? 'LEGENDS CROWNED' : state.hero.slogan}
          </h1>
          
          <div className="space-y-1">
            <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Argentina vs Spain · The Biggest Football Final.
            </p>
            <p className="max-w-lg text-xs text-neutral-400 font-semibold leading-relaxed">
              {isChampion 
                ? 'Argentina are the world champions! Lionel Messi claims the gold in an unforgettable, history-defining penalty shootout.'
                : 'Football\'s biggest stage. One final. One champion. Lionel Messi leads Argentina against Lamine Yamal\'s Spain.'
              }
            </p>
          </div>

          {/* Quick Info details */}
          <div className="flex items-center gap-6 pt-2">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Matchup</span>
              <span className="text-md font-black text-white">ARG 🇦🇷 vs ESP 🇪🇸</span>
            </div>
            <div className="w-[1px] h-6 bg-white/[0.08]" />
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Kickoff</span>
              <span className="text-md font-black text-cyan-450">{state.hero.kickoffDisplay} (Live Tomorrow)</span>
            </div>
          </div>
        </div>

        {/* Right Column: CTA card or Live Ticker or Countdown */}
        <div className="bg-neutral-900/60 backdrop-blur-xl border border-white/[0.06] rounded-[22px] p-6 lg:w-80 text-left space-y-4.5 flex-shrink-0 shadow-2xl relative overflow-hidden">
          
          {/* Subtle light reflect hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

          {/* countdown state */}
          {state.phase === 'countdown' && (
            <>
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-neutral-500 uppercase">World Cup Kickoff In</h4>
                <p className="text-xs font-bold text-neutral-400">Match Countdown Clock</p>
              </div>
              <CampaignCountdown targetDate={state.theme.kickoffDate} onComplete={() => setState(getCampaignState())} />
              
              {/* Pulsing CTA Button */}
              <motion.button
                animate={{ boxShadow: ['0 0 0 0px rgba(38, 217, 255, 0.4)', '0 0 0 10px rgba(38, 217, 255, 0)'] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                onClick={() => router.push('/worldcup')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#26D9FF] to-[#8B5CFF] hover:opacity-90 py-3 text-xs font-black text-white active:scale-95 transition-all duration-200"
              >
                <span>Explore Match Hub</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </motion.button>
            </>
          )}

          {/* live state */}
          {isLive && (
            <>
              <div className="space-y-1 flex justify-between items-center">
                <div>
                  <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>Live score</span>
                  </h4>
                  <p className="text-xs font-semibold text-neutral-400">MetLife Stadium</p>
                </div>
                <span className="text-[9px] font-black text-cyan-400 bg-cyan-400/15 border border-cyan-400/20 px-2 py-0.5 rounded uppercase">88&apos; ET</span>
              </div>
              
              {/* Organized Live Score */}
              <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-black/40 border border-white/[0.04]">
                <div className="text-center flex-1">
                  <span className="text-lg font-black text-white block">ARG</span>
                  <span className="text-[10px] text-neutral-400 font-bold block">Messi 34&apos;(P)</span>
                  <span className="text-[10px] text-neutral-400 font-bold block">Álvarez 75&apos;</span>
                </div>
                <div className="text-2xl font-black text-cyan-400 px-4">2 - 2</div>
                <div className="text-center flex-1">
                  <span className="text-lg font-black text-white block">ESP</span>
                  <span className="text-[10px] text-neutral-400 font-bold block">Yamal 65&apos;</span>
                  <span className="text-[10px] text-neutral-400 font-bold block">Olmo 88&apos;</span>
                </div>
              </div>

              <motion.button
                animate={{ boxShadow: ['0 0 0 0px rgba(38, 217, 255, 0.4)', '0 0 0 10px rgba(38, 217, 255, 0)'] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                onClick={() => router.push('/worldcup')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#26D9FF] to-[#8B5CFF] hover:opacity-90 py-3 text-xs font-black text-white active:scale-95 transition-all duration-200"
              >
                <span>Open Timeline & Lineups</span>
              </motion.button>
            </>
          )}

          {/* post-match champion state */}
          {isChampion && (
            <>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span>Final Result</span>
                </h4>
                <p className="text-xs font-semibold text-neutral-400">Argentina are World Champions!</p>
              </div>

              {/* Organized Final Score */}
              <div className="py-2.5 px-3 rounded-xl bg-black/40 border border-white/[0.04] space-y-1 text-center">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-white">Argentina 🇦🇷</span>
                  <span className="text-lg font-black text-cyan-400">2 (4)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-white">Spain 🇪🇸</span>
                  <span className="text-lg font-black text-neutral-450">2 (3)</span>
                </div>
                <div className="text-[9px] text-amber-400 font-black uppercase tracking-wider border-t border-white/[0.04] pt-1.5 mt-1.5">
                  Argentina wins 4-3 on Penalties
                </div>
              </div>

              <motion.button
                animate={{ boxShadow: ['0 0 0 0px rgba(255, 213, 74, 0.4)', '0 0 0 10px rgba(255, 213, 74, 0)'] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                onClick={() => router.push('/worldcup')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-350 hover:to-amber-550 py-3 text-xs font-black text-black shadow-lg"
              >
                <span>View Victory Ceremony</span>
              </motion.button>
            </>
          )}

        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. SEARCH RIBBON FOR SEARCH PAGE
// ----------------------------------------------------------------------
export function CampaignSearchRibbon() {
  const [state, setState] = useState<CampaignState | null>(null);

  useEffect(() => {
    setState(getCampaignState());
  }, []);

  if (!state || !state.isActive) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#0B162C]/40 via-[#050505] to-transparent border border-white/[0.06] p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl text-left"
    >
      <div className="space-y-1">
        <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-1.5">
          <span>⚽ WORLD CUP FINAL SPECIAL</span>
          {state.phase === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
        </h4>
        <p className="text-xs font-bold text-white">
          {state.phase === 'champion' 
            ? 'Victory! Argentina wins 4-3 on penalties vs. Spain!' 
            : 'Argentina vs Spain: Kickoff tonight at 12:30 AM IST'
          }
        </p>
      </div>
      <Link 
        href="/worldcup" 
        className="w-fit flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 rounded-full border border-cyan-500/20 transition-all"
      >
        <span>Open Match Hub</span>
        <ArrowRight className="h-3 w-3 stroke-[2.5]" />
      </Link>
    </motion.div>
  );
}

// ----------------------------------------------------------------------
// 4. SETTINGS MINI CARD
// ----------------------------------------------------------------------
export function CampaignSettingsCard() {
  const [state, setState] = useState<CampaignState | null>(null);

  useEffect(() => {
    setState(getCampaignState());
  }, []);

  if (!state || !state.isActive) return null;

  return (
    <div className="bg-neutral-900/30 border border-white/[0.04] p-4 rounded-xl text-left flex justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="text-lg">🏆</div>
        <div>
          <p className="text-xs font-bold text-white">World Cup Final Center</p>
          <p className="text-[10px] text-neutral-500 font-semibold">Argentina vs Spain live updates</p>
        </div>
      </div>
      <Link href="/worldcup" className="text-[9px] font-black uppercase tracking-wider text-cyan-450 hover:underline">
        View Hub
      </Link>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. PROFILE PAGE BADGE
// ----------------------------------------------------------------------
export function CampaignProfileBadge() {
  const [state, setState] = useState<CampaignState | null>(null);

  useEffect(() => {
    setState(getCampaignState());
  }, []);

  if (!state || !state.isActive) return null;

  return (
    <div className="bg-gradient-to-r from-[#7BC3F5]/10 via-[#E01E22]/10 to-transparent border border-white/[0.06] rounded-2xl p-4.5 flex items-center justify-between gap-4 max-w-xl text-left">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-neutral-900 flex items-center justify-center text-lg animate-bounce [animation-duration:3s]">
          ⚽
        </div>
        <div>
          <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">World Cup Badge</span>
          <p className="text-xs font-bold text-white">Watching FIFA World Cup Final</p>
          <p className="text-[10px] text-neutral-500 font-semibold">Argentina 🇦🇷 vs Spain 🇪🇸</p>
        </div>
      </div>
      <Link href="/worldcup" className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-1.5 rounded-full border border-cyan-500/20 transition-all">
        Open Hub
      </Link>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. GOLDEN CONFETTI FOR VICTORY MODE
// ----------------------------------------------------------------------
export function CampaignConfetti() {
  const [state, setState] = useState<CampaignState | null>(null);

  useEffect(() => {
    setState(getCampaignState());
  }, []);

  if (!state || state.phase !== 'champion') return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {Array.from({ length: 45 }).map((_, i) => {
        const xOffset = Math.random() * 100;
        const duration = 4 + Math.random() * 4;
        const delay = Math.random() * 5;
        const colors = ['#F1A80A', '#E01E22', '#FFFFFF', '#7BC3F5', '#FFDF00'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        return (
          <motion.div
            key={i}
            animate={{
              y: [-20, 700],
              x: [`${xOffset}%`, `${xOffset + (Math.random() * 10 - 5)}%`],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)]
            }}
            transition={{
              repeat: Infinity,
              duration,
              ease: 'linear',
              delay
            }}
            className="absolute h-2 w-3 rounded-sm"
            style={{
              top: -20,
              left: `${xOffset}%`,
              backgroundColor: randomColor,
              opacity: 0.8
            }}
          />
        );
      })}
    </div>
  );
}
