'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic2,
  ListMusic,
  Sparkles,
  Volume2,
  X,
  Play,
  Trash2,
  History,
  Music,
  Smartphone,
  Headphones,
  Laptop,
  Check,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { Track, getArtistName } from '@/types';
import { usePlaybackStore } from '@/store/playback-store';
import { Artwork } from '@/components/ui/Artwork';
import { resolveArtwork } from '@/utils/artwork';
import { realDeviceManager, RealAudioDevice, DEFAULT_DEVICE } from '@/services/realDeviceService';
import { useToast } from '@/components/ui/NeoToast';

export type ContextPanelTab = 'lyrics' | 'queue' | 'recommendations' | 'devices';

interface PlayerContextPanelProps {
  activeTab: ContextPanelTab;
  onTabChange: (tab: ContextPanelTab) => void;
  onClose: () => void;
  track: Track | null;
  lyrics: { time: number; text: string }[] | null;
  lyricsLoading: boolean;
  currentTime: number;
  onSeek?: (time: number) => void;
  className?: string;
}

export default function PlayerContextPanel({
  activeTab,
  onTabChange,
  onClose,
  track,
  lyrics,
  lyricsLoading,
  currentTime,
  onSeek,
  className = '',
}: PlayerContextPanelProps) {
  const {
    currentTrack,
    queue,
    history,
    playTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
  } = usePlaybackStore();

  const { showToast } = useToast();

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [queueSubTab, setQueueSubTab] = useState<'queue' | 'history'>('queue');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [currentDevice, setCurrentDevice] = useState<RealAudioDevice>(DEFAULT_DEVICE);
  const [availableDevices, setAvailableDevices] = useState<RealAudioDevice[]>([DEFAULT_DEVICE]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    realDeviceManager.getCurrentAudioOutput().then((dev) => {
      if (isMounted) setCurrentDevice(dev);
    });
    realDeviceManager.getAvailableAudioOutputs().then((devs) => {
      if (isMounted) {
        setAvailableDevices(devs);
        setDevicesLoading(false);
      }
    });

    const unsubscribe = realDeviceManager.subscribeToAudioOutputChanges((dev) => {
      if (isMounted) {
        setCurrentDevice(dev);
        realDeviceManager.getAvailableAudioOutputs().then((devs) => {
          if (isMounted) setAvailableDevices(devs);
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const activeLyricIndex = lyrics
    ? lyrics.findIndex((line, idx) => {
        const nextLine = lyrics[idx + 1];
        if (nextLine) {
          return currentTime >= line.time && currentTime < nextLine.time;
        }
        return currentTime >= line.time;
      })
    : -1;

  const activeIdx = activeLyricIndex >= 0 ? activeLyricIndex : 0;

  const handleUserScroll = () => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 2500);
  };

  useEffect(() => {
    if (!isUserScrollingRef.current && activeTab === 'lyrics' && lyrics && activeIdx >= 0 && lineRefs.current[activeIdx]) {
      lineRefs.current[activeIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIdx, lyrics, activeTab]);

  const currentTrackIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
  const nextUpTracks = currentTrackIndex >= 0 ? queue.slice(currentTrackIndex + 1) : queue;

  const getDeviceIcon = (type: RealAudioDevice['type']) => {
    switch (type) {
      case 'bluetooth':
      case 'ble':
        return Volume2;
      case 'wired':
      case 'usb':
        return Headphones;
      case 'internal':
        return Smartphone;
      default:
        return Laptop;
    }
  };

  const CurrentIcon = getDeviceIcon(currentDevice.type);

  const recommendations = React.useMemo(() => {
    if (!track) return [];
    const baseArtist = getArtistName(track.artists || track.artist);
    return [
      {
        id: 'rec-1-' + track.id,
        title: track.title + ' (Live Acoustic)',
        artist: baseArtist,
        album: 'Acoustic Sessions',
        artworkUrl: resolveArtwork(track),
      },
      {
        id: 'rec-2-' + track.id,
        title: 'Midnight Resonance',
        artist: baseArtist,
        album: 'Neo Electronic Vibe',
        artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
      },
      {
        id: 'rec-3-' + track.id,
        title: 'Aurora Horizon',
        artist: 'NeoTunes Curated',
        album: 'Atmospheric Beats',
        artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
      },
    ];
  }, [track]);

  return (
    <aside
      className={'w-[clamp(270px,26vw,420px)] max-w-[380px] shrink-0 h-full max-h-[calc(100dvh-48px)] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/40 backdrop-blur-2xl transition-all duration-300 flex flex-col select-none text-white font-sans ' + className}
      aria-label="Contextual Details Panel"
    >
      {/* 1. Header with Compact Tab Switcher + Close Button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-white/[0.02] shrink-0 gap-2">
        <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-2xl border border-white/8 min-w-0 flex-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onTabChange('lyrics')}
            className={'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ' + (activeTab === 'lyrics' ? 'bg-[#DFFF00] text-black shadow-sm' : 'text-white/65 hover:text-white hover:bg-white/[0.04]')}
            title="Synchronized Lyrics"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span>Lyrics</span>
          </button>

          <button
            onClick={() => onTabChange('queue')}
            className={'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ' + (activeTab === 'queue' ? 'bg-[#DFFF00] text-black shadow-sm' : 'text-white/65 hover:text-white hover:bg-white/[0.04]')}
            title="Playback Queue"
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Queue</span>
            {queue.length > 0 && (
              <span className={'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ' + (activeTab === 'queue' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/80')}>
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('recommendations')}
            className={'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ' + (activeTab === 'recommendations' ? 'bg-[#DFFF00] text-black shadow-sm' : 'text-white/65 hover:text-white hover:bg-white/[0.04]')}
            title="Recommended Tracks"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Related</span>
          </button>

          <button
            onClick={() => onTabChange('devices')}
            className={'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] ' + (activeTab === 'devices' ? 'bg-[#DFFF00] text-black shadow-sm' : 'text-white/65 hover:text-white hover:bg-white/[0.04]')}
            title="Audio Output Devices"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Devices</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00]"
          aria-label="Close context panel"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Scrollable Tab Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4">
        {/* TAB: LYRICS */}
        {activeTab === 'lyrics' && (
          <div onScroll={handleUserScroll} className="space-y-3">
            <div className="px-1 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#DFFF00]/90 block">
                SYNCHRONIZED LYRICS
              </span>
              <p className="text-xs text-white/50 truncate">
                {track?.title} • {getArtistName(track?.artists || track?.artist)}
              </p>
            </div>

            {lyricsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 text-white/50 text-center">
                <Mic2 className="w-7 h-7 text-[#DFFF00] animate-pulse" />
                <p className="text-xs font-semibold">Loading synchronized lyrics...</p>
              </div>
            ) : lyrics && lyrics.length > 0 ? (
              lyrics.map((line, idx) => {
                const isActive = idx === activeIdx;
                const isPast = idx < activeIdx;

                return (
                  <div
                    key={line.time + '_' + idx}
                    ref={(el) => {
                      lineRefs.current[idx] = el;
                    }}
                    onClick={() => onSeek && onSeek(line.time)}
                    className={'py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ' + (isActive ? 'text-[#DFFF00] text-base sm:text-lg font-extrabold bg-[#DFFF00]/10 border-l-3 border-[#DFFF00] shadow-sm' : isPast ? 'text-white/50 font-medium text-sm hover:text-white/75' : 'text-white/35 font-medium text-sm hover:text-white/70')}
                  >
                    <p className="leading-relaxed select-text">{line.text}</p>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-2 text-white/50">
                <Mic2 className="h-8 w-8 text-white/20 mb-1" />
                <p className="text-sm font-semibold text-white/80">Lyrics aren&apos;t available for this track.</p>
                <p className="text-xs text-white/40">Enjoy the high-fidelity sound stream.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 bg-white/[0.05] p-1 rounded-xl border border-white/8">
                <button
                  onClick={() => setQueueSubTab('queue')}
                  className={'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ' + (queueSubTab === 'queue' ? 'bg-[#DFFF00] text-black' : 'text-white/60 hover:text-white')}
                >
                  <Music className="w-3 h-3" /> Up Next ({queue.length})
                </button>
                <button
                  onClick={() => setQueueSubTab('history')}
                  className={'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ' + (queueSubTab === 'history' ? 'bg-[#DFFF00] text-black' : 'text-white/60 hover:text-white')}
                >
                  <History className="w-3 h-3" /> History ({history.length})
                </button>
              </div>

              {queue.length > 0 && queueSubTab === 'queue' && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-all cursor-pointer"
                  title="Clear Queue"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {currentTrack && queueSubTab === 'queue' && (
              <div className="p-3 rounded-2xl bg-[#DFFF00]/10 border border-[#DFFF00]/30 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Artwork
                    source={resolveArtwork(currentTrack)}
                    size="small"
                    alt={currentTrack.title}
                    canonicalId={currentTrack.id}
                    type="track"
                    className="h-10 w-10 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#DFFF00] block">Now Playing</span>
                    <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                    <p className="text-[11px] text-white/60 truncate">
                      {getArtistName(currentTrack.artists || currentTrack.artist)}
                    </p>
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#DFFF00] animate-ping shrink-0" />
              </div>
            )}

            {queueSubTab === 'queue' && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block px-1">
                  Next In Line ({nextUpTracks.length})
                </span>

                {nextUpTracks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-white/50 border border-white/5 rounded-2xl bg-white/[0.02]">
                    Queue is empty. Select songs to add to your queue.
                  </div>
                ) : (
                  nextUpTracks.map((trk, idx) => (
                    <div
                      key={trk.id + '_' + idx}
                      onClick={() => playTrack(trk, queue)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.08] cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Artwork
                          source={resolveArtwork(trk)}
                          size="small"
                          canonicalId={trk.id}
                          type="track"
                          className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-white group-hover:text-[#DFFF00] truncate transition-colors">
                            {trk.title}
                          </h4>
                          <p className="text-[10px] text-white/50 truncate">
                            {getArtistName(trk.artists || trk.artist)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(trk.id);
                        }}
                        className="p-1 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {queueSubTab === 'history' && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block px-1">
                  Played Earlier ({history.length})
                </span>

                {history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-white/50 border border-white/5 rounded-2xl bg-white/[0.02]">
                    No tracks played earlier in this session.
                  </div>
                ) : (
                  history.map((trk, idx) => (
                    <div
                      key={trk.id + '_' + idx}
                      onClick={() => playTrack(trk)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.08] cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Artwork
                          source={resolveArtwork(trk)}
                          size="small"
                          canonicalId={trk.id}
                          type="track"
                          className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-white group-hover:text-[#DFFF00] truncate transition-colors">
                            {trk.title}
                          </h4>
                          <p className="text-[10px] text-white/50 truncate">
                            {getArtistName(trk.artists || trk.artist)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: RECOMMENDATIONS */}
        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            <div className="px-1 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#DFFF00]/90 block">
                RELATED DISCOVERY
              </span>
              <p className="text-xs text-white/50">Inspired by current playback context</p>
            </div>

            <div className="space-y-1.5">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.08] transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Artwork
                      source={rec.artworkUrl}
                      size="small"
                      type="track"
                      className="h-9 w-9 rounded-lg object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-white group-hover:text-[#DFFF00] truncate transition-colors">
                        {rec.title}
                      </h4>
                      <p className="text-[10px] text-white/50 truncate">
                        {rec.artist} • {rec.album}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        addToQueue(rec as any);
                        showToast('Added "' + rec.title + '" to queue');
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                      title="Add to queue"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => playTrack(rec as any)}
                      className="p-1.5 rounded-lg bg-[#DFFF00] text-black hover:bg-[#c9e600] transition-all cursor-pointer"
                      title="Play now"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: DEVICES */}
        {activeTab === 'devices' && (
          <div className="space-y-4">
            <div className="px-1 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#DFFF00]/90 block">
                AUDIO OUTPUT ROUTING
              </span>
              <p className="text-xs text-white/50">System-detected sound devices</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#DFFF00]/10 border border-[#DFFF00]/30 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-[#DFFF00] text-black shrink-0">
                  <CurrentIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {currentDevice.name || 'System Default Device'}
                  </div>
                  <div className="text-[10px] text-[#DFFF00] font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DFFF00] animate-pulse" />
                    {currentDevice.displayType || 'Active Route'}
                  </div>
                </div>
              </div>
              <Check className="w-4 h-4 text-[#DFFF00] shrink-0" />
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block px-1">
                AVAILABLE ROUTES ({availableDevices.length})
              </span>

              {devicesLoading ? (
                <div className="py-6 text-center text-xs text-white/50 animate-pulse">
                  Querying system audio outputs...
                </div>
              ) : (
                availableDevices.map((dev) => {
                  const DevIcon = getDeviceIcon(dev.type);
                  const isSelected = dev.id === currentDevice.id;

                  return (
                    <div
                      key={dev.id}
                      onClick={() => {
                        realDeviceManager.selectAudioOutput(dev.id);
                        setCurrentDevice(dev);
                      }}
                      className={'p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ' + (isSelected ? 'bg-white/[0.08] border-[#DFFF00]/40 text-white' : 'bg-white/[0.03] border-white/5 hover:border-white/15 text-white/70 hover:text-white')}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <DevIcon className={'w-4 h-4 shrink-0 ' + (isSelected ? 'text-[#DFFF00]' : 'text-white/60')} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">{dev.name}</div>
                          <div className="text-[10px] text-white/40">{dev.displayType || 'Hardware Route'}</div>
                        </div>
                      </div>

                      {isSelected && <span className="w-2 h-2 rounded-full bg-[#DFFF00] shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2.5 text-[11px] text-white/50">
              <ShieldCheck className="w-4 h-4 text-[#DFFF00] shrink-0" />
              <span>Real OS hardware pipeline detection</span>
            </div>
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#11141A] border border-white/12 rounded-2xl p-4 w-full max-w-xs space-y-3 text-center shadow-2xl">
            <h3 className="text-xs font-bold text-white">Clear Playback Queue?</h3>
            <p className="text-[11px] text-white/60">This will remove upcoming songs from your active session.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/15 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearQueue();
                  setShowClearConfirm(false);
                  showToast('Queue cleared');
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-all shadow-md"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
