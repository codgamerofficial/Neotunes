'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Library as LibraryIcon, 
  LayoutGrid, 
  List, 
  Heart, 
  Download, 
  Clock, 
  History as HistoryIcon,
  Plus, 
  Search, 
  ListMusic, 
  X, 
  Play,
  Disc3,
  User
} from 'lucide-react';

import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { Artwork } from '@/components/ui/Artwork';
import { NeoCard } from '@/components/ui/NeoCard';
import { NeoButton } from '@/components/ui/NeoButton';
import { NeoEmptyState } from '@/components/ui/NeoEmptyState';
import { NeoSkeleton } from '@/components/ui/NeoSkeleton';
import { NeoTabs, TabItem } from '@/components/ui/NeoTabs';
import { useToast } from '@/components/ui/NeoToast';
import { usePlaybackStore } from '@/store/playback-store';
import { resolveArtwork } from '@/utils/artwork';

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { history, playTrack } = usePlaybackStore();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'playlists' | 'liked' | 'downloads' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDesc, setPlaylistDesc] = useState('');

  // Fetch Playlists (Server + Local guest storage)
  const { data: playlistsData, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ['user-playlists'],
    queryFn: async () => {
      let serverPlaylists: any[] = [];
      try {
        const res = await fetch('/api/playlists');
        if (res.ok) {
          const data = await res.json();
          serverPlaylists = data.playlists || [];
        }
      } catch {}

      let localPlaylists: any[] = [];
      try {
        const stored = localStorage.getItem('neotunes_local_playlists');
        if (stored) {
          localPlaylists = JSON.parse(stored);
        }
      } catch {}

      // Deduplicate by ID
      const ids = new Set(serverPlaylists.map((p: any) => p.id));
      const merged = [
        ...serverPlaylists,
        ...localPlaylists.filter((p: any) => !ids.has(p.id))
      ];

      return { playlists: merged };
    },
  });

  // Fetch Liked Songs
  const { data: likedData } = useQuery({
    queryKey: ['liked-songs-count'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/liked');
        if (res.ok) return res.json();
      } catch {}
      return { tracks: [] };
    },
  });

  // Create Playlist Mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) return res.json();
      } catch {}

      // Guest local storage fallback
      const localId = `local_${Date.now()}`;
      const newPlaylist = {
        id: localId,
        name: payload.name,
        description: payload.description,
        tracks: [],
        cover_url: '',
        created_at: new Date().toISOString(),
      };
      let existing: any[] = [];
      try {
        const stored = localStorage.getItem('neotunes_local_playlists');
        if (stored) existing = JSON.parse(stored);
      } catch {}
      localStorage.setItem('neotunes_local_playlists', JSON.stringify([newPlaylist, ...existing]));
      return { playlist: newPlaylist };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-playlists'] });
      setShowCreateModal(false);
      setPlaylistName('');
      setPlaylistDesc('');
      showToast('Playlist created successfully!');
    },
    onError: () => {
      showToast('Failed to create playlist', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistName.trim()) return;
    createPlaylistMutation.mutate({
      name: playlistName.trim(),
      description: playlistDesc.trim(),
    });
  };

  const playlists = playlistsData?.playlists || [];
  const likedCount = likedData?.tracks?.length || 0;

  const filteredPlaylists = playlists.filter((p: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const totalLibraryCount = playlists.length + (likedCount > 0 ? 1 : 0);

  const libraryTabs: TabItem<'all' | 'playlists' | 'liked' | 'downloads' | 'history'>[] = [
    { id: 'all', label: 'All', count: totalLibraryCount },
    { id: 'playlists', label: 'Playlists', count: playlists.length },
    { id: 'liked', label: 'Liked', count: likedCount },
    { id: 'downloads', label: 'Downloads' },
    { id: 'history', label: 'History', count: history.length },
  ];

  return (
    <FeatureErrorBoundary featureName="Library">
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto min-h-screen text-[#F5F7FA] font-sans select-none pb-44 md:pb-28">
        
        {/* ── 1. HEADER & ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <LibraryIcon className="h-6 w-6 text-[#DFFF00]" /> Your Library
            </h1>
            <p className="text-xs sm:text-sm text-[#9AA1AD] font-medium">
              Manage your saved tracks, custom playlists, and listening history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NeoButton
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 fill-black" /> Create Playlist
            </NeoButton>
          </div>
        </div>

        {/* ── 2. FILTER TABS & VIEW TOGGLE ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <NeoTabs
            tabs={libraryTabs}
            activeTab={activeTab}
            onChange={(tab) => {
              if (tab === 'liked') router.push('/liked');
              else if (tab === 'downloads') router.push('/downloads');
              else if (tab === 'history') router.push('/history');
              else setActiveTab(tab);
            }}
            variant="segmented"
          />

          <div className="flex items-center gap-2">
            {/* Search filter within library */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9AA1AD]" />
              <input
                type="text"
                placeholder="Filter library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#11141A] border border-white/10 text-xs text-white placeholder-[#9AA1AD] outline-none focus:border-[#DFFF00]"
              />
            </div>

            {/* Grid / List Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-[#11141A] border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white/10 text-[#DFFF00]' : 'text-[#9AA1AD] hover:text-white'
                }`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-white/10 text-[#DFFF00]' : 'text-[#9AA1AD] hover:text-white'
                }`}
                title="List view"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. PINNED QUICK ACCESS CARDS (Liked, Downloads, History) ── */}
        {activeTab === 'all' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Liked Songs Pinned Card */}
            <NeoCard
              interactive
              onClick={() => router.push('/liked')}
              className="p-5 flex items-center gap-4 bg-gradient-to-br from-[#171A21] to-[#11141A] border-[#DFFF00]/20 hover:border-[#DFFF00]/50"
            >
              <div className="p-3.5 rounded-2xl bg-[#DFFF00]/15 text-[#DFFF00] border border-[#DFFF00]/30 shadow-sm shrink-0">
                <Heart className="h-6 w-6 fill-[#DFFF00]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Liked Songs
                </h3>
                <p className="text-xs text-[#9AA1AD] mt-0.5 font-medium">
                  {likedCount} saved tracks
                </p>
              </div>
            </NeoCard>

            {/* Downloads Pinned Card */}
            <NeoCard
              interactive
              onClick={() => router.push('/downloads')}
              className="p-5 flex items-center gap-4 bg-gradient-to-br from-[#171A21] to-[#11141A] border-[#00E5FF]/20 hover:border-[#00E5FF]/50"
            >
              <div className="p-3.5 rounded-2xl bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 shadow-sm shrink-0">
                <Download className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Downloads
                </h3>
                <p className="text-xs text-[#9AA1AD] mt-0.5 font-medium">
                  Offline cached audio
                </p>
              </div>
            </NeoCard>

            {/* History Pinned Card */}
            <NeoCard
              interactive
              onClick={() => router.push('/history')}
              className="p-5 flex items-center gap-4 bg-gradient-to-br from-[#171A21] to-[#11141A] border-white/10 hover:border-white/25"
            >
              <div className="p-3.5 rounded-2xl bg-white/5 text-[#F5F7FA] border border-white/10 shadow-sm shrink-0">
                <HistoryIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  Listening History
                </h3>
                <p className="text-xs text-[#9AA1AD] mt-0.5 font-medium">
                  {history.length} played tracks
                </p>
              </div>
            </NeoCard>

          </div>
        ) : null}

        {/* ── 4. PLAYLISTS CONTENT ── */}
        {activeTab === 'all' || activeTab === 'playlists' ? (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#9AA1AD]">
              Playlists ({filteredPlaylists.length})
            </h3>

            {isLoadingPlaylists ? (
              <NeoSkeleton variant="card" count={4} />
            ) : filteredPlaylists.length === 0 ? (
              <NeoEmptyState
                icon={ListMusic}
                title="No playlists found"
                description={
                  searchQuery
                    ? `No playlists match "${searchQuery}".`
                    : "You haven't created any playlists yet. Start building your personalized collections."
                }
                actionText="Create Playlist"
                onAction={() => setShowCreateModal(true)}
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredPlaylists.map((pl: any) => (
                  <NeoCard
                    key={pl.id}
                    interactive
                    onClick={() => router.push(`/playlists/${pl.id}`)}
                    className="p-3.5 space-y-3 group"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#171A21] border border-white/10">
                      <Artwork
                        source={pl.cover_url || pl.coverUrl || pl.artworkUrl}
                        size="medium"
                        canonicalId={pl.id}
                        type="playlist"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute right-2.5 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                        <div className="h-10 w-10 rounded-full bg-[#DFFF00] text-black flex items-center justify-center shadow-xl">
                          <Play className="h-4 w-4 fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-[#DFFF00] transition-colors">
                        {pl.name}
                      </h4>
                      <p className="text-[11px] text-[#9AA1AD] truncate">
                        {pl.description || `Playlist • ${pl.tracks?.length || 0} tracks`}
                      </p>
                    </div>
                  </NeoCard>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredPlaylists.map((pl: any) => (
                  <div
                    key={pl.id}
                    onClick={() => router.push(`/playlists/${pl.id}`)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#11141A] border border-white/5 hover:border-white/15 hover:bg-[#171A21] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <Artwork
                        source={pl.cover_url || pl.coverUrl || pl.artworkUrl}
                        size="small"
                        canonicalId={pl.id}
                        type="playlist"
                        className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#DFFF00] truncate transition-colors">
                          {pl.name}
                        </h4>
                        <p className="text-[11px] text-[#9AA1AD] truncate mt-0.5">
                          {pl.description || `Playlist • ${pl.tracks?.length || 0} tracks`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="p-2.5 rounded-full bg-[#DFFF00] text-black opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-3.5 w-3.5 fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── 5. CREATE PLAYLIST MODAL ── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
            <div className="w-full max-w-md p-6 rounded-3xl bg-[#11141A] border border-white/10 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-[#DFFF00]" /> New Playlist
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-[#9AA1AD] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA1AD]">
                    Playlist Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Late Night Acoustic"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-[#9AA1AD] outline-none focus:border-[#DFFF00]"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#9AA1AD]">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Give your playlist a mood or theme..."
                    value={playlistDesc}
                    onChange={(e) => setPlaylistDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-[#9AA1AD] outline-none focus:border-[#DFFF00] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <NeoButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </NeoButton>
                  <NeoButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={createPlaylistMutation.isPending || !playlistName.trim()}
                    isLoading={createPlaylistMutation.isPending}
                  >
                    Create
                  </NeoButton>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </FeatureErrorBoundary>
  );
}
