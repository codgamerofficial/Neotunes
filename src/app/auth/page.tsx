'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Mail, Lock, User, Sparkles, ArrowRight, Loader2, Key, Shield, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import NeoTuneLogo from '@/components/navigation/NeoTuneLogo';

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

  // Password strength state
  const [pwdStrength, setPwdStrength] = useState({ score: 0, label: 'Too short', color: 'bg-red-500' });

  useEffect(() => {
    if (password.length === 0) {
      setPwdStrength({ score: 0, label: 'Too short', color: 'bg-red-500' });
    } else if (password.length < 6) {
      setPwdStrength({ score: 1, label: 'Weak', color: 'bg-red-400' });
    } else if (password.length < 10) {
      setPwdStrength({ score: 2, label: 'Good strength', color: 'bg-cyan-400' });
    } else {
      setPwdStrength({ score: 3, label: 'Excellent complexity', color: 'bg-emerald-400' });
    }
  }, [password]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#00F5FF', '#9B5CFF', '#34D399'],
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
        setMessage({ type: 'success', text: 'Logged in successfully! Loading workspace...' });
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
        setMessage({ type: 'success', text: 'Registered! Please check your email inbox to verify.' });
      } else if (mode === 'magiclink') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Magic Link sent! Please verify in your email app.' });
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset link sent! Check your inbox.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred during authentication.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github' | 'apple') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'OAuth redirect failed.' });
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-4 select-none">
      
      {/* Interactive Glowing Orb Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-[#00F5FF]/10 blur-[130px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-[#9B5CFF]/10 blur-[130px] animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md rounded-[28px] p-[1.5px] bg-gradient-to-tr from-white/[0.12] to-transparent shadow-[0_24px_50px_rgba(0,0,0,0.8)] border border-white/[0.06] backdrop-blur-2xl bg-white/[0.01]"
      >
        <div className="w-full h-full p-6 sm:p-8 flex flex-col">
          
          {/* Logo & Assistant Greeting */}
          <div className="flex flex-col items-center space-y-3.5 text-center">
            <div className="flex items-center justify-center text-[#00F5FF]">
              <NeoTuneLogo className="h-10 w-10" showText={false} />
            </div>
            
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-3.5 text-left w-full relative nothing-dots">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00F5FF] flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>AI DJ Welcome</span>
              </span>
              <p className="text-[11px] text-neutral-400 font-semibold leading-relaxed">
                &ldquo;Hello. Sign in to NeoTunes to load your custom workspace presets, manage your Cloud Locker, and access our semantic query engine.&rdquo;
              </p>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="mt-6 flex justify-center space-x-1 rounded-xl bg-neutral-950/60 p-1 border border-white/[0.04]">
            {[
              { id: 'signin', label: 'Sign In' },
              { id: 'signup', label: 'Sign Up' },
              { id: 'magiclink', label: 'Magic Link' }
            ].map((tab) => {
              const isActive = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id as any);
                    setMessage(null);
                  }}
                  className={`flex-1 rounded-lg py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                    isActive ? 'bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] text-black shadow-md' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="mt-5 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 text-left"
              >
                {mode === 'signup' && (
                  <div className="relative group">
                    <User className="absolute top-3.5 left-4 h-4.5 w-4.5 text-neutral-500 group-focus-within:text-[#00F5FF] transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] py-3 pr-4 pl-11 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition-all focus:border-[#00F5FF] focus:shadow-[0_0_12px_rgba(0,245,255,0.15)]"
                    />
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute top-3.5 left-4 h-4.5 w-4.5 text-neutral-500 group-focus-within:text-[#00F5FF] transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] py-3 pr-4 pl-11 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition-all focus:border-[#00F5FF] focus:shadow-[0_0_12px_rgba(0,245,255,0.15)]"
                  />
                </div>

                {(mode === 'signin' || mode === 'signup') && (
                  <div className="relative group">
                    <Lock className="absolute top-3.5 left-4 h-4.5 w-4.5 text-neutral-500 group-focus-within:text-[#00F5FF] transition-colors" />
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] py-3 pr-4 pl-11 text-xs font-semibold text-white placeholder-neutral-500 outline-none transition-all focus:border-[#00F5FF] focus:shadow-[0_0_12px_rgba(0,245,255,0.15)]"
                    />
                  </div>
                )}

                {/* Password strength meter on sign up */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="space-y-1.5 pt-1 px-1">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-neutral-500">
                      <span>Password Complexity</span>
                      <span className="text-[#00F5FF]">{pwdStrength.label}</span>
                    </div>
                    <div className="flex gap-1 h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div className={`h-full ${pwdStrength.color} transition-all duration-300`} style={{ width: `${(pwdStrength.score + 1) * 33.3}%` }} />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Alerts */}
            {message && (
              <div className={`rounded-xl p-3.5 text-xs font-bold border text-left ${message.type === 'success' ? 'border-[#34D399]/20 bg-[#34D399]/5 text-[#34D399]' : 'border-[#EF4444]/20 bg-[#EF4444]/5 text-[#EF4444]'}`}>
                {message.text}
              </div>
            )}

            {/* Forgot Link */}
            {mode === 'signin' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[9px] font-black uppercase tracking-wider text-neutral-500 hover:text-[#00F5FF] transition-colors"
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
                  className="text-[9px] font-black uppercase tracking-wider text-neutral-500 hover:text-[#00F5FF] transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] py-3 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-[#00F5FF]/10 hover:opacity-90 active:scale-97 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'magiclink' && 'Send Magic Link'}
                    {mode === 'forgot' && 'Reset Password'}
                  </span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Social Logins */}
          {(mode === 'signin' || mode === 'signup') && (
            <>
              <div className="my-5 flex items-center justify-between text-neutral-700">
                <span className="w-1/3 border-b border-white/[0.04]" />
                <span className="text-[9px] font-black uppercase tracking-wider text-neutral-500">or connect via</span>
                <span className="w-1/3 border-b border-white/[0.04]" />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Google */}
                <button
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  className="flex items-center justify-center border border-white/[0.06] bg-[#0c0c0c] hover:border-[#00F5FF]/40 rounded-xl py-3 active:scale-95 transition-all text-neutral-450 hover:text-white"
                  title="Connect via Google"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3h3.86c2.26-2.09 3.67-5.17 3.67-8.45z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.08C3.26 21.88 7.37 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.27 14.29a7.18 7.18 0 0 1 0-2.58V8.63H1.29a11.97 11.97 0 0 0 0 6.74l3.98-3.08z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.12 1.29 5.71l3.98 3.08c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                </button>

                {/* Github */}
                <button
                  onClick={() => handleOAuthLogin('github')}
                  disabled={loading}
                  className="flex items-center justify-center border border-white/[0.06] bg-[#0c0c0c] hover:border-[#9B5CFF]/40 rounded-xl py-3 active:scale-95 transition-all text-neutral-450 hover:text-white"
                  title="Connect via GitHub"
                >
                  <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </button>

                {/* Apple */}
                <button
                  onClick={() => handleOAuthLogin('apple' as any)}
                  disabled={loading}
                  className="flex items-center justify-center border border-white/[0.06] bg-[#0c0c0c] hover:border-[#34D399]/45 rounded-xl py-3 active:scale-95 transition-all text-neutral-450 hover:text-white"
                  title="Connect via Apple ID"
                >
                  <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39" />
                  </svg>
                </button>
              </div>
            </>
          )}

        </div>
      </motion.div>
    </div>
  );
}
