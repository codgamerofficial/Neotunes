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
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import NeoTuneLogo from './NeoTuneLogo';
import { useLayoutStore } from '@/store/layout-store';
import RightContextPanel from './RightContextPanel';
import { getCampaignState } from '@/lib/campaignManager';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  const { isRightPanelOpen, toggleRightPanel } = useLayoutStore();
  
  const [userProfile, setUserProfile] = useState<{ displayName: string; avatarUrl: string } | null>(null);
  const [campaignActive, setCampaignActive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<'default' | 'coding' | 'relax'>('default');

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

  const navItems: NavigationItem[] = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Your Locker', href: '/library', icon: Library },
    { label: 'Music DNA', href: '/profile', icon: User },
    { label: 'Preferences', href: '/settings', icon: Settings },
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
    <div className="flex min-h-screen bg-[#050505] text-white">
      {/* 1. Desktop Resizable/Collapsible Sidebar */}
      <motion.aside 
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', stiffness: 350, damping: 32 }}
        className="liquid-shell hidden flex-shrink-0 p-5 pb-28 md:flex md:flex-col md:justify-between border-r border-white/[0.04] bg-[#0E0E11]/85 backdrop-blur-xl relative overflow-hidden"
      >
        <div className="space-y-6">
          {/* Logo & Expand Toggle */}
          <div className="flex items-center justify-between">
            <Link href="/home" className="block min-w-0">
              <NeoTuneLogo className="h-8 w-8" showText={!isCollapsed} />
            </Link>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.06] text-neutral-500 hover:text-white transition-colors"
            >
              <ChevronRight className={`h-4 w-4 transform transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center space-x-3 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    isActive ? 'text-[#2DD4FF]' : 'text-neutral-450 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2DD4FF]/10 to-[#9B5CFF]/5 border border-[#2DD4FF]/25 shadow-[0_0_15px_rgba(45,212,255,0.06)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-105 z-10 ${isActive ? 'text-[#2DD4FF] drop-shadow-[0_0_8px_rgba(45,212,255,0.3)]' : 'text-neutral-500 group-hover:text-white'}`} />
                  {!isCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
                </Link>
              );
            })}

            {campaignActive && (
              <Link
                href="/worldcup"
                className={`group relative flex items-center space-x-3 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  pathname === '/worldcup' ? 'text-white' : 'text-neutral-450 hover:text-white'
                }`}
              >
                {pathname === '/worldcup' && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF2D55]/15 to-[#9B5CFF]/5 border border-[#FF2D55]/30 shadow-[0_0_15px_rgba(255,45,85,0.06)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="h-5 w-5 flex-shrink-0 flex items-center justify-center text-sm transition-transform group-hover:scale-110 z-10">⚽</span>
                {!isCollapsed && (
                  <span className="relative z-10 font-bold bg-gradient-to-r from-[#FF2D55] to-[#9B5CFF] bg-clip-text text-transparent truncate">
                    Match Center
                  </span>
                )}
              </Link>
            )}
          </nav>

          {/* Quick Actions & Workspace Mode */}
          <div className="space-y-4 pt-5 border-t border-white/[0.04]">
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block text-left">Quick Actions</span>}
            
            <button
              onClick={handleCreatePlaylist}
              className={`flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] hover:opacity-90 px-4 py-3 text-xs font-black uppercase text-black shadow-lg shadow-[#2DD4FF]/10 active:scale-95 transition-all`}
            >
              <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
              {!isCollapsed && <span className="truncate">Create Playlist</span>}
            </button>

            {/* Listening DNA Streak Details */}
            {!isCollapsed && (
              <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-3 text-left space-y-2 relative group hover:border-[#2DD4FF]/25 transition-colors">
                <div className="flex justify-between items-center text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                  <span>Listening DNA</span>
                  <span className="flex items-center gap-1 text-amber-500"><Flame className="h-3.5 w-3.5 fill-amber-500" /> 7 Day Streak</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-semibold leading-relaxed">
                  Active Profile: <span className="text-[#2DD4FF] font-black">Lossless Coder</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 pt-5 border-t border-white/[0.04]">
          <div className="flex items-center space-x-3 px-1.5">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-[#2DD4FF]/30 to-[#9B5CFF]/30 border border-[#2DD4FF]/40 p-[1.5px] shadow-[0_0_15px_rgba(45,212,255,0.15)] flex-shrink-0">
              <div className="h-full w-full rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
                {userProfile?.avatarUrl ? (
                  <Image src={userProfile.avatarUrl} alt="Avatar" fill className="object-cover rounded-full" />
                ) : (
                  <span className="font-extrabold bg-gradient-to-br from-[#2DD4FF] to-[#9B5CFF] bg-clip-text text-transparent text-xs">
                    {userProfile?.displayName.slice(0, 2).toUpperCase() || 'SD'}
                  </span>
                )}
              </div>
            </div>
            {!isCollapsed && (
              <div className="truncate text-left text-xs min-w-0">
                <p className="font-bold text-white truncate">{userProfile?.displayName || 'Saswata Dey'}</p>
                <p className="font-semibold text-[9px] tracking-widest uppercase bg-gradient-to-r from-[#2DD4FF] to-[#9B5CFF] bg-clip-text text-transparent">Premium OS</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-3 rounded-xl px-4 py-3 text-xs font-black uppercase text-neutral-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* 2. Main Content Viewport */}
      <main className="flex-1 flex min-w-0 flex-col overflow-y-auto pb-40 md:pb-28 relative bg-[#050505]">
        {/* Top-Right Toggle Bar */}
        <div className="absolute top-4 right-4 z-20 hidden md:block">
          <button
            onClick={() => toggleRightPanel()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all backdrop-blur-md ${
              isRightPanelOpen 
                ? 'bg-[#2DD4FF]/10 border-[#2DD4FF]/30 text-[#2DD4FF]' 
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

      {/* 4. Mobile Navigation Bottom Bar (Hidden on Desktop) */}
      <nav className="liquid-dock fixed bottom-0 left-0 right-0 z-40 flex h-16 px-2 py-1 md:hidden justify-around items-center bg-[#0E0E11]/85 backdrop-blur-xl border-t border-white/[0.04]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                isActive ? 'text-[#2DD4FF]' : 'text-neutral-400'
              }`}
            >
              <Icon className="h-5.5 w-5.5 mb-0.5" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
