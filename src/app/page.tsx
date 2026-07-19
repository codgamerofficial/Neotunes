'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Play, Pause, Sparkles, Shield, Disc, ArrowRight, Loader2, Volume2, Headphones, Activity } from 'lucide-react';
import NeoTuneLogo from '@/components/navigation/NeoTuneLogo';

// High-quality mock album covers for floating drift
const floatingCovers = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
];

export default function LandingPage() {
  const supabase = createClientBrowser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mock player state for landing interactive demo
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [demoProgress, setDemoProgress] = useState(30);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();
  }, []);

  // Ambient Particle Canvas logic reacting to mouse coordinates
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: { x: number; y: number; r: number; dx: number; dy: number; color: string }[] = [];
    const colors = ['rgba(45, 212, 255, 0.15)', 'rgba(155, 92, 255, 0.15)', 'rgba(52, 211, 153, 0.1)'];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 4 + 1.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;

        // Bounce bounds
        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;

        // Attract gently to mouse
        const distMouse = Math.hypot(mouseX - p.x, mouseY - p.y);
        if (distMouse < 250) {
          p.x += (mouseX - p.x) * 0.005;
          p.y += (mouseY - p.y) * 0.005;
        }

        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw interactive connections
      ctx.strokeStyle = 'rgba(45, 212, 255, 0.02)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Demo progress counter interval
  useEffect(() => {
    if (!isPlayingDemo) return;
    const interval = setInterval(() => {
      setDemoProgress((p) => (p >= 100 ? 0 : p + 0.8));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  const handleGoogleAuth = async () => {
    setIsGoogleAuthLoading(true);
    setAuthMessage({ type: 'success', text: 'Connecting to Google Authentication...' });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/home`,
      },
    });

    if (error) {
      setAuthMessage({ type: 'error', text: error.message || 'Google OAuth failed. Please try again.' });
      setIsGoogleAuthLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen bg-[#050505] text-white flex flex-col justify-between overflow-x-hidden select-none">
      {/* Absolute canvas equalizing backdrop */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none -z-25" />
      
      {/* Blurred glowing blobs for VisionOS styling */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-[#2DD4FF]/10 blur-[180px] -z-20 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[45%] aspect-square rounded-full bg-[#9B5CFF]/10 blur-[180px] -z-20 pointer-events-none" />

      {/* Top Header */}
      <header className="flex w-full max-w-7xl items-center justify-between z-10 px-8 py-8 mx-auto backdrop-blur-md bg-[#050505]/10 border-b border-white/[0.02]">
        <Link href="/" className="flex items-center gap-2 text-[#2DD4FF] hover:opacity-90 transition-opacity">
          <NeoTuneLogo className="h-8 w-8" showText={true} />
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href={isAuthenticated ? '/home' : '/auth'}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-102"
          >
            {isAuthenticated ? 'Enter Workspace' : 'Sign In'}
          </Link>
        </nav>
      </header>

      {/* Main landing showcase */}
      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between px-8 py-16 lg:py-24 gap-16 z-10 flex-1 w-full relative">
        
        {/* Left Side: Cinematic Copy */}
        <div className="max-w-2xl space-y-8 text-left">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#2DD4FF] bg-[#2DD4FF]/10 px-4 py-1.5 rounded-full border border-[#2DD4FF]/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Audio Intelligence</span>
            </span>
            
            <h1 className="text-6xl sm:text-8xl font-black tracking-tight leading-none text-white font-sans">
              MUSIC<br />
              <span className="bg-gradient-to-r from-[#2DD4FF] via-[#9B5CFF] to-[#34D399] bg-clip-text text-transparent">
                OPERATING SYSTEM
              </span>
            </h1>

            <p className="text-base sm:text-lg text-neutral-400 font-semibold leading-relaxed max-w-xl">
              An intelligent, glassmorphic space that unifies your private cloud uploads, YouTube audio catalog, and Spotify metadata into a single personalized audio universe.
            </p>
          </motion.div>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href={isAuthenticated ? '/home' : '/auth'}
                className="flex items-center gap-3 rounded-full bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] hover:opacity-90 px-8 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-[#2DD4FF]/15 active:scale-95 transition-all"
              >
                <span>Launch Audio Workspace</span>
                <ArrowRight className="h-4.5 w-4.5 stroke-[2.5]" />
              </Link>
              
              <a
                href="#features"
                className="flex items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.15] px-8 py-4 text-xs font-black uppercase tracking-wider text-neutral-300 transition-all"
              >
                Explore DNA Features
              </a>
            </div>

            {/* Quick social login widget */}
            {!isAuthenticated && (
              <div className="space-y-3 pt-4 border-t border-white/[0.04] max-w-md">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Instant Access</span>
                <button
                  onClick={handleGoogleAuth}
                  disabled={isGoogleAuthLoading}
                  className="flex items-center justify-center gap-3 rounded-full bg-neutral-900/60 border border-white/[0.06] hover:border-[#2DD4FF]/30 px-6 py-3 text-xs font-extrabold text-white transition-all disabled:opacity-70 w-full"
                >
                  {isGoogleAuthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#2DD4FF]" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.09 3.67-5.17 3.67-8.45z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.08C3.26 21.88 7.37 24 12 24z" />
                      <path fill="#FBBC05" d="M5.27 14.29a7.18 7.18 0 0 1 0-2.58V8.63H1.29a11.97 11.97 0 0 0 0 6.74l3.98-3.08z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.12 1.29 5.71l3.98 3.08c.95-2.85 3.6-4.96 6.73-4.96z" />
                    </svg>
                  )}
                  <span>Connect immediately with Google</span>
                </button>
              </div>
            )}

            {authMessage && (
              <div className={`rounded-xl px-4 py-3 text-xs font-bold w-fit transition-all border ${authMessage.type === 'success' ? 'border-[#2DD4FF]/25 bg-[#2DD4FF]/5 text-[#2DD4FF]' : 'border-red-500/25 bg-red-500/5 text-red-400'}`}>
                {authMessage.text}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Side: Interactive glass audio deck */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full lg:w-[480px] aspect-square flex items-center justify-center lg:justify-end"
        >
          {/* Drifting album art background grid */}
          <div className="absolute inset-0 grid grid-cols-3 gap-3 opacity-25 scale-102 blur-[1.5px] pointer-events-none -z-10 select-none">
            {floatingCovers.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-white/[0.04] animate-[equalize_4s_infinite_alternate]" style={{ animationDelay: `${i * 0.2}s` }}>
                <img src={src} alt="Album Decor" className="object-cover w-full h-full" />
              </div>
            ))}
          </div>

          {/* Premium VisionOS glass card deck */}
          <div className="relative w-80 md:w-96 rounded-[32px] p-[1.5px] bg-gradient-to-tr from-white/[0.12] to-transparent shadow-[0_32px_64px_rgba(0,0,0,0.8)] border border-white/[0.06] backdrop-blur-xl bg-white/[0.01]">
            <div className="w-full h-full p-6 space-y-6 flex flex-col items-center">
              
              {/* Deck header */}
              <div className="flex justify-between items-center w-full border-b border-white/[0.04] pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2DD4FF] flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[#2DD4FF] animate-pulse" />
                  <span>Interactive Audio Sandbox</span>
                </span>
                <span className="text-[9px] font-bold text-neutral-500 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded">DEMO</span>
              </div>

              {/* Rotating disc mockup */}
              <div className="relative w-44 h-44 rounded-full bg-gradient-to-b from-neutral-900 to-neutral-950 flex items-center justify-center border-4 border-neutral-800 shadow-2xl relative group">
                <div className={`absolute inset-0 rounded-full border border-neutral-700/30 animate-spin [animation-duration:15s] ${isPlayingDemo ? '' : '[animation-play-state:paused]'}`}>
                  <div className="absolute inset-4 rounded-full border border-neutral-800/40" />
                  <div className="absolute inset-8 rounded-full border border-neutral-800/40" />
                  <div className="absolute inset-12 rounded-full border border-neutral-800/40" />
                </div>
                
                {/* Center label */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#2DD4FF] to-[#9B5CFF] flex items-center justify-center border-2 border-neutral-950 z-10">
                  <div className="w-3.5 h-3.5 rounded-full bg-neutral-950" />
                </div>
              </div>

              {/* Player details */}
              <div className="text-center w-full space-y-1">
                <h4 className="text-sm font-black text-white">Midnight Synthwave Journey</h4>
                <p className="text-xs text-neutral-400 font-bold">NeoTunes AI Generator</p>
              </div>

              {/* Synced lyrics ticker */}
              <div className="w-full h-8 flex items-center justify-center bg-black/40 rounded-xl border border-white/[0.04] px-4">
                <p className="text-[10px] font-extrabold text-[#2DD4FF] uppercase tracking-wider animate-pulse">
                  {isPlayingDemo ? "Feel the rhythm of the neon lights..." : "Equalizer & Playback preview"}
                </p>
              </div>

              {/* Controls bar mockup */}
              <div className="flex items-center gap-6 justify-center w-full pt-2">
                <button onClick={() => setIsPlayingDemo(!isPlayingDemo)} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2DD4FF] text-black shadow-lg shadow-[#2DD4FF]/20 active:scale-95 transition-all">
                  {isPlayingDemo ? <Pause className="h-5 w-5 fill-black stroke-black" /> : <Play className="h-5 w-5 fill-black stroke-black translate-x-[0.5px]" />}
                </button>
              </div>

              {/* Progress Slider */}
              <div className="w-full flex items-center gap-3 text-[10px] font-mono text-neutral-500">
                <span>0:45</span>
                <div className="flex-1 h-1 bg-neutral-800 rounded-full relative">
                  <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] rounded-full" style={{ width: `${demoProgress}%` }} />
                </div>
                <span>3:10</span>
              </div>

            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Grid Showcase */}
      <section
        id="features"
        className="max-w-7xl w-full mx-auto px-8 pb-20 pt-20 border-t border-white/[0.04] space-y-12 text-left z-10"
      >
        <div className="space-y-3">
          <span className="text-[10px] font-black text-[#9B5CFF] uppercase tracking-[0.2em]">Redefining Audio Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Handcrafted Features for Lossless Purists</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Unified search */}
          <article className="rounded-3xl border border-white/[0.06] bg-white/[0.01] hover:border-[#2DD4FF]/30 p-8 space-y-5 transition-all duration-300 group hover:shadow-2xl">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2DD4FF]/10 border border-[#2DD4FF]/20 text-[#2DD4FF] shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Intelligent Semantic Search</h3>
              <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                Natural query comprehension stage mapping synchronic tags, misspelling corrections, and script transliteration falling back to Bengali.
              </p>
            </div>
          </article>

          {/* Audio stage */}
          <article className="rounded-3xl border border-white/[0.06] bg-white/[0.01] hover:border-[#9B5CFF]/30 p-8 space-y-5 transition-all duration-300 group hover:shadow-2xl">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#9B5CFF]/10 border border-[#9B5CFF]/20 text-[#9B5CFF] shadow-md group-hover:scale-105 transition-transform">
              <Headphones className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Lossless EQ Processing</h3>
              <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                Simulated 5-band graphic equalizers, environmental reverb presets, crossfade settings, and canvas sound visualizer loops.
              </p>
            </div>
          </article>

          {/* Cloud sync */}
          <article className="rounded-3xl border border-white/[0.06] bg-white/[0.01] hover:border-[#34D399]/30 p-8 space-y-5 transition-all duration-300 group hover:shadow-2xl">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#34D399]/10 border border-[#34D399]/20 text-[#34D399] shadow-md group-hover:scale-105 transition-transform">
              <Shield className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Private Cloud Locker</h3>
              <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                Securely upload audio files to private bucket lockers. Keep metadata synchronized with your listening habits automatically.
              </p>
            </div>
          </article>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center border-t border-white/[0.04] text-[10px] text-neutral-500 font-bold tracking-wider gap-4">
          <p>© 2026 NeoTune Operating System. Licensed playback via Official APIs.</p>
          <p>PROUDLY BUILT & OWNED BY SASWATA DEY</p>
        </div>
      </section>
    </section>
  );
}
