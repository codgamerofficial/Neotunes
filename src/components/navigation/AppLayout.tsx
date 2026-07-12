'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Home, Search, Library, User, Settings, LogOut, Music, Plus, Heart, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientBrowser();
  
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
        body: JSON.stringify({ name: 'My New Playlist', description: 'Custom playlist created on NeoTunes' }),
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
    <div className="flex min-h-screen bg-black text-white">
      {/* 1. Desktop Sidebar (Hidden on Mobile) */}
      <aside className="liquid-shell hidden w-64 flex-shrink-0 p-6 pb-28 md:flex md:flex-col md:justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <Link href="/home" className="flex items-center space-x-3 text-emerald-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-black shadow-md shadow-emerald-500/20">
              <Music className="h-5 w-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">NeoTunes</span>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`liquid-interactive group relative flex items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 rounded-lg bg-emerald-500/10 border-l-[3px] border-emerald-500"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-105 ${isActive ? 'text-emerald-400' : 'text-neutral-400 group-hover:text-white'}`} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions Shortcuts */}
          <div className="space-y-4 pt-6 border-t border-neutral-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Shortcuts</span>
            <button
              onClick={handleCreatePlaylist}
              className="liquid-interactive flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-800 text-white">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <span>Create Playlist</span>
            </button>
            <Link
              href="/liked"
              className="liquid-interactive flex w-full items-center space-x-3 rounded-lg px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <Heart className="h-3 w-3 fill-white" />
              </div>
              <span>Liked Songs</span>
            </Link>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 pt-6 border-t border-neutral-900">
          <div className="flex items-center space-x-3 px-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-neutral-800 border border-neutral-700">
              {userProfile?.avatarUrl ? (
                <Image src={userProfile.avatarUrl} alt="Avatar" fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-emerald-400 text-xs">
                  {userProfile?.displayName.slice(0, 2).toUpperCase() || 'NT'}
                </div>
              )}
            </div>
            <div className="truncate text-left text-xs">
              <p className="font-semibold text-white truncate">{userProfile?.displayName}</p>
              <p className="text-neutral-500 truncate">Premium Member</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="liquid-interactive flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content viewport */}
      <main className="flex-1 flex min-w-0 flex-col overflow-y-auto pb-40 md:pb-28">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* 3. Mobile Navigation Bottom Bar (Hidden on Desktop) */}
      <nav className="liquid-dock fixed bottom-0 left-0 right-0 z-40 flex h-16 px-2 py-1 md:hidden justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-bold transition-colors ${
                isActive ? 'text-emerald-400' : 'text-neutral-400'
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
