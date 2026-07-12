'use client';

import React, { useState, useEffect } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Settings, User, Key, Sliders, Shield, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SettingsPage() {
  const supabase = createClientBrowser();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [quality, setQuality] = useState<'auto' | 'high' | 'low'>('auto');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  return (
    <div className="space-y-10 text-white pb-12 max-w-2xl mx-auto text-left">
      <div className="flex items-center space-x-3 border-b border-neutral-900 pb-4">
        <Settings className="h-8 w-8 text-emerald-400" />
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
      </div>

      {/* Message alerts */}
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

      {/* 1. Account Settings form */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-neutral-900 pb-2">
          <User className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-bold">Profile Details</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="glass-panel rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-semibold">Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Saswata Dey"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-neutral-850 bg-neutral-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-semibold">Avatar Image URL</label>
            <input
              type="text"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-lg border border-neutral-850 bg-neutral-950 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-semibold">Audio Quality</label>
            <div className="flex space-x-2">
              {(['auto', 'high', 'low'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold border transition-all ${
                    quality === q
                      ? 'bg-emerald-500 border-emerald-500 text-black shadow-md shadow-emerald-500/10'
                      : 'border-neutral-850 hover:border-neutral-700 text-neutral-400'
                  }`}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center space-x-2 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save Profile</span>
          </button>
        </form>
      </section>

      {/* 2. Security / Password Settings */}
      <section className="space-y-4">
        <div className="flex items-center space-x-2 border-b border-neutral-900 pb-2">
          <Key className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-bold">Security</h2>
        </div>
        <form onSubmit={handleUpdatePassword} className="glass-panel rounded-xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block font-semibold">Change Password</label>
            <input
              type="password"
              placeholder="New Secure Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-855 bg-neutral-955 px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !password}
            className="flex items-center justify-center space-x-2 rounded-full bg-neutral-900 border border-neutral-800 px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-30"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Change Password</span>
          </button>
        </form>
      </section>
    </div>
  );
}
