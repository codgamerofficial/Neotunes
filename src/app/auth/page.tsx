'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Mail, Lock, User, Sparkles, ArrowRight, Loader2, Key } from 'lucide-react';
import confetti from 'canvas-confetti';

type AuthMode = 'signin' | 'signup' | 'magiclink' | 'forgot';

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClientBrowser();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#1db954', '#ffffff', '#121212'],
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        triggerConfetti();
        setMessage({ type: 'success', text: 'Logged in successfully! Redirecting...' });
        setTimeout(() => router.push('/home'), 1200);
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              name: name,
            },
          },
        });
        if (error) throw error;
        triggerConfetti();
        setMessage({ type: 'success', text: 'Registration successful! Check your email to verify.' });
      } else if (mode === 'magiclink') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Magic Link sent! Please check your inbox.' });
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset link sent! Check your email.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred during authentication.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'OAuth initialization failed.' });
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Dynamic atmospheric radial background glow */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px] sm:h-96 sm:w-96" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px] sm:h-96 sm:w-96" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-premium w-full max-w-md rounded-2xl p-6 sm:p-8"
      >
        {/* App Title & Branding */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/20">
            <Music className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">NeoTunes</h1>
          <p className="text-sm text-neutral-400">&ldquo;The Future Sounds Better.&rdquo;</p>
        </div>

        {/* Tab Selection Controls */}
        <div className="mt-8 flex justify-center space-x-1 rounded-lg bg-neutral-900/60 p-1">
          <button
            onClick={() => {
              setMode('signin');
              setMessage(null);
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
              mode === 'signin' ? 'bg-emerald-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('signup');
              setMessage(null);
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
              mode === 'signup' ? 'bg-emerald-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => {
              setMode('magiclink');
              setMessage(null);
            }}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
              mode === 'magiclink' ? 'bg-emerald-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Passwordless
          </button>
        </div>

        {/* Auth form submission */}
        <form onSubmit={handleAuth} className="mt-6 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {mode === 'signup' && (
                <div className="relative">
                  <User className="absolute top-3 left-3 h-5 w-5 text-neutral-500" />
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute top-3 left-3 h-5 w-5 text-neutral-500" />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500"
                />
              </div>

              {(mode === 'signin' || mode === 'signup') && (
                <div className="relative">
                  <Lock className="absolute top-3 left-3 h-5 w-5 text-neutral-500" />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Success/Error Alerts */}
          {message && (
            <div
              className={`rounded-lg p-3 text-xs font-semibold ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Forgot Password Link */}
          {mode === 'signin' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'magiclink' && 'Send Magic Link'}
                  {mode === 'forgot' && 'Send Reset Email'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        {(mode === 'signin' || mode === 'signup') && (
          <>
            <div className="my-6 flex items-center justify-between text-neutral-600">
              <span className="w-1/3 border-b border-neutral-800" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">or</span>
              <span className="w-1/3 border-b border-neutral-800" />
            </div>

            {/* Google OAuth Access Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 text-sm font-semibold text-white transition-all hover:bg-neutral-900"
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.09 3.67-5.17 3.67-8.45z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.08C3.26 21.88 7.37 24 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.29a7.18 7.18 0 0 1 0-2.58V8.63H1.29a11.97 11.97 0 0 0 0 6.74l3.98-3.08z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.12 1.29 5.71l3.98 3.08c.95-2.85 3.6-4.96 6.73-4.96z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
