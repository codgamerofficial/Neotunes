'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Home, Search, Library, User, Settings, LogOut, Music, Plus, Heart, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import NeoTuneLogo from './NeoTuneLogo';
import { useLayoutStore } from '@/store/layout-store';
import RightContextPanel from './RightContextPanel';


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

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Sync trigger should have populated profiles
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
  }, []);

  const navItems: NavigationItem[] = [
    { label: 'Home', href: '/home', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Your Library', href: '/library', icon: Library },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Settings', href: '/settings', icon: Settings },
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

  // Skip rendering sidebar layout inside /auth or root landing page
  if (pathname === '/auth' || pathname === '/') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-white">
      {/* 1. Desktop Sidebar (Hidden on Mobile) */}
      <aside className="liquid-shell hidden w-64 flex-shrink-0 p-6 pb-28 md:flex md:flex-col md:justify-between border-r border-neutral-900">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/home" className="block">
            <NeoTuneLogo className="h-9 w-9" showText={true} />
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`liquid-interactive group relative flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-purple-500/5 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,245,255,0.08)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-105 ${isActive ? 'text-cyan-400' : 'text-neutral-400 group-hover:text-white'}`} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions Shortcuts */}
          <div className="space-y-4 pt-6 border-t border-neutral-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block text-left">Shortcuts</span>
            
            {/* Create Playlist Button - Filled Accent Gradient Pill */}
            <button
              onClick={handleCreatePlaylist}
              className="liquid-interactive flex w-full items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-350 hover:to-purple-450 px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-cyan-500/10 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Create Playlist</span>
            </button>
            
            {/* Liked Songs Shortcut - Heart Icon, Glowing outline, Mini gradient badge */}
            <Link
              href="/liked"
              className="liquid-interactive flex w-full items-center justify-between rounded-lg border border-cyan-500/25 bg-cyan-950/10 px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white transition-all shadow-[0_0_12px_rgba(0,245,255,0.03)] hover:shadow-[0_0_16px_rgba(0,245,255,0.08)]"
            >
              <div className="flex items-center space-x-3">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                  <Heart className="h-3 w-3 fill-white" />
                </div>
                <span>Liked Songs</span>
              </div>
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2 py-0.5 text-[8px] font-extrabold text-white uppercase tracking-wider shadow-sm">
                Fav
              </span>
            </Link>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-5 pt-6 border-t border-neutral-900">
          <div className="flex items-center space-x-3 px-2">
            {/* User Avatar with Glowing Ring */}
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/40 p-[1.5px] shadow-[0_0_15px_rgba(0,245,255,0.15)] flex-shrink-0">
              <div className="h-full w-full rounded-full bg-neutral-950 flex items-center justify-center relative overflow-hidden">
                {userProfile?.avatarUrl ? (
                  <Image src={userProfile.avatarUrl} alt="Avatar" fill className="object-cover rounded-full" />
                ) : (
                  <span className="font-extrabold bg-gradient-to-br from-cyan-400 to-purple-400 bg-clip-text text-transparent text-xs">
                    {userProfile?.displayName.slice(0, 2).toUpperCase() || 'SD'}
                  </span>
                )}
              </div>
            </div>
            <div className="truncate text-left text-xs">
              <p className="font-bold text-white truncate">{userProfile?.displayName || 'Saswata Dey'}</p>
              <p className="font-semibold text-[9px] tracking-wide uppercase bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Premium Member</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="liquid-interactive flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-xs font-bold text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content viewport */}
      <main className="flex-1 flex min-w-0 flex-col overflow-y-auto pb-40 md:pb-28 relative">
        {/* Top-Right Toggle Bar */}
        <div className="absolute top-4 right-4 z-20 hidden md:block">
          <button
            onClick={() => toggleRightPanel()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all backdrop-blur-md ${
              isRightPanelOpen 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
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
      <nav className="liquid-dock fixed bottom-0 left-0 right-0 z-40 flex h-16 px-2 py-1 md:hidden justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
                isActive ? 'text-cyan-400' : 'text-neutral-400'
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
