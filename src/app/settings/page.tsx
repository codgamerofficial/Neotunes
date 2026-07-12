'use client';

import React, { useState, useEffect } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Settings, User, Key, Sliders, Shield, Loader2, Sparkles, Volume2, Info } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SettingsPage() {
  const supabase = createClientBrowser();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [quality, setQuality] = useState<'auto' | 'high' | 'low'>('auto');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Additional settings state (mock interactive settings)
  const [crossfade, setCrossfade] = useState(true);
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [showExplicit, setShowExplicit] = useState(true);
  const [themeGlow, setThemeGlow] = useState<'dark' | 'neoglow'>('neoglow');

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setDisplayName(profile.display_name || '');
          setAvatarUrl(profile.avatar_url || '');
        }

        // Fetch preferences
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('playback_quality')
          .eq('user_id', user.id)
          .single();
        
        if (prefs) {
          setQuality((prefs.playback_quality as any) || 'auto');
        }
      }
    };
    fetchSettings();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update user preferences table
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          playback_quality: quality,
          updated_at: new Date().toISOString(),
        });

      if (prefError) throw prefError;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setPassword('');
      setMessage({ type: 'success', text: 'Password updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setQuality('auto');
    setCrossfade(true);
    setNormalizeVolume(false);
    setShowExplicit(true);
    setThemeGlow('neoglow');
    setMessage({ type: 'success', text: 'Settings reset to defaults.' });
  };

  return (
    <div className="space-y-10 text-white pb-12 max-w-2xl mx-auto text-left">
      <div className="flex items-center space-x-3 border-b border-neutral-900 pb-4">
        <Settings className="h-8 w-8 text-teal-400" />
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Settings</h1>
      </div>

      {/* Message alerts */}
      {message && (
        <div
          className={`rounded-xl p-4 text-xs font-bold transition-all ${
            message.type === 'success'
              ? 'bg-teal-500/10 text-teal-450 border border-teal-500/25 shadow-[0_0_15px_rgba(20,250,200,0.05)]'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 1. Account Settings form */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-neutral-900 pb-2">
          <User className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-bold tracking-tight">Profile Details</h2>
        </div>
        
        <form onSubmit={handleUpdateProfile} className="glass-panel rounded-2xl p-6 space-y-6 border border-neutral-900/50">
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Saswata Dey"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-neutral-900/60 border border-neutral-850 px-4.5 py-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Avatar Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-xl bg-neutral-900/60 border border-neutral-850 px-4.5 py-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
            />
          </div>

          {/* Audio Quality Segmented Control */}
          <div className="space-y-3 pt-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Audio Quality</label>
            <div className="flex rounded-xl bg-neutral-900/60 p-1 border border-neutral-850">
              {(['auto', 'high', 'low'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all uppercase tracking-wider ${
                    quality === q
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-black shadow-md shadow-teal-500/10'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Playback Tweaks Toggles */}
          <div className="space-y-4 pt-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider border-b border-neutral-900/50 pb-2">Playback Settings</label>
            
            {/* Crossfade */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">Enable Crossfade</p>
                <p className="text-xs text-neutral-500 font-medium">Smoothly transition between consecutive tracks</p>
              </div>
              <button
                type="button"
                onClick={() => setCrossfade(!crossfade)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  crossfade ? 'bg-teal-450' : 'bg-neutral-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  crossfade ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Normalize Volume */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">Normalize Volume</p>
                <p className="text-xs text-neutral-500 font-medium">Keep playback volume consistent across all tracks</p>
              </div>
              <button
                type="button"
                onClick={() => setNormalizeVolume(!normalizeVolume)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  normalizeVolume ? 'bg-teal-450' : 'bg-neutral-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  normalizeVolume ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Explicit Content */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">Show Explicit Content</p>
                <p className="text-xs text-neutral-500 font-medium">Allow explicit tags and content in recommendation feeds</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExplicit(!showExplicit)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showExplicit ? 'bg-teal-450' : 'bg-neutral-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                  showExplicit ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Theme Section */}
          <div className="space-y-4 pt-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider border-b border-neutral-900/50 pb-2">Appearance</label>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-white">Visual Interface Theme</p>
                <p className="text-xs text-neutral-500 font-medium">Switch between standard dark mode and neon glow</p>
              </div>
              <div className="flex bg-neutral-900/60 p-0.5 border border-neutral-850 rounded-xl">
                <button
                  type="button"
                  onClick={() => setThemeGlow('dark')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    themeGlow === 'dark' ? 'bg-neutral-800 text-white' : 'text-neutral-500'
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setThemeGlow('neoglow')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    themeGlow === 'neoglow' ? 'bg-gradient-to-r from-teal-400/20 to-violet-500/20 text-teal-400 border border-teal-500/30' : 'text-neutral-500'
                  }`}
                >
                  Neo Glow
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-between pt-6 border-t border-neutral-900/80">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="rounded-full border border-neutral-800 px-5 py-2.5 text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-350 hover:to-emerald-450 px-7 py-2.5 text-xs font-extrabold text-black active:scale-95 shadow-lg shadow-teal-500/10 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. Security / Password Settings */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-neutral-900 pb-2">
          <Key className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-bold tracking-tight">Security</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="glass-panel rounded-2xl p-6 space-y-4 border border-neutral-900/50">
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-bold uppercase tracking-wider">Change Password</label>
            <input
              type="password"
              placeholder="New Secure Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-neutral-900/60 border border-neutral-850 px-4.5 py-3 text-sm text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="flex items-center justify-center space-x-2 rounded-full bg-neutral-900 border border-neutral-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-850 transition-all disabled:opacity-30"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Change Password</span>
          </button>
        </form>
      </section>
    </div>
  );
}
