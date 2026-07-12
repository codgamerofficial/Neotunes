'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion } from 'framer-motion';
import { Play, Sparkles, Shield, Disc, ArrowRight, Loader2 } from 'lucide-react';
import NeoTuneLogo from '@/components/navigation/NeoTuneLogo';

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.09 3.67-5.17 3.67-8.45z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.08C3.26 21.88 7.37 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.18 7.18 0 0 1 0-2.58V8.63H1.29a11.97 11.97 0 0 0 0 6.74l3.98-3.08z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.12 1.29 5.71l3.98 3.08c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

export default function LandingPage() {
  const supabase = createClientBrowser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();
  }, []);

  const handleGoogleAuth = async () => {
    setIsGoogleAuthLoading(true);
    setAuthMessage({ type: 'success', text: 'Redirecting to Google...' });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/home`,
      },
    });

    if (error) {
      setAuthMessage({ type: 'error', text: error.message || 'Google authentication failed. Please try again.' });
      setIsGoogleAuthLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen bg-transparent text-white flex flex-col justify-between overflow-x-hidden">
      {/* Background glowing atmospheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 h-[350px] w-[350px] rounded-full bg-teal-500/10 blur-[120px] sm:h-[500px] sm:w-[500px]" />
      <div className="absolute bottom-10 right-10 -z-10 h-72 w-72 rounded-full bg-violet-500/5 blur-[100px]" />

      {/* Top Nav Header */}
      <header className="flex w-full max-w-6xl items-center justify-between z-10 px-6 py-6 mx-auto">
        <Link href="/" className="flex items-center gap-2 text-teal-400">
          <NeoTuneLogo className="h-8 w-8" showText={true} />
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href={isAuthenticated ? '/home' : '/auth'}
            className="rounded-full border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 px-5 py-2 text-xs font-bold text-teal-450 hover:border-teal-500/40 transition-colors"
          >
            {isAuthenticated ? 'Go to Home' : 'Sign In'}
          </Link>
        </nav>
      </header>

      {/* Hero Content Section */}
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between px-6 pb-16 pt-8 lg:pt-16 gap-12 z-10 flex-1 w-full">
        {/* Left: Text & CTAs */}
        <div className="max-w-xl space-y-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-white via-neutral-100 to-neutral-350 bg-clip-text text-transparent leading-tight">
              The future of your <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-teal-400 to-emerald-450 bg-clip-text text-transparent font-black">
                personal music cloud.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 font-semibold leading-relaxed">
              NeoTune unifies Spotify metadata, YouTube playback, and your own cloud locker uploads into one secure streaming interface—accessible on any device.
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={isAuthenticated ? '/home' : '/auth'}
                className="flex items-center space-x-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-350 hover:to-emerald-450 px-8 py-3 text-sm font-extrabold text-black active:scale-95 transition-all shadow-lg shadow-teal-500/10"
              >
                <span>Start listening</span>
                <ArrowRight className="h-4.5 w-4.5 stroke-[2.5]" />
              </Link>
              <a
                href="#features"
                className="flex items-center justify-center rounded-full border border-neutral-800 bg-neutral-950/40 hover:border-neutral-700/80 px-8 py-3 text-sm font-bold text-neutral-300 hover:text-white transition-colors"
              >
                Learn how it works
              </a>
            </div>

            {/* Quick Connect Google Auth */}
            {!isAuthenticated && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Quick Connect</p>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isGoogleAuthLoading}
                  className="flex items-center justify-center space-x-2.5 rounded-full bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 px-5 py-2.5 text-xs font-bold text-neutral-300 hover:text-white transition-all disabled:opacity-75"
                >
                  {isGoogleAuthLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>Connect with Google</span>
                </button>
              </div>
            )}

            {/* Feedback Message */}
            {authMessage && (
              <div
                className={`rounded-xl px-4 py-2.5 text-xs font-bold w-fit transition-all ${
                  authMessage.type === 'success'
                    ? 'border border-teal-500/25 bg-teal-500/10 text-teal-450 shadow-[0_0_15px_rgba(20,250,200,0.05)]'
                    : 'border border-red-500/20 bg-red-500/10 text-red-400'
                }`}
              >
                {authMessage.text}
              </div>
            )}
          </motion.div>

          {/* Trust copy */}
          <p className="pt-2 text-xs text-neutral-500 font-semibold">
            No ads. Your uploads stay private. Licensed playback via official APIs.
          </p>
        </div>

        {/* Right: Abstract Visual Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex items-center justify-center lg:justify-end w-full lg:w-[420px] aspect-square"
        >
          {/* Ambient glowing circles */}
          <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 via-emerald-500/10 to-violet-500/20 rounded-full blur-3xl animate-pulse" />
          
          {/* Glowing Visual Player Card */}
          <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-3xl p-[2px] bg-gradient-to-tr from-teal-400 via-emerald-450 to-violet-500 shadow-[0_0_50px_rgba(20,250,200,0.15)] flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-5 overflow-hidden relative group">
              
              {/* Pulsating Visualizer Bars */}
              <div className="flex items-end justify-center gap-1.5 h-16 w-full">
                <div className="w-1.5 bg-teal-400 rounded-full animate-[bounce_0.8s_infinite] h-8" />
                <div className="w-1.5 bg-emerald-450 rounded-full animate-[bounce_1.1s_infinite] h-14" />
                <div className="w-1.5 bg-teal-350 rounded-full animate-[bounce_0.9s_infinite] h-10" />
                <div className="w-1.5 bg-emerald-400 rounded-full animate-[bounce_1.3s_infinite] h-16" />
                <div className="w-1.5 bg-violet-400 rounded-full animate-[bounce_1.0s_infinite] h-12" />
              </div>
              
              {/* Rotating Vinyl Disc */}
              <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-neutral-900 to-neutral-950 flex items-center justify-center border-4 border-neutral-800 shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-spin [animation-duration:12s]">
                {/* Groove rings */}
                <div className="absolute inset-2 rounded-full border border-neutral-800/40" />
                <div className="absolute inset-5 rounded-full border border-neutral-800/40" />
                <div className="absolute inset-8 rounded-full border border-neutral-800/40" />
                
                {/* Disk label */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-450 flex items-center justify-center border-2 border-neutral-950 shadow-inner">
                  <div className="w-3 h-3 rounded-full bg-neutral-950" />
                </div>
              </div>

              {/* Branding badge */}
              <div className="text-center z-10">
                <p className="text-xs font-black tracking-[0.2em] text-neutral-250 uppercase">NeoTune Player</p>
                <p className="text-[10px] text-teal-450 font-bold uppercase tracking-wider">Ready for Playback</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <section
        id="features"
        className="max-w-6xl w-full mx-auto px-6 pb-16 pt-16 border-t border-neutral-900/80 space-y-8 text-left z-10"
      >
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Why NeoTune feels different</h2>
          <p className="text-sm text-neutral-450 font-semibold">
            Move beyond scattered playlists. Keep your streaming, uploads, and cloud locker in one place.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Unified Catalogs */}
          <article className="liquid-panel liquid-interactive rounded-2xl p-6 space-y-4 border border-neutral-900/50 hover:border-teal-500/20">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Unified Catalogs</h3>
              <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                Search combined results across local uploads, Spotify, and YouTube APIs.
              </p>
            </div>
          </article>

          {/* Licensed Playback */}
          <article className="liquid-panel liquid-interactive rounded-2xl p-6 space-y-4 border border-neutral-900/50 hover:border-teal-500/20">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-md">
              <Play className="h-5 w-5 fill-teal-400 stroke-none translate-x-[0.5px]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Licensed Playback</h3>
              <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                Official playback client running safely via YouTube IFrame and streaming APIs.
              </p>
            </div>
          </article>

          {/* Cloud Library Locker */}
          <article className="liquid-panel liquid-interactive rounded-2xl p-6 space-y-4 border border-neutral-900/50 hover:border-teal-500/20">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-tight">Cloud Library Locker</h3>
              <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                Secure private uploads, save and stream your custom lockers on the go.
              </p>
            </div>
          </article>
        </div>

        <p className="pt-4 text-[11px] text-neutral-600 font-bold">
          © 2026 NeoTune Music. Project owned by Saswata Dey.
        </p>
      </section>
    </section>
  );
}
