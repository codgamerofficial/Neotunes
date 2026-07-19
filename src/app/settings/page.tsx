'use client';

import React, { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { 
  Settings, 
  User, 
  Sliders, 
  Volume2, 
  Download, 
  Shield, 
  Bell, 
  Terminal, 
  SlidersHorizontal,
  Sparkles,
  Info,
  Check,
  RefreshCw,
  Eye,
  Lock,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CampaignSettingsCard } from '@/components/campaign/CampaignComponents';
import { getCampaignState } from '@/lib/campaignManager';

type SettingsSection = 
  | 'general' 
  | 'playback' 
  | 'audio' 
  | 'appearance' 
  | 'downloads' 
  | 'privacy' 
  | 'notifications' 
  | 'developer';

export default function SettingsPage() {
  const supabase = createClientBrowser();

  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  
  // Playback States
  const [quality, setQuality] = useState<'low' | 'auto' | 'high' | 'lossless' | 'atmos'>('auto');
  const [crossfade, setCrossfade] = useState(true);
  const [crossfadeSec, setCrossfadeSec] = useState(6);
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [autoplay, setAutoplay] = useState(true);

  // EQ States
  const [eqBass, setEqBass] = useState(4);
  const [eqMid, setEqMid] = useState(2);
  const [eqTreble, setEqTreble] = useState(6);

  // Appearance Preset
  const [theme, setTheme] = useState<'neoglow' | 'dark' | 'oled' | 'cyberpunk'>('neoglow');
  const [compactMode, setCompactMode] = useState(false);

  // General States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [campaignActive, setCampaignActive] = useState(false);

  useEffect(() => {
    setCampaignActive(getCampaignState().isActive);
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setDisplayName(profile.display_name || '');
          setAvatarUrl(profile.avatar_url || '');
        }

        const { data: pref } = await supabase
          .from('user_preferences')
          .select('playback_quality')
          .eq('user_id', user.id)
          .single();
        
        if (pref) {
          setQuality(pref.playback_quality as any || 'auto');
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

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

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
        origin: { y: 0.85 },
        colors: ['#2DD4FF', '#9B5CFF', '#34D399'],
      });
      setMessage({ type: 'success', text: 'System preferences saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save changes.' });
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
      setMessage({ type: 'success', text: 'Account credentials successfully updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setQuality('auto');
    setCrossfade(true);
    setCrossfadeSec(6);
    setNormalizeVolume(false);
    setTheme('neoglow');
    setEqBass(5);
    setEqMid(5);
    setEqTreble(5);
    setMessage({ type: 'success', text: 'Restored default NeoTunes configurations.' });
  };

  return (
    <div className="space-y-8 text-white pb-20 max-w-5xl mx-auto text-left select-none font-sans relative">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-5">
        <div className="flex items-center space-x-3.5">
          <Settings className="h-8 w-8 text-[#2DD4FF]" />
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Control Center</h1>
        </div>

        <button
          onClick={handleResetDefaults}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] px-4.5 py-2.5 text-xs font-black uppercase tracking-wider text-neutral-450 hover:text-white transition-colors"
        >
          Reset Defaults
        </button>
      </div>

      {/* Message alerts */}
      {message && (
        <div className={`rounded-xl p-4.5 text-xs font-bold border text-left ${message.type === 'success' ? 'bg-[#2DD4FF]/10 border-[#2DD4FF]/20 text-[#2DD4FF]' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* 2. DUAL LAYOUT PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        
        {/* Left Side: Side Nav categories */}
        <div className="flex flex-col gap-1">
          {[
            { id: 'general', label: 'General Locker', icon: User },
            { id: 'playback', label: 'Playback Engine', icon: Sliders },
            { id: 'audio', label: 'Audio Decoder', icon: Volume2 },
            { id: 'appearance', label: 'Appearance', icon: SlidersHorizontal },
            { id: 'downloads', label: 'Downloads Cache', icon: Download }
          ].map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => { setActiveSection(section.id as SettingsSection); setMessage(null); }}
                className={`flex items-center gap-3.5 rounded-xl px-4.5 py-3.5 text-xs font-black uppercase tracking-widest transition-all border ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#2DD4FF]/10 via-[#9B5CFF]/5 to-transparent border-[#2DD4FF]/25 text-[#2DD4FF]' 
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{section.label}</span>
              </button>
            );
          })}

          {campaignActive && (
            <div className="mt-4 pt-4 border-t border-white/[0.04] w-full">
              <CampaignSettingsCard />
            </div>
          )}
        </div>

        {/* Right Side: Section viewport */}
        <div className="md:col-span-3">
          
          {/* GENERAL SECTION */}
          {activeSection === 'general' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#2DD4FF]">General Settings</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Customize your personal profile metadata</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Saswata Dey"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] px-4.5 py-3.5 text-xs font-semibold text-white outline-none focus:border-[#2DD4FF] focus:shadow-[0_0_15px_rgba(45,212,255,0.1)] transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Avatar Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] px-4.5 py-3.5 text-xs font-semibold text-white outline-none focus:border-[#2DD4FF] focus:shadow-[0_0_15px_rgba(45,212,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Update account credentials password</label>
                  <input
                    type="password"
                    placeholder="New password complexity..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] px-4.5 py-3.5 text-xs font-semibold text-white outline-none focus:border-[#2DD4FF] focus:shadow-[0_0_15px_rgba(45,212,255,0.1)] transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={!password || loading}
                  className="rounded-xl border border-white/[0.06] bg-[#0E0E11] px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-neutral-900 disabled:opacity-40 transition-colors"
                >
                  Update credentials
                </button>
              </div>

              <div className="pt-6 border-t border-white/[0.04] flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#2DD4FF]/10 hover:opacity-90 active:scale-97 transition-all"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}

          {/* PLAYBACK SETTINGS */}
          {activeSection === 'playback' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#2DD4FF]">Playback Engine</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Control timeline transitions & level parameters</p>
              </div>

              <div className="space-y-5">
                {/* Crossfade */}
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Timeline Crossfader</p>
                    <p className="text-xs text-neutral-400 font-semibold mt-0.5 leading-normal">Fades out active track while launching the next</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCrossfade(!crossfade)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      crossfade ? 'bg-[#2DD4FF]' : 'bg-neutral-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      crossfade ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {crossfade && (
                  <div className="space-y-2 pb-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-neutral-450">
                      <span>Crossfade Length</span>
                      <span className="font-mono text-[#2DD4FF]">{crossfadeSec}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="15" 
                      value={crossfadeSec}
                      onChange={e => setCrossfadeSec(Number(e.target.value))}
                      className="w-full accent-[#2DD4FF] bg-neutral-900"
                    />
                  </div>
                )}

                {/* Normalize */}
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Normalize Audio Level</p>
                    <p className="text-xs text-neutral-400 font-semibold mt-0.5 leading-normal">Maintain consistent playback decibels across sources</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNormalizeVolume(!normalizeVolume)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      normalizeVolume ? 'bg-[#2DD4FF]' : 'bg-neutral-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      normalizeVolume ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AUDIO ENGINE */}
          {activeSection === 'audio' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#2DD4FF]">Audio Engine</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Configure spatial decoder & sound wave pipelines</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Decoder Quality Choice</label>
                  <div className="grid grid-cols-5 rounded-xl bg-neutral-950/60 p-1 border border-white/[0.04]">
                    {([
                      { id: 'low', label: 'Low' },
                      { id: 'auto', label: 'Auto' },
                      { id: 'high', label: 'High' },
                      { id: 'lossless', label: 'Lossless' },
                      { id: 'atmos', label: 'Atmos' }
                    ] as const).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setQuality(q.id)}
                        className={`rounded-lg py-2.5 text-[9px] font-black transition-all uppercase tracking-wider ${
                          quality === q.id
                            ? 'bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] text-black shadow'
                            : 'text-neutral-405 hover:text-white'
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* EQ controls */}
                <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Spatial Equalizer (EQ)</label>
                    <button type="button" onClick={() => { setEqBass(5); setEqMid(5); setEqTreble(5); }} className="text-[9px] font-black text-[#2DD4FF] uppercase tracking-wider">Flat Mode</button>
                  </div>

                  <div className="flex justify-around items-center h-32 bg-neutral-950/40 border border-white/[0.04] rounded-2xl p-5">
                    {[
                      { label: 'Bass Booster', val: eqBass, setter: setEqBass },
                      { label: 'Vocals Mid', val: eqMid, setter: setEqMid },
                      { label: 'Spatial Treble', val: eqTreble, setter: setEqTreble }
                    ].map((band) => (
                      <div key={band.label} className="flex flex-col items-center h-full gap-2">
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          value={band.val} 
                          onChange={e => band.setter(Number(e.target.value))}
                          className="h-20 accent-[#2DD4FF] cursor-ns-resize"
                          style={{ WebkitAppearance: 'slider-vertical' }}
                        />
                        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">{band.label.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE PRESET */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#2DD4FF]">Appearance Preset</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Toggle interface design palettes & compact layouts</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">Choose Preset Palette</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'neoglow', label: 'Neo Glow', desc: 'Neon cyan & purple outlines', colors: 'from-[#2DD4FF] to-[#9B5CFF]' },
                      { id: 'dark', label: 'Dark Carbon', desc: 'Slate grey & chrome accents', colors: 'from-neutral-700 to-neutral-400' },
                      { id: 'oled', label: 'OLED Black', desc: 'Pure black backdrop (#000)', colors: 'from-neutral-900 to-black' },
                      { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neon yellow & hot pink highlights', colors: 'from-[#FF2D55] to-[#F59E0B]' }
                    ].map(t => (
                      <div
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={`rounded-2xl p-4.5 border cursor-pointer text-left transition-all duration-300 relative group overflow-hidden ${
                          theme === t.id 
                            ? 'border-[#2DD4FF]/40 bg-[#2DD4FF]/5 shadow-lg' 
                            : 'bg-neutral-950/60 border-white/[0.04] hover:border-white/[0.08]'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black text-white uppercase tracking-wider block">{t.label}</span>
                          <div className={`h-3 w-8 rounded bg-gradient-to-r ${t.colors} border border-white/[0.08]`} />
                        </div>
                        <p className="text-[10px] text-neutral-450 font-semibold leading-relaxed">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compact Grid Toggle */}
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Compact Layout</p>
                    <p className="text-xs text-neutral-400 font-semibold mt-0.5 leading-normal">Shrinks carousel sizes for high display density</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompactMode(!compactMode)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      compactMode ? 'bg-[#2DD4FF]' : 'bg-neutral-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      compactMode ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DOWNLOADS SECTION */}
          {activeSection === 'downloads' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#2DD4FF]">Downloads Cache</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Manage local IndexedDB audio storage limits</p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/[0.04] bg-[#0E0E11]/85 p-5 flex justify-between items-center shadow-lg">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block">Offline Cache Space</span>
                    <p className="text-2xl font-black text-white">12.4 MB Logged</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { alert('Browser cache cleared successfully!'); }}
                    className="rounded-xl border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 px-5 py-3 text-xs font-black uppercase tracking-wider text-red-400 transition-colors"
                  >
                    Clear cache
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
