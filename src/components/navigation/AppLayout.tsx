'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';
import { 
  Home, 
  Search, 
  Library, 
  User, 
  Settings, 
  LogOut, 
  Music, 
  Plus, 
  Heart, 
  Sliders, 
  ChevronRight, 
  Flame, 
  Sparkles,
  Layers,
  Laptop,
  Trophy,
  Radio,
  Compass,
  Cpu,
  Activity,
  Mic,
  History,
  Download,
  Cloud,
  Users,
  Calendar,
  Bell,
  Terminal,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import NeoTuneLogo from './NeoTuneLogo';
import { useLayoutStore } from '@/store/layout-store';
import RightContextPanel from './RightContextPanel';
import { getCampaignState } from '@/lib/campaignManager';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: string;
}

interface NavSection {
  category: string;
  items: NavItem[];
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  const { isRightPanelOpen, toggleRightPanel } = useLayoutStore();
  
  const [userProfile, setUserProfile] = useState<{ displayName: string; avatarUrl: string } | null>(null);
  const [campaignActive, setCampaignActive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setUserProfile({
            displayName: data.display_name || user.email?.split('@')[0] || 'User',
            avatarUrl: data.avatar_url || '',
          });
        }
      }
    };
    fetchProfile();
    setCampaignActive(getCampaignState().isActive);
  }, []);

  const navSections: NavSection[] = [
    {
      category: 'Discover',
      items: [
        { label: 'Home Feed', href: '/home', icon: Home },
        { label: 'AI Search OS', href: '/search', icon: Search, badge: 'AI' },
        { label: 'Live Radio', href: '/home#explore', icon: Radio, badge: 'LIVE' },
        { label: 'Podcasts', href: '/home#explore', icon: Mic }
      ]
    },
    {
      category: 'Library',
      items: [
        { label: 'Your Locker', href: '/library', icon: Library },
        { label: 'Liked Tracks', href: '/liked', icon: Heart },
        { label: 'Recently Played', href: '/home', icon: History },
        { label: 'Downloads', href: '/settings', icon: Download }
      ]
    },
    {
      category: 'AI Space',
      items: [
        { label: 'Music DNA', href: '/profile', icon: User },
        { label: 'AI Status', href: '/home', icon: Sparkles }
      ]
    },
    {
      category: 'System',
      items: [
        { label: 'Preferences', href: '/settings', icon: Settings },
        { label: 'Labs', href: '/settings', icon: Terminal, badge: 'Dev' }
      ]
    }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const handleCreatePlaylist = async () => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My New Playlist', description: 'Custom playlist created on NeoTune' }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/playlists/${data.playlist.id}`);
      }
    } catch (err) {
      console.error('Failed to create playlist:', err);
    }
  };

  if (pathname === '/auth' || pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#07090D] text-white font-sans antialiased overflow-hidden">
      
      {/* Immersive background ambient glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#00F5FF]/5 to-[#7B61FF]/5 blur-[120px] pointer-events-none -z-10 animate-ambient-glow" />

      {/* 1. Desktop Collapsible Control Dock */}
      <motion.aside 
        animate={{ width: isCollapsed ? 84 : 264 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="hidden md:flex flex-col justify-between flex-shrink-0 m-4 rounded-[24px] border border-white/[0.06] bg-[#0E111A]/60 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] relative overflow-hidden p-4 z-30"
      >
        <div className="space-y-6 flex flex-col h-full overflow-y-auto scrollbar-hide">
          
          {/* Logo & Expand Toggle */}
          <div className="flex items-center justify-between px-1">
            <Link href="/home" className="block min-w-0">
              <NeoTuneLogo className="h-8.5 w-8.5" showText={!isCollapsed} />
            </Link>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors duration-200"
            >
              <ChevronRight className={`h-4 w-4 transform transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* AI User Card */}
          <div className={`p-3 rounded-2xl border border-white/[0.04] bg-[#07090D]/50 backdrop-blur-md flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center p-2' : ''}`}>
            
            {/* Spinning Avatar Status Ring */}
            <div className="relative h-11 w-11 flex items-center justify-center flex-shrink-0">
              <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-tr from-[#00F5FF] via-[#7B61FF] to-[#9B5CFF] animate-spin [animation-duration:8s]" />
              <div className="relative h-10 w-10 rounded-full bg-neutral-950 p-[1px] overflow-hidden z-10 flex items-center justify-center">
                {userProfile?.avatarUrl ? (
                  <Image src={userProfile.avatarUrl} alt="Avatar" fill className="object-cover rounded-full" />
                ) : (
                  <span className="font-black bg-gradient-to-br from-[#00F5FF] to-[#7B61FF] bg-clip-text text-transparent text-xs uppercase">
                    {userProfile?.displayName.slice(0, 2).toUpperCase() || 'SD'}
                  </span>
                )}
              </div>
            </div>

            {!isCollapsed && (
              <div className="min-w-0 text-left">
                <p className="font-black text-sm text-white truncate leading-tight">{userProfile?.displayName || 'Saswata Dey'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-500 uppercase tracking-wider">
                    <Flame className="h-3 w-3 fill-amber-500" /> 12 Streak
                  </span>
                  <span className="text-[9px] text-neutral-500 font-bold">LVL 32</span>
                </div>
              </div>
            )}
          </div>

          {/* Grouped Folder Navigation */}
          <nav className="space-y-5 flex-1">
            {navSections.map((sec) => (
              <div key={sec.category} className="space-y-1">
                {!isCollapsed && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 pl-3 block text-left">
                    {sec.category}
                  </span>
                )}
                <div className="space-y-1">
                  {sec.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                          isActive ? 'text-white' : 'text-neutral-450 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-indicator"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00F5FF]/15 via-[#7B61FF]/10 to-[#9B5CFF]/5 border-l-2 border-l-[#00F5FF] border border-white/[0.04] shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                          />
                        )}
                        <div className="flex items-center space-x-3 relative z-10">
                          <Icon className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-[#00F5FF] drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]' : 'text-neutral-500 group-hover:text-white'}`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!isCollapsed && item.badge && (
                          <span className={`relative z-10 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                            item.badge === 'LIVE' 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                              : 'bg-white/[0.04] border border-white/[0.08] text-neutral-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {campaignActive && (
              <div className="space-y-1 pt-1">
                {!isCollapsed && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 pl-3 block text-left">
                    Campaign
                  </span>
                )}
                <Link
                  href="/worldcup"
                  className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    pathname === '/worldcup' ? 'text-white' : 'text-neutral-450 hover:text-white'
                  }`}
                >
                  {pathname === '/worldcup' && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF2D55]/15 to-[#9B5CFF]/5 border-l-2 border-l-[#FF2D55] border border-white/[0.04] shadow-[0_0_20px_rgba(255,45,85,0.2)]"
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                    />
                  )}
                  <div className="flex items-center space-x-3 relative z-10">
                    <Trophy className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-105 ${pathname === '/worldcup' ? 'text-[#FF2D55] drop-shadow-[0_0_8px_rgba(255,45,85,0.4)]' : 'text-neutral-500 group-hover:text-white'}`} />
                    {!isCollapsed && <span className="truncate">Match Center</span>}
                  </div>
                  {!isCollapsed && (
                    <span className="relative z-10 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-450 border border-rose-500/30">
                      LIVE
                    </span>
                  )}
                </Link>
              </div>
            )}
          </nav>

          {/* Music DNA Radial Widget & Quick Actions */}
          <div className="space-y-4 pt-4 border-t border-white/[0.04]">
            
            {/* Radial progress card */}
            <div className={`transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}>
              <DNAProgressCircle percentage={78} isCollapsed={isCollapsed} />
            </div>

            {/* Floating glass card for playlist creation */}
            <button
              onClick={handleCreatePlaylist}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#00F5FF] via-[#3B82F6] to-[#7B61FF] hover:opacity-90 px-4 py-3 text-xs font-black uppercase text-black shadow-lg shadow-cyan-500/10 active:scale-95 transition-all`}
            >
              <Plus className="h-4.5 w-4.5 stroke-[3px]" />
              {!isCollapsed && <span className="truncate">Create Playlist</span>}
            </button>
          </div>
        </div>

        {/* User logout section */}
        <div className="space-y-3 pt-4 border-t border-white/[0.04] mt-auto">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-black uppercase text-neutral-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all duration-200"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* 2. Main Content Viewport */}
      <main className="flex-1 flex min-w-0 flex-col overflow-y-auto pb-40 md:pb-28 relative bg-[#07090D]">
        
        {/* Top-Right Toggle Bar */}
        <div className="absolute top-4 right-4 z-20 hidden md:block">
          <button
            onClick={() => toggleRightPanel()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all backdrop-blur-md ${
              isRightPanelOpen 
                ? 'bg-[#00F5FF]/10 border-[#00F5FF]/30 text-[#00F5FF] shadow-[0_0_15px_rgba(0,245,255,0.15)]' 
                : 'bg-neutral-900/60 border-white/[0.04] text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>FX & Lyrics</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 md:p-8 w-full max-w-none">
          {children}
        </div>
      </main>

      {/* 3. Collapsible Right Side Context Panel (Desktop Only) */}
      <RightContextPanel />

      {/* 4. Mobile Navigation Bottom Bar (Hidden on Desktop) - Floating Island Capsule */}
      <nav className="fixed bottom-5 left-4 right-4 z-40 flex h-16 px-3 justify-around items-center rounded-2xl bg-[#0E111A]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_10px_35px_rgba(0,0,0,0.6)] md:hidden">
        {navSections.flatMap(sec => sec.items).filter(item => 
          ['/home', '/search', '/library', '/profile'].includes(item.href)
        ).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1 relative group"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00F5FF]/10 to-[#9B5CFF]/10 border-t-2 border-t-[#00F5FF] pointer-events-none -z-10 shadow-[0_0_15px_rgba(0,245,255,0.15)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <Icon className={`h-5 w-5 mb-0.5 transition-all duration-300 ${isActive ? 'text-[#00F5FF] scale-110' : 'text-neutral-450 group-hover:text-white'}`} />
              <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                {item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* Helper Radial Component */
const DNAProgressCircle = ({ percentage = 78, isCollapsed = false }: { percentage?: number; isCollapsed: boolean }) => {
  const radius = 14;
  const stroke = 2.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  if (isCollapsed) {
    return (
      <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <svg className="w-8 h-8 transform -rotate-90">
          <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.03)" strokeWidth="2.5" fill="transparent" />
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke="url(#dna-grad-collapsed)"
            strokeWidth="2.5"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 12}
            strokeDashoffset={2 * Math.PI * 12 * (1 - percentage / 100)}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="dna-grad-collapsed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F5FF" />
              <stop offset="100%" stopColor="#7B61FF" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute text-[8px] font-black text-white">{percentage}%</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[#0A0D14]/40 backdrop-blur-md p-3.5 space-y-3 relative group hover:border-[#00F5FF]/30 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
      <div className="flex justify-between items-center text-[10px] font-black text-neutral-500 uppercase tracking-widest">
        <span>Music DNA</span>
        <span className="flex items-center gap-0.5 text-amber-500 font-extrabold">
          <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500 animate-pulse" /> 12 Streak
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.03)" strokeWidth="3" fill="transparent" />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="url(#dna-grad-sidebar)"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="dna-grad-sidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F5FF" />
                <stop offset="100%" stopColor="#9B5CFF" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-[9px] font-black text-white">{percentage}%</span>
        </div>
        <div className="min-w-0 text-left">
          <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider truncate">Lossless Purist</p>
          <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Level 32 OS</p>
        </div>
      </div>
    </div>
  );
};
