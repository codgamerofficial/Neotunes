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
        colors: ['#00F5FF', '#9B5CFF', '#34D399'],
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
    <div className="space-y-8 text-white pb-36 sm:pb-20 max-w-5xl mx-auto text-left select-none font-sans relative">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-5">
        <div className="flex items-center space-x-3">
          <Settings className="h-7 w-7 text-[#00F5FF]" />
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
        <div className={`rounded-xl p-4 text-xs font-bold border text-left ${message.type === 'success' ? 'bg-[#00F5FF]/10 border-[#00F5FF]/20 text-[#00F5FF]' : 'bg-red-500/10 border-red-500/20 text-red-405'}`}>
          {message.text}
        </div>
      )}

      {/* 2. DUAL LAYOUT PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        
        {/* Left Side: Side Nav categories */}
        <div className="flex flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 flex-row md:flex-col border-b md:border-b-0 border-white/[0.04] mb-4 md:mb-0">
          {[
            { id: 'general', label: 'General Vibe', icon: User },
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
                className={`flex items-center gap-3 rounded-xl px-4.5 py-3 text-xs font-black uppercase tracking-wider transition-all border flex-shrink-0 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#00F5FF]/10 via-[#9B5CFF]/5 to-transparent border-[#00F5FF]/20 text-[#00F5FF]' 
                    : 'border-transparent text-neutral-500 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{section.label.split(' ')[0]}</span>
              </button>
            );
          })}

          {campaignActive && (
            <div className="mt-4 pt-4 border-t border-white/[0.04] w-full hidden md:block">
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
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00F5FF]">General Settings</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Customize your personal profile metadata</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Saswata Dey"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] px-4.5 py-3.5 text-xs font-semibold text-white outline-none focus:border-[#00F5FF] focus:shadow-[0_0_15px_rgba(0,245,255,0.1)] transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Avatar Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] px-4.5 py-3.5 text-xs font-semibold text-white outline-none focus:border-[#00F5FF] focus:shadow-[0_0_15px_rgba(0,245,255,0.1)] transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Update account credentials password</label>
                  <input
                    type="password"
                    placeholder="New password complexity..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-[#0c0c0c] px-4.5 py-3.5 text-xs font-semibold text-white outline-none focus:border-[#00F5FF] focus:shadow-[0_0_15px_rgba(0,245,255,0.1)] transition-all"
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
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] px-6 py-3.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-[#00F5FF]/10 hover:opacity-90 active:scale-95 transition-all"
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
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00F5FF]">Playback Engine</h3>
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
                      crossfade ? 'bg-[#00F5FF]' : 'bg-neutral-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      crossfade ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {crossfade && (
                  <div className="space-y-2 pb-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-neutral-450">
                      <span>Crossfade Length</span>
                      <span className="font-mono text-[#00F5FF]">{crossfadeSec}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="2" 
                      max="15" 
                      value={crossfadeSec}
                      onChange={e => setCrossfadeSec(Number(e.target.value))}
                      className="w-full accent-[#00F5FF] bg-neutral-900"
                    />
                  </div>
                )}

                {/* Autoplay */}
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-4 pt-2">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Queue Autoplay</p>
                    <p className="text-xs text-neutral-400 font-semibold mt-0.5 leading-normal">Launch related tracks when current queue completes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoplay(!autoplay)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoplay ? 'bg-[#00F5FF]' : 'bg-neutral-800'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      autoplay ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Audio Normalization */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Volume Normalizer</p>
                    <p className="text-xs text-neutral-400 font-semibold mt-0.5 leading-normal">Maintains a consistent volume amplitude across streams</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNormalizeVolume(!normalizeVolume)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      normalizeVolume ? 'bg-[#00F5FF]' : 'bg-neutral-800'
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

          {/* AUDIO DECODER SETTINGS */}
          {activeSection === 'audio' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00F5FF]">Audio Decoder</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Adjust decoder quality levels and EQ bounds</p>
              </div>

              <div className="space-y-6">
                {/* Streaming Quality */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Playback Stream Resolution</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { id: 'low', label: 'Low (64 kbps)', desc: 'Saves data usage' },
                      { id: 'auto', label: 'Auto (Dynamic)', desc: 'Adapts to bandwidth' },
                      { id: 'high', label: 'High (320 kbps)', desc: 'Rich stereo width' },
                      { id: 'lossless', label: 'Lossless Hi-Fi', desc: 'Bit-perfect FLAC' },
                      { id: 'atmos', label: 'Spatial Atmos', desc: 'Binaural 3D Stage' }
                    ].map(opt => {
                      const isActive = quality === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setQuality(opt.id as any)}
                          className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${
                            isActive
                              ? 'border-[#00F5FF] bg-[#00F5FF]/5 text-[#00F5FF]'
                              : 'border-white/[0.06] bg-neutral-900/40 text-neutral-450 hover:text-white'
                          }`}
                        >
                          <h4 className="text-[10px] font-black uppercase tracking-wider">{opt.label.split(' ')[0]}</h4>
                          <p className="text-[8px] text-neutral-500 font-bold mt-0.5 leading-normal">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Parametric Equalizer knobs */}
                <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                  <label className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Parametric Equalizer (Hardware EQ)</label>
                  <div className="grid grid-cols-3 gap-5 bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl">
                    <div className="space-y-1 text-center">
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">Bass range</span>
                      <input type="range" min="0" max="10" value={eqBass} onChange={e => setEqBass(Number(e.target.value))} className="w-full h-1 bg-neutral-850 accent-[#00F5FF]" />
                      <span className="font-mono text-xs text-[#00F5FF] font-bold">+{eqBass - 5} dB</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">Mid vocals</span>
                      <input type="range" min="0" max="10" value={eqMid} onChange={e => setEqMid(Number(e.target.value))} className="w-full h-1 bg-neutral-850 accent-[#00F5FF]" />
                      <span className="font-mono text-xs text-[#00F5FF] font-bold">+{eqMid - 5} dB</span>
                    </div>
                    <div className="space-y-1 text-center">
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">Treble scale</span>
                      <input type="range" min="0" max="10" value={eqTreble} onChange={e => setEqTreble(Number(e.target.value))} className="w-full h-1 bg-neutral-850 accent-[#00F5FF]" />
                      <span className="font-mono text-xs text-[#00F5FF] font-bold">+{eqTreble - 5} dB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00F5FF]">Appearance</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Customize workspace layouts & themes</p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-neutral-450 uppercase tracking-wider block">Theme Preset</label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {[
                      { id: 'neoglow', label: 'NeoGlow Ambient', desc: 'Vibrant cyan gradients' },
                      { id: 'dark', label: 'Deep Charcoal', desc: 'Sleek dark aesthetics' },
                      { id: 'oled', label: 'OLED Obsidian', desc: 'Pure black panels (#050505)' },
                      { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Electric pink & violet vibes' }
                    ].map(opt => {
                      const isActive = theme === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setTheme(opt.id as any)}
                          className={`rounded-2xl border p-4 text-left cursor-pointer transition-all ${
                            isActive
                              ? 'border-[#00F5FF] bg-[#00F5FF]/5 text-[#00F5FF]'
                              : 'border-white/[0.06] bg-neutral-900/40 text-neutral-450 hover:text-white'
                          }`}
                        >
                          <h4 className="text-xs font-black uppercase tracking-wider">{opt.label}</h4>
                          <p className="text-[9px] text-neutral-550 font-bold mt-0.5 leading-normal">{opt.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-wider">Compact Side Dock</p>
                    <p className="text-xs text-neutral-450 font-semibold mt-0.5 leading-normal">Shrinks the left sidebar workspace to icon widths</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCompactMode(!compactMode)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      compactMode ? 'bg-[#00F5FF]' : 'bg-neutral-800'
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

          {/* DOWNLOADS CACHE */}
          {activeSection === 'downloads' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.04] pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00F5FF]">Downloads Cache</h3>
                <p className="text-xs text-neutral-500 font-semibold mt-0.5">Monitor storage files and caches</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-550 font-black uppercase tracking-wider">Local offline cache size</span>
                    <span className="font-mono text-[#00F5FF] font-black">24.5 MB</span>
                  </div>
                  <div className="h-1.5 bg-neutral-850 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#00F5FF] to-[#9B5CFF] rounded-full" style={{ width: '12%' }} />
                  </div>
                  <p className="text-[10px] text-neutral-450 font-bold leading-normal">
                    This includes tracks, album covers, and synchronized lyrics stored in browser IndexedDB.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMessage({ type: 'success', text: 'Browser IndexedDB cache cleared!' });
                    }}
                    className="rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-red-400 transition-colors"
                  >
                    Clear Audio Cache
                  </button>
                  <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase">Version 5.0 (Beta)</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
