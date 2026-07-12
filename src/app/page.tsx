'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion } from 'framer-motion';
import { Music, Play, Sparkles, Shield, Disc, ArrowRight, Loader2 } from 'lucide-react';

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
    <div className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-black text-white px-6 py-12">
      {/* Background glowing atmospheres */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-[120px] sm:h-[500px] sm:w-[500px]" />
      <div className="absolute bottom-10 right-10 -z-10 h-72 w-72 rounded-full bg-blue-500/5 blur-[100px]" />

      {/* Header bar */}
      <header className="flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center space-x-3 text-emerald-400">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-black shadow-md shadow-emerald-500/10">
            <Music className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">NeoTunes</span>
        </div>
        <Link
          href={isAuthenticated ? '/home' : '/auth'}
          className="rounded-full bg-neutral-900 border border-neutral-800 px-5 py-2 text-sm font-semibold hover:bg-neutral-800 transition-colors"
        >
          {isAuthenticated ? 'Go to Home' : 'Sign In'}
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center space-y-8 max-w-3xl my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-black shadow-2xl shadow-emerald-500/20"
        >
          <Disc className="h-12 w-12 animate-spin [animation-duration:8s] stroke-[1.5]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">
            The Future <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Sounds Better.
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-sm text-neutral-400 sm:text-lg md:text-xl">
            Stream anything instantly. NeoTunes blends Spotify metadata, YouTube playback licenses, and your personal cloud locker into one premium interface.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex w-full flex-col items-center justify-center space-y-3"
        >
          {isAuthenticated ? (
            <Link
              href="/home"
              className="flex items-center justify-center space-x-2 rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/10 transition-transform hover:scale-105 active:scale-95"
            >
              <span>Go to Home</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          ) : (
            <>
              <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isGoogleAuthLoading}
                  className="flex items-center justify-center space-x-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-bold text-black shadow-lg shadow-emerald-500/10 transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isGoogleAuthLoading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Connecting to Google</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      <span>Sign In with Google</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isGoogleAuthLoading}
                  className="flex items-center justify-center space-x-2 rounded-full border border-neutral-800 bg-neutral-950 px-6 py-3.5 text-sm font-semibold text-neutral-300 transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <GoogleIcon />
                  <span>Sign Up with Google</span>
                </button>
              </div>
              <Link
                href="/auth"
                className="text-xs font-semibold text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                Use email or passwordless instead
              </Link>
              {authMessage && (
                <div
                  className={`rounded-lg px-4 py-2 text-xs font-semibold ${
                    authMessage.type === 'success'
                      ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'border border-red-500/20 bg-red-500/10 text-red-400'
                  }`}
                >
                  {authMessage.text}
                </div>
              )}
            </>
          )}
          <a
            href="#features"
            className="flex items-center justify-center rounded-full border border-neutral-800 bg-neutral-950 px-8 py-3.5 text-sm font-semibold text-neutral-300 hover:bg-neutral-900 transition-colors"
          >
            Explore Features
          </a>
        </motion.div>
      </main>

      {/* Feature cards row */}
      <section id="features" className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-5xl w-full border-t border-neutral-900 pt-12 mt-12">
        {[
          {
            title: 'Unified Catalogs',
            desc: 'Search combined results across local uploads, Spotify, and YouTube APIs.',
            icon: Sparkles,
          },
          {
            title: 'Licensed Playback',
            desc: 'Official playback client running directly via YouTube IFrame streams.',
            icon: Play,
          },
          {
            title: 'Cloud Library Locker',
            desc: 'Secure private uploads. Save and stream custom music lockers on the go.',
            icon: Shield,
          },
        ].map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="glass rounded-xl p-5 text-left space-y-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">{feature.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{feature.desc}</p>
            </div>
          );
        })}
      </section>

      {/* Footer copyright */}
      <footer className="mt-16 text-center text-xs text-neutral-600 w-full border-t border-neutral-950 pt-6">
        <p>© 2526 NeoTunes Music. Project owned by Saswata Dey.</p>
      </footer>
    </div>
  );
}
