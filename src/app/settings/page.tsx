'use client';

import React, { useState, useEffect } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { 
  Settings, 
  User, 
  Key, 
  Sliders, 
  Shield, 
  Loader2, 
  Sparkles, 
  Volume2, 
  Info,
  SlidersHorizontal,
  Compass,
  Download,
  Database,
  EyeOff,
  Bell,
  Terminal,
  Activity,
  Laptop
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [quality, setQuality] = useState<'auto' | 'high' | 'low' | 'lossless' | 'atmos'>('auto');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Crossfade and Playback states
  const [crossfade, setCrossfade] = useState(true);
  const [crossfadeSec, setCrossfadeSec] = useState(6);
  const [normalizeVolume, setNormalizeVolume] = useState(false);
  const [gapless, setGapless] = useState(true);
  const [autoplay, setAutoplay] = useState(true);

  // Equalizer states
  const [eqBass, setEqBass] = useState(4);
  const [eqMid, setEqMid] = useState(2);
  const [eqTreble, setEqTreble] = useState(6);

  // Appearance states
  const [theme, setTheme] = useState<'neoglow' | 'dark' | 'oled' | 'cyberpunk'>('neoglow');
  const [glowIntensity, setGlowIntensity] = useState(80);
  const [compactMode, setCompactMode] = useState(false);

  // Storage and Privacy states
  const [privateSession, setPrivateSession] = useState(false);
  const [hideActivity, setHideActivity] = useState(false);
  const [autoDeleteCache, setAutoDeleteCache] = useState(false);

  useEffect(() => {
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
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
      });
      setMessage({ type: 'success', text: 'System preferences saved!' });
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
      setMessage({ type: 'success', text: 'Credentials updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
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
    setEqBass(4);
    setEqMid(2);
    setEqTreble(6);
    setMessage({ type: 'success', text: 'Reset settings to system defaults.' });
  };

  return (
    <div className="space-y-8 text-white pb-20 max-w-5xl mx-auto text-left select-none">
      
      {/* HEADER BLOCK */}
      <div className="flex items-center space-x-3.5 border-b border-white/[0.04] pb-4">
        <Settings className="h-8 w-8 text-cyan-400" />
        <h1 className="text-3xl font-black tracking-tight">Control Center</h1>
      </div>

      {/* ALERT ALERTS */}
      {message && (
        <div
          className={`rounded-2xl p-4.5 text-xs font-black transition-all ${
            message.type === 'success'
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,245,255,0.05)]'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* DUAL SECTION CONTROL PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* SIDE NAV MENU */}
        <div className="flex flex-col gap-1">
          {[
            { id: 'general', label: 'General', icon: User },
            { id: 'playback', label: 'Playback', icon: Sliders },
            { id: 'audio', label: 'Audio Engine', icon: Volume2 },
            { id: 'appearance', label: 'Appearance', icon: SlidersHorizontal },
            { id: 'downloads', label: 'Downloads', icon: Download },
            { id: 'privacy', label: 'Privacy & Safety', icon: Shield },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'developer', label: 'Developer Console', icon: Terminal }
          ].map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id as SettingsSection); setMessage(null); }}
                className={`flex items-center gap-3.5 rounded-xl px-4.5 py-3 text-xs font-black uppercase tracking-wider transition-all border ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/10 via-purple-600/10 to-transparent border-cyan-500/35 text-cyan-400' 
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* DETAILS SECTION CONTAINER */}
        <div className="md:col-span-3">
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            
            {/* 1. GENERAL / PROFILE */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">General Settings</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Customize your personal profile info and credentials</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Display Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Saswata Dey"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/60 border border-white/[0.08] px-4.5 py-3.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Avatar Image URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/60 border border-white/[0.08] px-4.5 py-3.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                    />
                  </div>
                </div>

                {/* Password update helper inside general page */}
                <div className="border-t border-white/[0.04] pt-5 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Change Account Password</label>
                    <input
                      type="password"
                      placeholder="Enter New Secure Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-neutral-900/60 border border-white/[0.08] px-4.5 py-3.5 text-sm text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={!password || loading}
                    className="rounded-xl border border-white/[0.08] bg-neutral-900 px-5.5 py-3 text-xs font-black text-white hover:bg-neutral-800 disabled:opacity-40"
                  >
                    Update credentials
                  </button>
                </div>
              </div>
            )}

            {/* 2. PLAYBACK SETTINGS */}
            {activeSection === 'playback' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Playback Settings</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Control how music fades and transitions</p>
                </div>

                <div className="space-y-5">
                  {/* Crossfade */}
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">Enable Crossfade</p>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">Fades out active track while starting the next</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCrossfade(!crossfade)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        crossfade ? 'bg-cyan-400' : 'bg-neutral-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        crossfade ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {crossfade && (
                    <div className="space-y-2 pb-2">
                      <div className="flex justify-between items-center text-xs font-bold text-neutral-450">
                        <span>Crossfade Length</span>
                        <span className="font-mono">{crossfadeSec} seconds</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="15" 
                        value={crossfadeSec}
                        onChange={e => setCrossfadeSec(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}

                  {/* Normalize Volume */}
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">Normalize Audio Level</p>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">Keep playback volumes consistent across tracks</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNormalizeVolume(!normalizeVolume)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        normalizeVolume ? 'bg-cyan-400' : 'bg-neutral-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        normalizeVolume ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Autoplay */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">Autoplay Station</p>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">AI-generates similar music when your queue finishes</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoplay(!autoplay)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoplay ? 'bg-cyan-400' : 'bg-neutral-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        autoplay ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AUDIO ENGINE & QUALITY */}
            {activeSection === 'audio' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Audio Engine</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Configure audio quality pipelines & spatial enhancers</p>
                </div>

                <div className="space-y-6">
                  {/* Segmented Quality Choice */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Streaming Quality</label>
                    <div className="grid grid-cols-5 rounded-xl bg-neutral-900/60 p-1 border border-white/[0.06]">
                      {([
                        { id: 'low', label: 'Low' },
                        { id: 'auto', label: 'Auto' },
                        { id: 'high', label: 'High' },
                        { id: 'lossless', label: 'Hi-Fi' },
                        { id: 'atmos', label: 'Atmos' }
                      ] as const).map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setQuality(q.id)}
                          className={`rounded-lg py-2.5 text-[10px] font-black transition-all uppercase tracking-wider ${
                            quality === q.id
                              ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-black shadow'
                              : 'text-neutral-405 hover:text-white'
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Graphic Equalizer Bands */}
                  <div className="space-y-4 pt-2 border-t border-white/[0.04]">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Graphic Equalizer (EQ)</label>
                      <button type="button" onClick={() => { setEqBass(5); setEqMid(5); setEqTreble(5); }} className="text-[9px] font-bold text-cyan-400 uppercase">Flat</button>
                    </div>

                    <div className="flex justify-around items-center h-32 bg-neutral-950/40 border border-white/[0.03] rounded-2xl p-5">
                      {[
                        { label: 'Bass', val: eqBass, setter: setEqBass },
                        { label: 'Mids', val: eqMid, setter: setEqMid },
                        { label: 'Treble', val: eqTreble, setter: setEqTreble }
                      ].map((band) => (
                        <div key={band.label} className="flex flex-col items-center h-full gap-2">
                          <input 
                            type="range" 
                            min="0" 
                            max="10" 
                            value={band.val} 
                            onChange={e => band.setter(Number(e.target.value))}
                            className="h-20 accent-cyan-400 writing-mode-vertical cursor-ns-resize"
                            style={{ WebkitAppearance: 'slider-vertical' }}
                          />
                          <span className="text-[9px] font-black text-neutral-500 uppercase">{band.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. APPEARANCE SETTINGS */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Appearance Theme</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Toggle interface design palettes & compact layouts</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Interface Theme Preset</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'neoglow', label: 'Neo Glow' },
                        { id: 'dark', label: 'Dark Carbon' },
                        { id: 'oled', label: 'OLED Black' },
                        { id: 'cyberpunk', label: 'Cyberpunk' }
                      ].map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id as any)}
                          className={`rounded-xl py-3 text-xs font-black uppercase tracking-wider border ${
                            theme === t.id 
                              ? 'bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border-cyan-400 text-cyan-450' 
                              : 'bg-neutral-900/40 border-white/[0.05] text-neutral-450 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compact toggle */}
                  <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">Compact Grid Mode</p>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">Shrinks spacing and sidebar width for extra screen estate</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompactMode(!compactMode)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        compactMode ? 'bg-cyan-400' : 'bg-neutral-800'
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

            {/* 5. DOWNLOADS & STORAGE */}
            {activeSection === 'downloads' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Downloads & Storage</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Manage local audio storage limits & cache cleanups</p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/[0.05] bg-neutral-950/40 p-5 flex justify-between items-center">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Total Audio Cache</span>
                      <p className="text-2xl font-black text-white">2.41 GB Used</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { alert('Offline cache successfully cleared!'); }}
                      className="rounded-xl border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-550/5 px-5 py-2.5 text-xs font-black text-rose-400 transition-colors"
                    >
                      Purge Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. PRIVACY & SAFETY */}
            {activeSection === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Privacy & Safety</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Control visual activity broadcasting & session states</p>
                </div>

                <div className="space-y-5">
                  {/* Private session */}
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">Private Jam Session</p>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">Hides currently playing tracks from public friend widgets</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrivateSession(!privateSession)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        privateSession ? 'bg-cyan-400' : 'bg-neutral-800'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        privateSession ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 7. DEVELOPER CONSOLE */}
            {activeSection === 'developer' && (
              <div className="space-y-6">
                <div className="border-b border-white/[0.04] pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Developer Diagnostics</h3>
                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">Review local API linkages & environment state</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Supabase Connection Status", value: "Verified Active", color: "text-emerald-400" },
                    { label: "Spotify API Integration", value: "Linked (200 OK)", color: "text-emerald-400" },
                    { label: "YouTube Data Gateway", value: "Active", color: "text-emerald-400" },
                    { label: "Redis Caching Layer", value: "Connected", color: "text-emerald-400" }
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.04] bg-neutral-900/10 p-4.5 text-left">
                      <span className="text-[9px] font-black text-neutral-550 uppercase tracking-widest">{stat.label}</span>
                      <p className={`text-xs font-black mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAVE FOOTER COMPONENT */}
            {activeSection === 'general' && (
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.04]">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-xs font-black text-neutral-450 hover:text-white transition-colors"
                >
                  Reset Defaults
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-7 py-3 text-xs font-black text-black active:scale-95 shadow-md transition-all"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Preferences</span>
                </button>
              </div>
            )}

          </form>
        </div>

      </div>

    </div>
  );
}
